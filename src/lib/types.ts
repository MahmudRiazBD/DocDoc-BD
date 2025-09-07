export interface AppFile {
  id: string;
  serial_no: number;
  created_at: string;

  // Client Information
  client_id: string;
  client_name: string;

  // New field from PDF
  application_no?: string | null;

  // Core Applicant Information
  applicant_name_bn?: string | null; // Bengali Name
  applicant_name_en?: string | null; // English Name
  dob: string; // YYYY-MM-DD or YYYY

  // Control flags
  has_certificate: boolean;
  has_electricity_bill: boolean;

  // Certificate-related fields
  institution_id?: string | null;
  institutions?: { name: string } | null; // For joined data
  father_name_bn?: string | null; // Bengali
  father_name_en?: string | null; // English
  mother_name_bn?: string | null; // Bengali
  class?: string | null;
  roll?: number | null;
  certificate_date?: string | null; // YYYY-MM-DD
  session_year?: string | null;
  certificate_status?: 'প্রিন্ট হয়েছে' | 'প্রিন্ট হয়নি';

  // Electricity Bill-related fields
  bill_template_id?: string | null;
  bill_templates?: { name: string, logo_url: string } | null; // For joined data
  bill_holder_name?: string | null;
  bill_customer_no?: string | null;
  bill_sanc_load?: string | null;
  bill_book_no?: string | null;
  bill_type?: string | null;
  bill_tariff?: string | null;
  bill_account_no?: string | null;
  bill_meter_no?: string | null;
  bill_s_and_d?: string | null;
  bill_address?: {
    dagNo?: string;
    area?: string;
    division?: string;
    address?: string;
  } | null;
  bill_recharge_history?: RechargeEntry[] | null;
  bill_status?: 'প্রিন্ট হয়েছে' | 'প্রিন্ট হয়নি';
}


export interface Client {
    id: string;
    name: string;
    createdAt: string;
    serial_no: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'super-admin' | 'admin' | 'staff';
  createdAt: string; 
  avatarUrl?: string;
}

export interface Institution {
  id: string;
  serial_no: number;
  name: string;
  eiin: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  createdAt: string;
  logoUrl: string;
  signatureUrl1: string;
  signatureUrl2?: string;
  collegeCode?: string;
  schoolCode?: string;
  certificateText: string;
}

export interface RechargeEntry {
    orderNo: string;
    date: string; // "yyyy-MM-dd"
    totalAmount: number; // For DESCO
    energyAmount: number; // For DESCO
    vat: number;
    rebate: number;
    demandCharge: number;
    meterRent: number;
    rechargeBy?: string; // For DPDC
    serviceCharge?: number; // For DPDC
    arearAmt?: number; // For DPDC
    otherCharge?: number; // For DPDC
}

export interface BillTemplate {
    id: string;
    name: string;
    logoUrl?: string;
    createdAt: string;
    isActive: boolean;
}

export interface BillAddress {
    id: string;
    serial_no: number;
    dagNo?: string;
    area?: string;
    division?: string;
    address?: string;
    templateId: string;
    templateName?: string;
    createdAt: string;
}

export interface ChartDataPoint {
    label: string;
    [key: string]: string | number;
}

export interface DashboardStatsData {
    totalFiles: number;
    totalCertificates: number;
    totalBills: number;
    chartData: ChartDataPoint[];
    chartKeys: {
        files: string;
        certificates: string;
        bills: string;
    };
}


export type FilterType = 'lifetime' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom' | 'specific_date' | 'specific_month';
