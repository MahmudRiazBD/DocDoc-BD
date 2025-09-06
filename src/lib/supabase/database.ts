



// A file for interacting with the Supabase database
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { AppFile, User, Institution, Client, BillAddress, BillTemplate, RechargeEntry, DashboardStatsData, ChartDataPoint } from '../types';
import { differenceInDays, getWeekOfMonth, parse, startOfYear, endOfYear, add, startOfDay, endOfDay, startOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { formatInTimeZone, toDate } from 'date-fns-tz';
import { bn } from 'date-fns/locale';

const PAGE_SIZE = 10;

// Generic function for handling Supabase errors
function handleError(error: any, context: string) {
    console.error(`Supabase error in ${context}:`, error);
    throw new Error(`Database operation failed: ${context}.`);
}


// Files API
export async function addFile(file: Partial<AppFile>): Promise<AppFile> {
  const supabaseAdmin = createClient();
  const insertData = {
    application_no: file.application_no || null,
    applicant_name_bn: file.applicantNameBn || null,
    applicant_name_en: file.applicantNameEn || null,
    dob: file.dob,
    client_id: file.clientId,
    client_name: file.clientName,
    has_certificate: file.hasCertificate,
    has_electricity_bill: file.hasElectricityBill,
    created_at: new Date().toISOString(),

    // Certificate fields
    institution_id: file.institutionId,
    father_name_bn: file.fatherNameBn || null,
    father_name_en: file.fatherNameEn || null,
    mother_name_bn: file.motherNameBn || null,
    class: file.class,
    roll: file.roll,
    certificate_date: file.certificateDate,
    session_year: file.sessionYear,
    certificate_status: file.certificate_status,

    // Bill fields
    bill_template_id: file.bill_template_id,
    bill_holder_name: file.bill_holder_name,
    bill_customer_no: file.bill_customer_no,
    bill_sanc_load: file.bill_sanc_load,
    bill_book_no: file.bill_book_no,
    bill_type: file.bill_type,
    bill_tariff: file.bill_tariff,
    bill_account_no: file.bill_account_no,
    bill_meter_no: file.bill_meter_no,
    bill_s_and_d: file.bill_s_and_d,
    bill_address: file.bill_address,
    bill_recharge_history: file.bill_recharge_history,
    bill_status: file.bill_status,
  };

  const { data, error } = await supabaseAdmin
    .from('files')
    .insert([insertData])
    .select()
    .single();

  if (error) handleError(error, 'addFile');
  revalidatePath('/files');
  revalidatePath('/clients');
  
  const result: AppFile = {
      id: data.id,
      serial_no: data.serial_no,
      application_no: data.application_no,
      applicantNameBn: data.applicant_name_bn,
      applicantNameEn: data.applicant_name_en,
      dob: data.dob,
      clientId: data.client_id,
      clientName: data.client_name,
      hasCertificate: data.has_certificate,
      hasElectricityBill: data.has_electricity_bill,
      createdAt: data.created_at,
  };
  return result;
}

const mapFileDataToAppFile = (file: any): AppFile => ({
    id: file.id,
    serial_no: file.serial_no,
    createdAt: file.created_at,
    clientId: file.client_id,
    clientName: file.client_name,
    application_no: file.application_no,
    applicantNameBn: file.applicant_name_bn,
    applicantNameEn: file.applicant_name_en,
    dob: file.dob,
    hasCertificate: file.has_certificate,
    hasElectricityBill: file.has_electricity_bill,
    
    // Certificate fields
    institutionId: file.institution_id,
    institutionName: file.institutions?.name,
    fatherNameBn: file.father_name_bn,
    fatherNameEn: file.father_name_en,
    motherNameBn: file.mother_name_bn,
    class: file.class,
    roll: file.roll,
    certificateDate: file.certificate_date,
    sessionYear: file.session_year,
    certificate_status: file.certificate_status,

    // Bill fields
    bill_template_id: file.bill_template_id,
    bill_template_name: file.bill_templates?.name,
    bill_template_logo_url: file.bill_templates?.logo_url,
    bill_holder_name: file.bill_holder_name,
    bill_customer_no: file.bill_customer_no,
    bill_sanc_load: file.bill_sanc_load,
    bill_book_no: file.bill_book_no,
    bill_type: file.bill_type,
    bill_tariff: file.bill_tariff,
    bill_account_no: file.bill_account_no,
    bill_meter_no: file.bill_meter_no,
    bill_s_and_d: file.bill_s_and_d,
    bill_address: file.bill_address,
    bill_recharge_history: file.bill_recharge_history,
    bill_status: file.bill_status,
});

const applyTimeFilters = (query: any, options: { filter?: string, date?: string, from?: string, to?: string, month?: string, year?: string }) => {
    const { filter, date, from, to, month, year } = options;
    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    
    switch (filter) {
        case 'daily':
            startDate = startOfDay(now);
            endDate = endOfDay(now);
            break;
        case 'weekly':
            startDate = startOfWeek(now);
            endDate = endOfWeek(now);
            break;
        case 'monthly':
            startDate = startOfMonth(now);
            endDate = endOfMonth(now);
            break;
        case 'yearly':
            const y = year ? parseInt(year, 10) : now.getFullYear();
            startDate = startOfYear(new Date(y, 0, 1));
            endDate = endOfYear(new Date(y, 11, 31));
            break;
        case 'specific_date':
            if (date) {
                const d = parse(date, 'yyyy-MM-dd', new Date());
                startDate = startOfDay(d);
                endDate = endOfDay(d);
            }
            break;
        case 'specific_month':
             if(month) {
                const m = parse(month, 'yyyy-MM', new Date());
                startDate = startOfMonth(m);
                endDate = endOfMonth(m);
            }
            break;
        case 'custom':
            if (from) startDate = startOfDay(parse(from, 'yyyy-MM-dd', new Date()));
            if (to) endDate = endOfDay(parse(to, 'yyyy-MM-dd', new Date()));
            break;
    }

    if (startDate) query = query.gte('created_at', startDate.toISOString());
    if (endDate) query = query.lte('created_at', endDate.toISOString());

    return query;
}

export async function getFiles(options: { 
    page?: number; 
    paginate?: boolean;
    filter?: string;
    clientId?: string;
    date?: string;
    from?: string;
    to?: string;
    month?: string;
    year?: string;
} = {}): Promise<AppFile[]> {
    const { page = 1, paginate = true, clientId, ...timeFilterOptions } = options;
    const supabaseAdmin = createClient();
    
    let query = supabaseAdmin
        .from('files')
        .select(`
            *,
            institutions ( name ),
            bill_templates ( name, logo_url )
        `)
        .order('serial_no', { ascending: false });

    query = applyTimeFilters(query, timeFilterOptions);
    
    if (clientId) {
        query = query.eq('client_id', clientId);
    }
    
    if (paginate) {
        const startIndex = (page - 1) * PAGE_SIZE;
        const endIndex = startIndex + PAGE_SIZE - 1;
        query = query.range(startIndex, endIndex);
    }

    const { data, error } = await query;
    if (error) handleError(error, 'getFiles');

    return data?.map(mapFileDataToAppFile) || [];
}

export async function getFilesCount(options: { 
    filter?: string;
    clientId?: string;
    date?: string;
    from?: string;
    to?: string;
    month?: string;
    year?: string;
} = {}): Promise<number> {
     const { clientId, ...timeFilterOptions } = options;
    const supabaseAdmin = createClient();
    
    let query = supabaseAdmin
        .from('files')
        .select('id', { count: 'exact', head: true });

    query = applyTimeFilters(query, timeFilterOptions);

    if (clientId) {
        query = query.eq('client_id', clientId);
    }

    const { count, error } = await query;
    if (error) handleError(error, 'getFilesCount');

    return count || 0;
}


export async function getFilesByIds(ids: string[]): Promise<AppFile[]> {
    const supabaseAdmin = createClient();
    const { data, error } = await supabaseAdmin
        .from('files')
        .select('*, institutions(name), bill_templates(name, logo_url)')
        .in('id', ids);

    if (error) handleError(error, 'getFilesByIds');

    return data?.map(mapFileDataToAppFile) || [];
}

export async function getFileById(id: string): Promise<AppFile | null> {
    const supabaseAdmin = createClient();
    const { data, error } = await supabaseAdmin
      .from('files')
      .select('*, institutions(name), bill_templates(name, logo_url)')
      .eq('id', id)
      .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        handleError(error, `getFileById(${id})`);
    }
     if (!data) return null;

    return mapFileDataToAppFile(data);
}

export async function updateFile(id: string, file: Partial<AppFile>): Promise<void> {
    const supabaseAdmin = createClient();
    const updateData: { [key: string]: any } = {};

    // Core file info
    if (file.application_no !== undefined) updateData.application_no = file.application_no;
    if (file.applicantNameBn !== undefined) updateData.applicant_name_bn = file.applicantNameBn;
    if (file.applicantNameEn !== undefined) updateData.applicant_name_en = file.applicantNameEn;
    if (file.clientId !== undefined) updateData.client_id = file.clientId;
    if (file.clientName !== undefined) updateData.client_name = file.clientName;
    if (file.dob !== undefined) updateData.dob = file.dob;
    
    // Certificate fields
    if (file.institutionId !== undefined) updateData.institution_id = file.institutionId;
    if (file.fatherNameBn !== undefined) updateData.father_name_bn = file.fatherNameBn;
    if (file.fatherNameEn !== undefined) updateData.father_name_en = file.fatherNameEn;
    if (file.motherNameBn !== undefined) updateData.mother_name_bn = file.motherNameBn;
    if (file.class !== undefined) updateData.class = file.class;
    if (file.roll !== undefined) updateData.roll = file.roll;
    if (file.certificateDate !== undefined) updateData.certificate_date = file.certificateDate;
    if (file.sessionYear !== undefined) updateData.session_year = file.sessionYear;
    
    // Bill fields
    if (file.bill_template_id !== undefined) updateData.bill_template_id = file.bill_template_id;
    if (file.bill_address !== undefined) updateData.bill_address = file.bill_address;

    if (Object.keys(updateData).length > 0) {
        const { error } = await supabaseAdmin.from('files').update(updateData).eq('id', id);
        if (error) handleError(error, 'updateFile');
        revalidatePath('/files');
        revalidatePath(`/certificates/edit/${id}`);
    }
}

export async function deleteFile(id: string): Promise<void> {
    const supabaseAdmin = createClient();
    const { error } = await supabaseAdmin.from('files').delete().eq('id', id);
    if (error) handleError(error, 'deleteFile');
    revalidatePath('/files');
    revalidatePath('/clients');
}

export async function deleteFiles(ids: string[]): Promise<void> {
    const supabaseAdmin = createClient();
    const { error } = await supabaseAdmin.from('files').delete().in('id', ids);
    if (error) handleError(error, 'deleteFiles');
    revalidatePath('/files');
    revalidatePath('/clients');
}


// Users API (Interacting with public.users table, not auth.users)
export async function getUsers(): Promise<User[]> {
    const supabaseAdmin = createClient();
    const { data, error } = await supabaseAdmin.from('users').select('*').order('created_at', { ascending: false });
    if (error) handleError(error, 'getUsers');
    return data?.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.created_at,
        avatarUrl: user.avatar_url,
    })) || [];
}

export async function updateUserRole(id: string, role: 'super-admin' | 'admin' | 'staff'): Promise<void> {
    const supabaseAdmin = createClient();
    const { error } = await supabaseAdmin.from('users').update({ role }).eq('id', id);
    if (error) handleError(error, 'updateUserRole');
    revalidatePath('/users');
}

export async function deleteUser(id: string): Promise<void> {
    const supabaseAdmin = createClient();
    const { error } = await supabaseAdmin.from('users').delete().eq('id', id);
    if (error) handleError(error, 'deleteUser from DB');
    revalidatePath('/users');
}

// Institutions API
export async function getInstitutions(): Promise<Institution[]> {
  const supabaseAdmin = createClient();
  const { data, error } = await supabaseAdmin.from('institutions').select('*').order('serial_no', { ascending: false });
  if (error) handleError(error, 'getInstitutions');

  return data?.map(inst => ({
      id: inst.id,
      serial_no: inst.serial_no,
      name: inst.name,
      eiin: inst.eiin,
      address: inst.address,
      phone: inst.phone,
      email: inst.email,
      website: inst.website,
      createdAt: inst.created_at,
      logoUrl: inst.logo_url,
      signatureUrl1: inst.signature_url_1,
      signatureUrl2: inst.signature_url_2,
      collegeCode: inst.college_code,
      schoolCode: inst.school_code,
      certificateText: inst.certificate_text,
  })) || [];
}

export async function getInstitution(id: string): Promise<Institution | null> {
    const supabaseAdmin = createClient();
    const { data, error } = await supabaseAdmin.from('institutions').select('*').eq('id', id).single();
    if (error && error.code !== 'PGRST116') handleError(error, `getInstitution(${id})`);
    if (!data) return null;

    return {
        id: data.id,
        serial_no: data.serial_no,
        name: data.name,
        eiin: data.eiin,
        address: data.address,
        phone: data.phone,
        email: data.email,
        website: data.website,
        createdAt: data.created_at,
        logoUrl: data.logo_url,
        signatureUrl1: data.signature_url_1,
        signatureUrl2: data.signature_url_2,
        collegeCode: data.college_code,
        schoolCode: data.school_code,
        certificateText: data.certificate_text,
    };
}

export async function addInstitution(institution: Omit<Institution, 'id' | 'createdAt' | 'serial_no'>): Promise<Institution> {
    const supabaseAdmin = createClient();
    const insertData = {
        name: institution.name,
        eiin: institution.eiin,
        address: institution.address,
        phone: institution.phone,
        email: institution.email,
        website: institution.website,
        logo_url: institution.logoUrl,
        signature_url_1: institution.signatureUrl1,
        signature_url_2: institution.signatureUrl2,
        college_code: institution.collegeCode,
        school_code: institution.schoolCode,
        certificate_text: institution.certificateText,
        created_at: new Date().toISOString(),
    };
    
    const { data, error } = await supabaseAdmin.from('institutions').insert([insertData]).select().single();
    if (error) handleError(error, 'addInstitution');
    revalidatePath('/institutions');

    return {
        id: data.id,
        serial_no: data.serial_no,
        name: data.name,
        eiin: data.eiin,
        address: data.address,
        phone: data.phone,
        email: data.email,
        website: data.website,
        createdAt: data.created_at,
        logoUrl: data.logo_url,
        signatureUrl1: data.signature_url_1,
        signatureUrl2: data.signature_url_2,
        collegeCode: data.college_code,
        schoolCode: data.school_code,
        certificateText: data.certificate_text,
    };
}

export async function updateInstitution(id: string, institution: Partial<Omit<Institution, 'id' | 'createdAt' | 'serial_no'>>): Promise<void> {
    const supabaseAdmin = createClient();
    const updateData: { [key: string]: any } = {};

    if (institution.name !== undefined) updateData.name = institution.name;
    if (institution.eiin !== undefined) updateData.eiin = institution.eiin;
    if (institution.address !== undefined) updateData.address = institution.address;
    if (institution.phone !== undefined) updateData.phone = institution.phone;
    if (institution.email !== undefined) updateData.email = institution.email;
    if (institution.website !== undefined) updateData.website = institution.website;
    if (institution.logoUrl !== undefined) updateData.logo_url = institution.logoUrl;
    if (institution.signatureUrl1 !== undefined) updateData.signature_url_1 = institution.signatureUrl1;
    if (institution.signatureUrl2 !== undefined) updateData.signature_url_2 = institution.signatureUrl2;
    if (institution.collegeCode !== undefined) updateData.college_code = institution.collegeCode;
    if (institution.schoolCode !== undefined) updateData.school_code = institution.schoolCode;
    if (institution.certificateText !== undefined) updateData.certificate_text = institution.certificateText;
    
    if (Object.keys(updateData).length > 0) {
        const { error } = await supabaseAdmin.from('institutions').update(updateData).eq('id', id);
        if (error) handleError(error, 'updateInstitution');
        revalidatePath('/institutions');
    }
}

export async function deleteInstitution(id: string): Promise<void> {
    const supabaseAdmin = createClient();
    const { error } = await supabaseAdmin.from('institutions').delete().eq('id', id);
    if (error) handleError(error, 'deleteInstitution');
    revalidatePath('/institutions');
}

// Clients API
export async function getClients(): Promise<Client[]> {
    const supabaseAdmin = createClient();
    const { data, error } = await supabaseAdmin.from('clients').select('*').order('name', { ascending: true });
    if (error) handleError(error, 'getClients');
    return data?.map(client => ({
        id: client.id,
        name: client.name,
        createdAt: client.created_at,
        serial_no: client.serial_no
    })) || [];
}

export async function getClientData() {
    const supabaseAdmin = createClient();
    const { data, error } = await supabaseAdmin.from('clients').select('*, files(count)');
    if (error) handleError(error, 'getClientData');
    return data?.map(c => ({ 
        id: c.id,
        name: c.name,
        createdAt: c.created_at,
        serial_no: c.serial_no,
        fileCount: c.files[0].count 
    })) || [];
}

export async function addClient(client: Omit<Client, 'id' | 'createdAt' | 'serial_no'>): Promise<Client> {
    const supabaseAdmin = createClient();
    const { data, error } = await supabaseAdmin.from('clients').insert([{ name: client.name, created_at: new Date().toISOString() }]).select().single();
    if (error) handleError(error, 'addClient');
    revalidatePath('/clients');
    revalidatePath('/files');
    return {
        id: data.id,
        name: data.name,
        createdAt: data.created_at,
        serial_no: data.serial_no,
    };
}

export async function updateClient(id: string, client: Partial<Omit<Client, 'id' | 'createdAt' | 'serial_no'>>): Promise<void> {
    const supabaseAdmin = createClient();
    const updateData = { name: client.name };
    const { error } = await supabaseAdmin.from('clients').update(updateData).eq('id', id);
    if (error) handleError(error, 'updateClient');
    revalidatePath('/clients');
    revalidatePath('/files');
}

export async function deleteClient(id: string): Promise<void> {
    const supabaseAdmin = createClient();
    const { count, error: countError } = await supabaseAdmin.from('files').select('*', { count: 'exact' }).eq('client_id', id);
    if (countError) handleError(countError, 'deleteClient (count check)');
    if (count && count > 0) {
        throw new Error(`এই ক্লায়েন্টের নামে ${count} টি ফাইল আছে। ক্লায়েন্ট ডিলিট করার আগে ফাইলগুলো ডিলিট করুন।`);
    }

    const { error } = await supabaseAdmin.from('clients').delete().eq('id', id);
    if (error) handleError(error, 'deleteClient');
    revalidatePath('/clients');
}

// Bill Address API
export async function getBillAddresses(): Promise<BillAddress[]> {
    const supabaseAdmin = createClient();
    const { data, error } = await supabaseAdmin
        .from('bill_addresses')
        .select('*, bill_templates ( name )')
        .order('serial_no', { ascending: true });
        
    if (error) handleError(error, 'getBillAddresses');

    return data?.map(addr => {
        const templateName = (addr.bill_templates as any)?.name;
        return { 
            id: addr.id,
            serial_no: addr.serial_no,
            dagNo: addr.dag_no,
            area: addr.area,
            division: addr.division,
            address: addr.address,
            templateId: addr.template_id,
            templateName: templateName,
            createdAt: addr.created_at,
        };
    }) || [];
}

export async function getBillAddressData() {
    return getBillAddresses();
}

export async function addBillAddress(address: Partial<Omit<BillAddress, 'id' | 'createdAt' | 'serial_no' | 'templateName'>>): Promise<BillAddress> {
    const supabaseAdmin = createClient();
    const insertData = {
        template_id: address.templateId,
        dag_no: address.dagNo,
        area: address.area,
        division: address.division,
        address: address.address,
        created_at: new Date().toISOString(),
    };
    const { data, error } = await supabaseAdmin.from('bill_addresses').insert([insertData]).select().single();
    if (error) handleError(error, 'addBillAddress');
    revalidatePath('/bill-addresses');
    
     return {
        id: data.id,
        serial_no: data.serial_no,
        dagNo: data.dag_no,
        area: data.area,
        division: data.division,
        address: data.address,
        templateId: data.template_id,
        createdAt: data.created_at,
    };
}

export async function updateBillAddress(id: string, address: Partial<Omit<BillAddress, 'id' | 'createdAt' | 'serial_no' | 'templateName'>>): Promise<void> {
    const supabaseAdmin = createClient();
    const updateData: { [key: string]: any } = {};

    if (address.templateId !== undefined) updateData.template_id = address.templateId;
    if (address.dagNo !== undefined) updateData.dag_no = address.dagNo;
    if (address.area !== undefined) updateData.area = address.area;
    if (address.division !== undefined) updateData.division = address.division;
    if (address.address !== undefined) updateData.address = address.address;

    if (Object.keys(updateData).length === 0) return;

    const { error } = await supabaseAdmin.from('bill_addresses').update(updateData).eq('id', id);
    if (error) handleError(error, 'updateBillAddress');
    revalidatePath('/bill-addresses');
}

export async function deleteBillAddress(id: string): Promise<void> {
    const supabaseAdmin = createClient();
    const { error } = await supabaseAdmin.from('bill_addresses').delete().eq('id', id);
    if (error) handleError(error, 'deleteBillAddress');
    revalidatePath('/bill-addresses');
}

// Bill Templates API
export async function getBillTemplates(): Promise<BillTemplate[]> {
    const supabaseAdmin = createClient();
    const { data, error } = await supabaseAdmin.from('bill_templates').select('*, is_active').order('name', { ascending: true });
    if (error) handleError(error, 'getBillTemplates (fetch)');
    if (!data || data.length === 0) {
        const { error: insertError } = await supabaseAdmin.from('bill_templates').insert([
            { id: 'desco', name: 'DESCO', is_active: true, logo_url: 'https://i.ibb.co/Gf894Tz/desco.png', created_at: new Date().toISOString() },
            { id: 'dpdc', name: 'DPDC', is_active: true, logo_url: 'https://i.ibb.co/yQd1b25/dpdc.png', created_at: new Date().toISOString() },
        ]);
        if (insertError) handleError(insertError, 'getBillTemplates (seed)');
        const { data: newData, error: newError } = await supabaseAdmin.from('bill_templates').select('*, is_active').order('name', { ascending: true });
        if (newError) handleError(newError, 'getBillTemplates (refetch)');
        return (newData?.map(t => ({id: t.id, name: t.name, logoUrl: t.logo_url, createdAt: t.created_at, isActive: t.is_active})) as BillTemplate[]) || [];
    }
    return (data?.map(t => ({id: t.id, name: t.name, logoUrl: t.logo_url, createdAt: t.created_at, isActive: t.is_active})) as BillTemplate[]) || [];
}

export async function updateBillTemplate(id: string, template: Partial<Omit<BillTemplate, 'id' | 'createdAt'>>): Promise<void> {
    const supabaseAdmin = createClient();
    const updateData: { [key: string]: any } = {};

    if (template.isActive !== undefined) updateData.is_active = template.isActive;
    if (template.logoUrl !== undefined) updateData.logo_url = template.logoUrl;
    if (template.name !== undefined) updateData.name = template.name;

    if (Object.keys(updateData).length === 0) return;

    const { error } = await supabaseAdmin.from('bill_templates').update(updateData).eq('id', id);
    if (error) handleError(error, 'updateBillTemplate');
    revalidatePath('/bill-templates');
    revalidatePath('/bill-addresses');
}


// Update Print Status
export async function updatePrintStatus(type: 'certificate' | 'bill', docIds: string[], status: 'প্রিন্ট হয়েছে' | 'প্রিন্ট হয়নি' = 'প্রিন্ট হয়েছে'): Promise<void> {
    const supabaseAdmin = createClient();
    if (docIds.length === 0) return;

    const statusColumn = type === 'certificate' ? 'certificate_status' : 'bill_status';
    const { error } = await supabaseAdmin.from('files').update({ [statusColumn]: status }).in('id', docIds);
    if (error) handleError(error, 'updatePrintStatus');
    revalidatePath('/files');
}

// Dashboard API
export async function getDashboardStats(
  startDate?: Date,
  endDate?: Date
): Promise<DashboardStatsData> {
  const supabase = createClient();

  try {
    let query = supabase.from('files').select('id, created_at, has_certificate, has_electricity_bill');

    const now = new Date();
    const finalStartDate = startDate || startOfYear(now);
    let finalEndDate = endDate || endOfYear(now);
    
    if (endDate && differenceInDays(endDate, now) === 0) {
        finalEndDate = add(endDate, { hours: 23, minutes: 59, seconds: 59 });
    }

    if (startDate && endDate) {
      query = query
        .gte('created_at', finalStartDate.toISOString())
        .lte('created_at', finalEndDate.toISOString());
    }

    const { data: filesData, error: filesError } = await query;
    if (filesError) throw filesError;
    
    const totalFiles = filesData?.length || 0;
    const totalCertificates = filesData?.filter(f => f.has_certificate).length || 0;
    const totalBills = filesData?.filter(f => f.has_electricity_bill).length || 0;


    // Determine grouping strategy for chart
    const daysDiff = differenceInDays(finalEndDate, finalStartDate);
    let chartData: ChartDataPoint[] = [];

    if (daysDiff <= 8) { // Daily view for a week or less
        const dailyMap = new Map<string, { files: number; certificates: number; bills: number }>();
        const loopEndDate = daysDiff <= 1 ? add(finalStartDate, {hours: 23}) : finalEndDate;
        let day = finalStartDate;

        while (day <= loopEndDate) {
            const label = formatInTimeZone(day, 'Asia/Dhaka', 'MMM d', { locale: bn });
            dailyMap.set(label, { files: 0, certificates: 0, bills: 0 });
            day = add(day, { days: 1 });
        }
        
        filesData?.forEach(d => {
            const label = formatInTimeZone(parse(d.created_at, "yyyy-MM-dd'T'HH:mm:ss.SSSSSSxxx", new Date()), 'Asia/Dhaka', 'MMM d', { locale: bn });
            const entry = dailyMap.get(label);
            if(entry) {
                entry.files++;
                if (d.has_certificate) entry.certificates++;
                if (d.has_electricity_bill) entry.bills++;
            }
        });
        chartData = Array.from(dailyMap, ([label, counts]) => ({ label, ...counts }));
    
    } else if (daysDiff <= 31) { // Weekly view for a month
      const weeklyMap = new Map<string, { files: number; certificates: number; bills: number }>();
      for (let i = 1; i <= 4; i++) {
        weeklyMap.set(`সপ্তাহ ${i}`, { files: 0, certificates: 0, bills: 0 });
      }

      filesData?.forEach(d => {
        const date = parse(d.created_at, "yyyy-MM-dd'T'HH:mm:ss.SSSSSSxxx", new Date());
        const weekOfMonth = getWeekOfMonth(date, { weekStartsOn: 1 });
        const key = `সপ্তাহ ${weekOfMonth}`;
        const entry = weeklyMap.get(key);
        if (entry) {
            entry.files++;
            if (d.has_certificate) entry.certificates++;
            if (d.has_electricity_bill) entry.bills++;
        }
      });
      chartData = Array.from(weeklyMap, ([label, counts]) => ({ label, ...counts }));

    } else { // Monthly view for longer periods
        const monthlyMap = new Map<string, { files: number; certificates: number; bills: number }>();
        let month = finalStartDate;
        while(month <= finalEndDate) {
            const label = formatInTimeZone(month, 'Asia/Dhaka', 'MMM', { locale: bn });
            monthlyMap.set(label, { files: 0, certificates: 0, bills: 0 });
            month = add(month, { months: 1 });
        }
        
        filesData?.forEach(d => {
            const label = formatInTimeZone(parse(d.created_at, "yyyy-MM-dd'T'HH:mm:ss.SSSSSSxxx", new Date()), 'Asia/Dhaka', 'MMM', { locale: bn });
            const entry = monthlyMap.get(label);
            if(entry) {
                entry.files++;
                if (d.has_certificate) entry.certificates++;
                if (d.has_electricity_bill) entry.bills++;
            }
        });
        chartData = Array.from(monthlyMap, ([label, counts]) => ({ label, ...counts }));
    }

    return {
      totalFiles,
      totalCertificates,
      totalBills,
      chartData,
      chartKeys: { files: 'files', certificates: 'certificates', bills: 'bills' }
    };

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return {
      totalFiles: 0,
      totalCertificates: 0,
      totalBills: 0,
      chartData: [],
      chartKeys: { files: 'files', certificates: 'certificates', bills: 'bills' }
    };
  }
}
