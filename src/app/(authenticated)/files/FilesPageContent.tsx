
'use client';

import React, { useState, useEffect, useTransition, useMemo } from 'react';
import { MoreHorizontal, FilePlus2, Edit, Eye, Loader2, Trash2, Check, ChevronsUpDown, Award, Bolt, Printer, ChevronDown, CalendarIcon, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { AppFile, Client, RechargeEntry, BillAddress, BillTemplate, Institution } from '@/lib/types';
import { isValid, differenceInYears, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO as dateFnsParseIso, parse, format } from 'date-fns';
import { toDate, formatInTimeZone } from 'date-fns-tz';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { addFile, updateFile, deleteFile, deleteFiles, updatePrintStatus } from '@/lib/supabase/database';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { generateCertificateData } from '@/ai/flows/certificate-data-tool';
import { faker } from '@faker-js/faker';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { DateRange } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSearchParams, useRouter } from 'next/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';

// Helper to convert English digits to Bengali
const toBengali = (str: string | number): string => {
    const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(str).replace(/[0-9]/g, (digit) => bengaliDigits[parseInt(digit)]);
};

// Helper to convert Bengali digits to English
const toEnglish = (str: string): string => {
    const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return str.replace(/[০-৯]/g, (digit) => String(bengaliDigits.indexOf(digit)));
};


const parseDateString = (dateString: string): Date | null => {
    if (!dateString) return null;

    const englishDateString = toEnglish(dateString.trim());
    
    // Regex to match dd/mm/yyyy, dd-mm-yyyy, or dd.mm.yyyy with flexible day/month digits
    const dateRegex = /^(?<day>\d{1,2})[\/\-.]+(?<month>\d{1,2})[\/\-.]+(?<year>\d{4})$/;
    const match = englishDateString.match(dateRegex);

    if (match?.groups) {
        const { day, month, year } = match.groups;
        // Use UTC to avoid timezone shifts when creating the Date object
        const isoString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00.000Z`;
        const parsedDate = dateFnsParseIso(isoString);
        if (isValid(parsedDate)) {
            return parsedDate;
        }
    }

    return null; // Return null if no format matches
};

const isEnglish = (str: string) => /^[a-zA-Z\s.-]+$/.test(str);
const isBengali = (str: string) => /^[\u0980-\u09FF\s.-]+$/.test(str);


const fileSchema = z.object({
  applicantName: z.string().min(1, 'আবেদনকারীর নাম আবশ্যক'),
  clientId: z.string({ required_error: 'ক্লায়েন্ট নির্বাচন করুন' }),
  dob: z.string().min(4, 'জন্ম তারিখ বা সাল আবশ্যক'),
  
  createCertificate: z.boolean().default(false),
  fatherName: z.string().optional(),
  motherName: z.string().optional(),

  createElectricityBill: z.boolean().default(false),
  fatherNameEnglish: z.string().optional(),
  applicantNameEnglish: z.string().optional(),

}).superRefine((data, ctx) => {
    let birthYear: number | null = null;
    const dob = data.dob;

    if (/^\d{4}$/.test(toEnglish(dob))) {
        birthYear = parseInt(toEnglish(dob), 10);
    } else {
        const parsedDate = parseDateString(dob);
        if (parsedDate && isValid(parsedDate)) {
            birthYear = parsedDate.getFullYear();
        }
    }
    
    if (!birthYear) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'সঠিক ফরম্যাটে তারিখ বা সাল দিন (DD/MM/YYYY বা YYYY)', path: ['dob'] });
    }

    if (data.createCertificate) {
        if (!isBengali(data.applicantName)) {
             ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'আবেদনকারীর নাম অবশ্যই বাংলায় লিখতে হবে।', path: ['applicantName'] });
        }
        if (!parseDateString(dob)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'প্রত্যয়নপত্রের জন্য সম্পূর্ণ জন্ম তারিখ আবশ্যক (DD/MM/YYYY)', path: ['dob'] });
        }
        if (!data.fatherName) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'পিতার নাম আবশ্যক', path: ['fatherName'] });
        } else if (!isBengali(data.fatherName)) {
             ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'পিতার নাম অবশ্যই বাংলায় লিখতে হবে।', path: ['fatherName'] });
        }
        if (!data.motherName) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'মাতার নাম আবশ্যক', path: ['motherName'] });
        } else if (!isBengali(data.motherName)) {
             ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'মাতার নাম অবশ্যই বাংলায় লিখতে হবে।', path: ['motherName'] });
        }
    }
    
    if (data.createElectricityBill && birthYear) {
        if (birthYear > 2000) {
            if (!data.fatherNameEnglish) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'পিতার ইংরেজি নাম আবশ্যক', path: ['fatherNameEnglish'] });
            }
        } else { // 2000 or earlier
            if (!isEnglish(data.applicantName) && !data.applicantNameEnglish) {
                 ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'আবেদনকারীর ইংরেজি নাম আবশ্যক', path: ['applicantNameEnglish'] });
            }
        }
    }
});


type FileSchema = z.infer<typeof fileSchema>;
type FilterType = 'lifetime' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom' | 'specific_date' | 'specific_month';

const generateRechargeHistory = (templateId: 'desco' | 'dpdc'): RechargeEntry[] => {
    const history: RechargeEntry[] = [];
    const numberOfEntries = faker.number.int({ min: 5, max: 20 });
    let currentDate = new Date();

    const rechargeByOptions = ['Islami Bank Bangladesh Ltd.', 'bKash', 'Mercantile Bank', 'Dutch-Bangla Bank'];

    for (let i = 0; i < numberOfEntries; i++) {
        const totalAmount = faker.helpers.rangeToNumber({ min: 4, max: 40 }) * 50; // 200 to 2000, in steps of 50
        const energyAmount = totalAmount * faker.number.float({ min: 0.65, max: 0.95 });
        const vat = energyAmount * 0.05;
        const rebate = (energyAmount + vat) * -0.005;
        
        let demandCharge = 0;
        if (templateId === 'desco') {
            demandCharge = faker.datatype.boolean(0.5) ? (faker.datatype.boolean(0.5) ? 168 : 84) : 0;
        } else {
            demandCharge = faker.helpers.arrayElement([0, 84, 168]);
        }
        
        const meterRent = templateId === 'desco' ? (faker.datatype.boolean(0.7) ? 40 : 0) : faker.helpers.arrayElement([0, 40]);
        
        history.push({
            orderNo: '0000000' + faker.string.numeric(10),
            date: formatInTimeZone(currentDate, 'Asia/Dhaka', 'yyyy-MM-dd'),
            totalAmount,
            energyAmount: parseFloat(energyAmount.toFixed(2)),
            vat: parseFloat(vat.toFixed(2)),
            rebate: parseFloat(rebate.toFixed(2)),
            demandCharge,
            meterRent,
            serviceCharge: 0,
            arearAmt: 0,
            otherCharge: 0,
            rechargeBy: faker.helpers.arrayElement(rechargeByOptions),
        });

        const daysToSubtract = Math.random() > 0.1
          ? faker.number.int({ min: 15, max: 45 }) 
          : faker.number.int({ min: 7, max: 14 }); 

        currentDate = new Date(currentDate.setDate(currentDate.getDate() - daysToSubtract));
    }
    return history;
};


export const FileForm = ({
  clients,
  institutions,
  billAddresses,
  billTemplates,
  onSuccess,
  onCancel,
}: {
  clients: Client[];
  institutions: Institution[];
  billAddresses: BillAddress[];
  billTemplates: BillTemplate[];
  onSuccess: () => void;
  onCancel: () => void;
}) => {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const form = useForm<FileSchema>({
    resolver: zodResolver(fileSchema),
    defaultValues: {
          applicantName: '',
          clientId: undefined,
          dob: '',
          createCertificate: false,
          createElectricityBill: false,
          fatherName: '',
          motherName: '',
          fatherNameEnglish: '',
          applicantNameEnglish: '',
        },
  });

  const watchCreateCertificate = form.watch('createCertificate');
  const watchCreateElectricityBill = form.watch('createElectricityBill');
  const watchDob = form.watch('dob');
  const watchApplicantName = form.watch('applicantName');
  
  const getBirthYear = () => {
    if(!watchDob) return null;
    const englishDob = toEnglish(watchDob);
    if (/^\d{4}$/.test(englishDob)) {
        return parseInt(englishDob, 10);
    }
    const parsedDob = parseDateString(watchDob);
    if(parsedDob && isValid(parsedDob)) {
        return parsedDob.getFullYear();
    }
    return null;
  }
  const birthYear = getBirthYear();


  const onSubmit = (values: FileSchema) => {
    startTransition(async () => {
      try {
        const selectedClient = clients.find(c => c.id === values.clientId);
        if (!selectedClient) {
            toast({ variant: 'destructive', title: 'ত্রুটি', description: 'ক্লায়েন্ট খুঁজে পাওয়া যায়নি।' });
            return;
        }

        const dobString = values.dob;
        const dobForDb = parseDateString(dobString) 
            ? formatInTimeZone(parseDateString(dobString)!, 'Asia/Dhaka', 'yyyy-MM-dd')
            : dobString;

        const fileData: Partial<AppFile> = { 
            applicantName: values.applicantName,
            clientId: values.clientId,
            clientName: selectedClient.name,
            dob: dobForDb,
            hasCertificate: values.createCertificate,
            hasElectricityBill: values.createElectricityBill,
            createdAt: new Date().toISOString(),
        };
        
        let toastMessages = ['নতুন ফাইলটি তালিকায় যোগ করা হয়েছে।'];

        if(values.createCertificate) {
             const dobForCert = parseDateString(values.dob);
             if (!dobForCert) {
                 toast({ variant: 'destructive', title: 'ত্রুটি', description: 'প্রত্যয়নপত্রের জন্য সঠিক জন্ম তারিখ প্রয়োজন।' });
                 return;
             }
             if (!institutions || institutions.length === 0) {
                toast({ variant: 'destructive', title: 'কোনো প্রতিষ্ঠান পাওয়া যায়নি', description: 'প্রত্যয়নপত্র তৈরির আগে অনুগ্রহ করে কমপক্ষে একটি প্রতিষ্ঠান যোগ করুন।' });
                return;
            }
                const randomInstitution = institutions[Math.floor(Math.random() * institutions.length)];
                
                const age = differenceInYears(new Date(), dobForCert);
                const today = new Date();
                const academicData = await generateCertificateData({ age: age, date: today.toISOString() });
                
                fileData.fatherName = values.fatherName;
                fileData.motherName = values.motherName;
                fileData.institutionId = randomInstitution.id;
                fileData.class = academicData.class;
                fileData.roll = Number(academicData.roll);
                fileData.certificateDate = academicData.certificateDate;
                fileData.sessionYear = academicData.sessionYear;
                fileData.certificate_status = 'প্রিন্ট হয়নি';
                
                toastMessages.push('সংশ্লিষ্ট প্রত্যয়নপত্র সফলভাবে তৈরি করা হয়েছে।');
        }

        if(values.createElectricityBill && birthYear) {
            const activeTemplateIds = billTemplates.filter(t => t.isActive).map(t => t.id);
            const activeAddresses = billAddresses.filter(addr => activeTemplateIds.includes(addr.templateId));
            
            if (activeAddresses.length === 0) {
                  toast({ variant: 'destructive', title: 'কোনো সক্রিয় বিলের ঠিকানা পাওয়া যায়নি', description: 'বিদ্যুৎ বিল তৈরির আগে অনুগ্রহ করে কমপক্ষে একটি সক্রিয় টেমপ্লেটের সাথে ঠিকানা যোগ করুন।' });
                  return;
            } 
                let billHolderName = '';
                if(birthYear > 2000) {
                    billHolderName = values.fatherNameEnglish!;
                } else {
                    billHolderName = isEnglish(values.applicantName) ? values.applicantName : values.applicantNameEnglish!;
                }

                const randomAddress = activeAddresses[Math.floor(Math.random() * activeAddresses.length)];
                
                fileData.bill_holder_name = billHolderName.toUpperCase();
                fileData.bill_customer_no = faker.string.numeric(8);
                fileData.bill_sanc_load = faker.helpers.arrayElement(['1 KW', '2 KW', '3 KW']);
                fileData.bill_book_no = `${faker.helpers.arrayElement(['A','B','C','D','E','F'])}${faker.string.numeric(2)}`;
                fileData.bill_type = 'Pre-paid';
                fileData.bill_tariff = 'A (Residential)';
                fileData.bill_account_no = faker.string.numeric(11);
                fileData.bill_meter_no = faker.string.numeric(12);
                fileData.bill_s_and_d = randomAddress.division || 'Khilkhet';
                fileData.bill_address = { 
                    dagNo: randomAddress.dagNo, 
                    area: randomAddress.area,
                    division: randomAddress.division,
                    address: randomAddress.address,
                };
                fileData.bill_template_id = randomAddress.templateId;
                fileData.bill_recharge_history = generateRechargeHistory(randomAddress.templateId as 'desco' | 'dpdc');
                fileData.bill_status = 'প্রিন্ট হয়নি';

                toastMessages.push('সংশ্লিষ্ট বিদ্যুৎ বিল সফলভাবে তৈরি করা হয়েছে।');
        }
        
        await addFile(fileData);

        onSuccess();
        toast({
            title: 'সফলভাবে তৈরি হয়েছে',
            description: toastMessages.join(' '),
            className: 'bg-accent text-accent-foreground',
            duration: 7000,
        });
        
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'ত্রুটি', description: error.message || `ফাইল যোগ করতে সমস্যা হয়েছে।` });
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <ScrollArea className="h-[65vh] pr-6">
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="applicantName" render={({ field }) => (
                        <FormItem className="md:col-span-2">
                        <FormLabel>আবেদনকারীর নাম</FormLabel>
                        <FormControl><Input placeholder="সম্পূর্ণ নাম লিখুন" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="dob" render={({ field }) => (
                        <FormItem>
                            <FormLabel>জন্ম তারিখ বা সাল</FormLabel>
                            <FormControl><Input placeholder="DD/MM/YYYY বা YYYY" {...field} /></FormControl>
                            <FormDescription>বাংলা বা ইংরেজিতে ইনপুট দিন।</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="clientId" render={({ field }) => (
                        <FormItem className="flex flex-col pt-2">
                        <FormLabel>ক্লায়েন্টের নাম</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                    <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                                        {field.value ? clients.find((client) => client.id === field.value)?.name : "ক্লায়েন্ট নির্বাচন করুন"}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                    <Command>
                                        <CommandInput placeholder="ক্লায়েন্ট খুঁজুন..." />
                                        <CommandEmpty>কোনো ক্লায়েন্ট পাওয়া যায়নি।</CommandEmpty>
                                        <CommandList>
                                            <CommandGroup>
                                            {clients.map((client) => (
                                                <CommandItem value={client.name} key={client.id} onSelect={() => form.setValue("clientId", client.id)}>
                                                <Check className={cn("mr-2 h-4 w-4", client.id === field.value ? "opacity-100" : "opacity-0")} />
                                                {client.name}
                                                </CommandItem>
                                            ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        <FormMessage />
                        </FormItem>
                    )} />
                </div>
                
                <div className="space-y-4 pt-4 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="createCertificate" render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={!watchDob} /></FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel>প্রত্যয়নপত্র তৈরি করুন</FormLabel>
                                {!watchDob && <p className="text-xs text-muted-foreground">জন্ম তারিখ দিন।</p>}
                            </div>
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="createElectricityBill" render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={!watchDob}/></FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel>বিদ্যুৎ বিল তৈরি করুন</FormLabel>
                                {!watchDob && <p className="text-xs text-muted-foreground">জন্ম তারিখ দিন।</p>}
                            </div>
                            </FormItem>
                        )} />
                    </div>
                    
                    {(watchCreateCertificate || watchCreateElectricityBill) && (
                      <>
                        {watchCreateCertificate && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-md">
                                <h3 className="md:col-span-2 text-sm font-medium text-muted-foreground -mb-2">প্রত্যয়নপত্রের জন্য তথ্য</h3>
                                <FormField control={form.control} name="fatherName" render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>পিতার নাম (বাংলা)</FormLabel>
                                    <FormControl><Input placeholder="পিতার সম্পূর্ণ নাম" {...field} /></FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="motherName" render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>মাতার নাম (বাংলা)</FormLabel>
                                    <FormControl><Input placeholder="মাতার সম্পূর্ণ নাম" {...field} /></FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                        )}
                        {watchCreateElectricityBill && birthYear && (
                            <div className="p-4 border rounded-md">
                                <h3 className="text-sm font-medium text-muted-foreground mb-4">বিদ্যুৎ বিলের জন্য তথ্য</h3>
                                {birthYear > 2000 ? (
                                    <FormField control={form.control} name="fatherNameEnglish" render={({ field }) => (
                                        <FormItem><FormLabel>পিতার নাম (ইংরেজি)</FormLabel>
                                        <FormControl><Input placeholder="Father's Full Name" {...field} /></FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )} />
                                ) : (
                                    !isEnglish(watchApplicantName) && (
                                        <FormField control={form.control} name="applicantNameEnglish" render={({ field }) => (
                                            <FormItem><FormLabel>আবেদনকারীর নাম (ইংরেজি)</FormLabel>
                                            <FormControl><Input placeholder="Applicant's Full Name" {...field} /></FormControl>
                                            <FormMessage />
                                            </FormItem>
                                        )} />
                                    )
                                )}
                            </div>
                        )}
                      </>
                    )}
                </div>
            </div>
        </ScrollArea>
        <DialogFooter className="pt-4 border-t">
          <DialogClose asChild><Button type="button" variant="outline" onClick={onCancel}>বাতিল</Button></DialogClose>
          <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            ফাইল তৈরি করুন
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};


const editFileSchema = z.object({
  applicantName: z.string().min(1, 'আবেদনকারীর নাম আবশ্যক'),
  clientId: z.string({ required_error: 'ক্লায়েন্ট নির্বাচন করুন' }),
  dob: z.string().min(4, 'জন্ম তারিখ বা সাল আবশ্যক'),
  institutionId: z.string().optional(),
  billAddressId: z.string().optional(),
  billTemplateId: z.string().optional(),
});
type EditFileSchema = z.infer<typeof editFileSchema>;

const EditFileForm = ({
    file,
    clients,
    institutions,
    billAddresses,
    billTemplates,
    onSuccess,
    onCancel,
}: {
    file: AppFile;
    clients: Client[];
    institutions: Institution[];
    billAddresses: BillAddress[];
    billTemplates: BillTemplate[];
    onSuccess: () => void;
    onCancel: () => void;
}) => {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    
    // Find the bill address ID based on the bill's address details.
    const findBillAddressId = () => {
        if (!file.bill_address) return undefined;
        if (file.bill_template_id === 'dpdc') {
            return billAddresses.find(addr => addr.address === file.bill_address?.address)?.id;
        }
        return billAddresses.find(addr => 
            addr.dagNo === file.bill_address?.dagNo &&
            addr.area === file.bill_address?.area &&
            addr.division === file.bill_address?.division
        )?.id;
    }

    const form = useForm<EditFileSchema>({
        resolver: zodResolver(editFileSchema),
        defaultValues: {
            applicantName: file.applicantName,
            clientId: file.clientId,
            dob: file.dob,
            institutionId: file.institutionId ?? undefined,
            billAddressId: findBillAddressId(),
            billTemplateId: file.bill_template_id ?? undefined,
        },
    });

    const onSubmit = (values: EditFileSchema) => {
        startTransition(async () => {
            try {
                const fileUpdates: Partial<AppFile> = {};
                
                if(file.applicantName !== values.applicantName) fileUpdates.applicantName = values.applicantName;
                if(file.clientId !== values.clientId) {
                    const selectedClient = clients.find(c => c.id === values.clientId);
                    fileUpdates.clientId = values.clientId;
                    fileUpdates.clientName = selectedClient?.name;
                }
                if(file.dob !== values.dob) fileUpdates.dob = values.dob;

                // Certificate updates
                if (file.hasCertificate && values.institutionId && file.institutionId !== values.institutionId) {
                   fileUpdates.institutionId = values.institutionId;
                }
                
                // Bill updates
                const selectedAddress = billAddresses.find(addr => addr.id === values.billAddressId);
                const currentAddressId = findBillAddressId();

                if (file.hasElectricityBill && selectedAddress && selectedAddress.id !== currentAddressId) {
                    fileUpdates.bill_address = {
                        dagNo: selectedAddress.dagNo,
                        area: selectedAddress.area,
                        division: selectedAddress.division,
                        address: selectedAddress.address,
                    };
                    // If address changes, template must also change to match the address's template
                    if (file.bill_template_id !== selectedAddress.templateId) {
                        fileUpdates.bill_template_id = selectedAddress.templateId;
                    }
                } else if (file.hasElectricityBill && values.billTemplateId && file.bill_template_id !== values.billTemplateId) {
                    // This case handles when only the template is changed (e.g., to an active/inactive one of the same type)
                    // without changing the address itself.
                    fileUpdates.bill_template_id = values.billTemplateId;
                }
                
                if (Object.keys(fileUpdates).length > 0) {
                    await updateFile(file.id, fileUpdates);
                }
                
                toast({
                    title: 'সফলভাবে আপডেট হয়েছে',
                    description: 'ফাইলের তথ্য আপডেট করা হয়েছে।',
                    className: 'bg-accent text-accent-foreground',
                });
                onSuccess();

            } catch (error: any) {
                 toast({
                    variant: 'destructive',
                    title: 'ত্রুটি',
                    description: error.message || `ফাইল আপডেট করতে সমস্যা হয়েছে।`,
                });
            }
        });
    };

    return (
        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="applicantName" render={({ field }) => (
                <FormItem><FormLabel>আবেদনকারীর নাম</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="dob" render={({ field }) => (
                <FormItem><FormLabel>জন্ম তারিখ বা সাল</FormLabel>
                <FormControl><Input placeholder="DD/MM/YYYY বা YYYY" {...field} /></FormControl>
                <FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="clientId" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>ক্লায়েন্টের নাম</FormLabel>
                    <Popover><PopoverTrigger asChild><FormControl>
                    <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                        {field.value ? clients.find((c) => c.id === field.value)?.name : "ক্লায়েন্ট নির্বাচন করুন"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button></FormControl></PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command>
                            <CommandInput placeholder="ক্লায়েন্ট খুঁজুন..." /><CommandEmpty>কোনো ক্লায়েন্ট পাওয়া যায়নি।</CommandEmpty>
                            <CommandList><CommandGroup>
                                {clients.map((c) => (
                                    <CommandItem value={c.name} key={c.id} onSelect={() => form.setValue("clientId", c.id)}>
                                    <Check className={cn("mr-2 h-4 w-4", c.id === field.value ? "opacity-100" : "opacity-0")} />
                                    {c.name}</CommandItem>
                                ))}
                            </CommandGroup></CommandList>
                        </Command></PopoverContent>
                    </Popover>
                <FormMessage /></FormItem>
            )} />

            {file.hasCertificate && (
                 <FormField control={form.control} name="institutionId" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>প্রতিষ্ঠান</FormLabel>
                        <Popover><PopoverTrigger asChild><FormControl>
                        <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                            {field.value ? institutions.find((i) => i.id === field.value)?.name : "প্রতিষ্ঠান নির্বাচন করুন"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button></FormControl></PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command>
                                <CommandInput placeholder="প্রতিষ্ঠান খুঁজুন..." /><CommandEmpty>কোনো প্রতিষ্ঠান পাওয়া যায়নি।</CommandEmpty>
                                <CommandList><CommandGroup>
                                    {institutions.map((i) => (
                                        <CommandItem value={i.name} key={i.id} onSelect={() => form.setValue("institutionId", i.id)}>
                                        <Check className={cn("mr-2 h-4 w-4", i.id === field.value ? "opacity-100" : "opacity-0")} />
                                        {i.name}</CommandItem>
                                    ))}
                                </CommandGroup></CommandList>
                            </Command></PopoverContent>
                        </Popover>
                    <FormMessage /></FormItem>
                )} />
            )}

            {file.hasElectricityBill && (
                <>
                    <FormField control={form.control} name="billAddressId" render={({ field }) => (
                        <FormItem className="flex flex-col"><FormLabel>বিদ্যুৎ বিলের ঠিকানা</FormLabel>
                            <Popover><PopoverTrigger asChild><FormControl>
                            <Button variant="outline" role="combobox" className={cn("w-full justify-between text-left", !field.value && "text-muted-foreground")}>
                                {field.value ? (billAddresses.find((a) => a.id === field.value)?.address || `${billAddresses.find((a) => a.id === field.value)?.dagNo}, ${billAddresses.find((a) => a.id === field.value)?.area}`) : "বিলের ঠিকানা নির্বাচন করুন"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button></FormControl></PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command>
                                    <CommandInput placeholder="ঠিকানা খুঁজুন..." /><CommandEmpty>কোনো ঠিকানা পাওয়া যায়নি।</CommandEmpty>
                                    <CommandList><CommandGroup>
                                        {billAddresses.filter(a => billTemplates.find(t => t.id === a.templateId)?.isActive).map((a) => (
                                            <CommandItem value={a.address || a.area!} key={a.id} onSelect={() => form.setValue("billAddressId", a.id)}>
                                            <Check className={cn("mr-2 h-4 w-4", a.id === field.value ? "opacity-100" : "opacity-0")} />
                                            <span>{a.address ? `${a.address.substring(0, 30)}...` : `${a.dagNo}, ${a.area}`}</span>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup></CommandList>
                                </Command></PopoverContent>
                            </Popover>
                        <FormMessage /></FormItem>
                    )} />
                </>
            )}


            <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline" onClick={onCancel}>বাতিল</Button></DialogClose>
                <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    আপডেট করুন
                </Button>
            </DialogFooter>
        </form>
        </Form>
    );
};


export default function FilesPageContent({ 
  initialFiles,
  allFiles, 
  clients, 
  billAddresses, 
  billTemplates,
  institutions
}: { 
  initialFiles: AppFile[],
  allFiles: AppFile[],
  clients: Client[],
  billAddresses: BillAddress[],
  billTemplates: BillTemplate[],
  institutions: Institution[],
}) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const { toast } = useToast();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  
  const [filter, setFilter] = useState<FilterType>('daily');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [specificDate, setSpecificDate] = useState<Date | undefined>();
  const [specificMonth, setSpecificMonth] = useState<Date>(new Date());
  const [specificYear, setSpecificYear] = useState<number>(new Date().getFullYear());
  
  type DialogState = {
    mode: 'add' | 'view' | 'edit' | null;
    file: AppFile | null;
    loadingDetails?: boolean;
  };

  const [dialogState, setDialogState] = useState<DialogState>({ mode: null, file: null });

  useEffect(() => {
    if(searchParams.get('action') === 'add') {
      setDialogState({ mode: 'add', file: null });
      // Clean the URL without reloading the page
      router.replace('/files', {scroll: false});
    }
  }, [searchParams, router]);
  
  const displayedFiles = useMemo(() => {
    if (filter === 'daily') return initialFiles; // Use pre-filtered daily files
    if (filter === 'lifetime') return allFiles;
    
    let start, end;
    const now = new Date();

    switch (filter) {
        case 'weekly':
            start = startOfWeek(now);
            end = endOfWeek(now);
            break;
        case 'monthly':
            start = startOfMonth(now);
            end = endOfMonth(now);
            break;
        case 'yearly':
            start = startOfYear(new Date(specificYear, 0, 1));
            end = endOfYear(new Date(specificYear, 11, 31));
            break;
        case 'specific_date':
            if (!specificDate) return allFiles;
            start = startOfDay(specificDate);
            end = endOfDay(specificDate);
            break;
        case 'specific_month':
            start = startOfMonth(specificMonth);
            end = endOfMonth(specificMonth);
            break;
        case 'custom':
            if (!dateRange?.from || !dateRange?.to) return allFiles;
            start = startOfDay(dateRange.from);
            end = endOfDay(dateRange.to);
            break;
        default:
            return allFiles;
    }
    
    if(start && end) {
      return allFiles.filter(c => {
          const fileDate = dateFnsParseIso(c.createdAt);
          return fileDate >= start! && fileDate <= end!;
      });
    }

    return allFiles;

  }, [filter, dateRange, specificDate, specificMonth, specificYear, allFiles, initialFiles]);
  
  const handleViewDetails = (file: AppFile) => {
    const fullFile = allFiles.find(f => f.id === file.id);
    if(fullFile) {
        setDialogState({ mode: 'view', file: fullFile });
    }
  }

  const handleEditFile = async (file: AppFile) => {
    const fullFileWithDetails = allFiles.find(f => f.id === file.id);
    if(fullFileWithDetails) {
      setDialogState({ 
        mode: 'edit', 
        file: fullFileWithDetails
      });
    }
  }

  const handleStatusChange = async (file: AppFile, docType: 'certificate' | 'bill', newStatus: 'প্রিন্ট হয়েছে' | 'প্রিন্ট হয়নি') => {
      try {
        let docId: string | undefined;
        if (docType === 'certificate' && file.hasCertificate) {
            docId = file.id;
            await updatePrintStatus('certificate', [docId], newStatus);
        } else if (docType === 'bill' && file.hasElectricityBill) {
            docId = file.id;
            await updatePrintStatus('bill', [docId], newStatus);
        }
        toast({ title: 'স্ট্যাটাস আপডেট হয়েছে', className: 'bg-accent text-accent-foreground' });
        router.refresh();
      } catch (error) {
         toast({ variant: 'destructive', title: 'ত্রুটি', description: 'স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে।'});
      }
  }
  
  const handleBulkStatusChange = async (docType: 'certificate' | 'bill', newStatus: 'প্রিন্ট হয়েছে' | 'প্রিন্ট হয়নি') => {
    if (selectedRows.length === 0) {
      toast({ variant: 'destructive', title: 'কোনো ফাইল নির্বাচন করা হয়নি', description: 'অনুগ্রহ করে কমপক্ষে একটি ফাইল নির্বাচন করুন।'});
      return;
    }

    const docIdsToUpdate = allFiles
      .filter(f => selectedRows.includes(f.id) && (docType === 'certificate' ? f.hasCertificate : f.hasElectricityBill))
      .map(f => f.id)
      .filter((id): id is string => !!id);

    if (docIdsToUpdate.length === 0) {
      toast({ variant: 'destructive', title: `কোনো ${docType === 'certificate' ? 'প্রত্যয়নপত্র' : 'বিদ্যুৎ বিল'} পাওয়া যায়নি`, description: `নির্বাচিত ফাইলগুলোতে কোনো ${docType === 'certificate' ? 'প্রত্যয়নপত্র' : 'বিদ্যুৎ বিল'} নেই।`});
      return;
    }

    try {
      await updatePrintStatus(docType, docIdsToUpdate, newStatus);
      toast({
        title: 'স্ট্যাটাস আপডেট হয়েছে',
        description: `${docIdsToUpdate.length} টি ডকুমেন্টের স্ট্যাটাস "${newStatus}" করা হয়েছে।`,
        className: 'bg-accent text-accent-foreground',
      });
      setSelectedRows([]);
      router.refresh();
    } catch (error) {
      toast({ variant: 'destructive', title: 'ত্রুটি', description: 'স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে।'});
    }
  };


  const handleDialogClose = () => {
    setDialogState({ mode: null, file: null });
  };
  
  const handleSuccess = () => {
    handleDialogClose();
    router.refresh();
  };

  const handleDeleteFile = (id: string) => {
    startDeleteTransition(async () => {
        try {
            await deleteFile(id);
            toast({ title: 'সফলভাবে ডিলিট হয়েছে', description: 'ফাইলটি তালিকা থেকে মুছে ফেলা হয়েছে।', variant: 'destructive' });
            router.refresh();
        } catch (error) {
            toast({ variant: 'destructive', title: 'ত্রুটি', description: 'ফাইল ডিলিট করতে সমস্যা হয়েছে।'});
        }
    });
  }

  const handleBulkDelete = async () => {
    startDeleteTransition(async () => {
      try {
        await deleteFiles(selectedRows);
        toast({ variant: 'destructive', title: 'ফাইল ডিলিট হয়েছে', description: `${selectedRows.length} টি ফাইল ডিলিট করা হয়েছে।`});
        setSelectedRows([]);
        router.refresh();
      } catch (error) {
        toast({ variant: 'destructive', title: 'ত্রুটি', description: 'ডিলিট করতে সমস্যা হয়েছে।'});
      }
    });
  };

  const handleBulkPrint = (type: 'certificate' | 'bill') => {
    if (selectedRows.length === 0) {
     toast({ variant: 'destructive', title: 'কোনো ফাইল নির্বাচন করা হয়নি', description: 'প্রিন্ট করার জন্য অনুগ্রহ করে কমপক্ষে একটি ফাইল নির্বাচন করুন।'});
     return;
    }
    const filteredIds = allFiles.filter(f => selectedRows.includes(f.id) && (type === 'certificate' ? f.hasCertificate : f.hasElectricityBill)).map(f => f.id);
    
    if(filteredIds.length === 0){
        toast({ variant: 'destructive', title: 'প্রিন্টের জন্য উপযুক্ত ফাইল নেই', description: `নির্বাচিত ফাইলগুলোর মধ্যে কোনোটির ${type === 'certificate' ? 'প্রত্যয়নপত্র' : 'বিদ্যুৎ বিল'} নেই।`});
        return;
    }
    
    let url;
    if (type === 'certificate') {
        url = `/certificates/print/bulk?ids=${filteredIds.join(',')}`;
    } else {
        url = `/electricity-bills/print/bulk?ids=${filteredIds.join(',')}`;
    }
    window.open(url, '_blank');
  }

  const handlePrintFiltered = () => {
    const idsToPrint = displayedFiles.map(f => f.id);
    if (idsToPrint.length === 0) {
        toast({ variant: 'destructive', title: 'প্রিন্টের জন্য কোনো ফাইল নেই', description: 'বর্তমান ফিল্টার অনুযায়ী কোনো ফাইল পাওয়া যায়নি।'});
        return;
    }
    const url = `/files/print?ids=${idsToPrint.join(',')}`;
    window.open(url, '_blank');
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedRows(checked ? displayedFiles.map((f) => f.id) : []);
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    setSelectedRows(checked ? [...selectedRows, id] : selectedRows.filter((rowId) => rowId !== id));
  };
  const isAllSelected = displayedFiles.length > 0 && selectedRows.length === displayedFiles.length;

  const isDialogOpen = dialogState.mode !== null;
  const getDialogTitle = () => {
    switch (dialogState.mode) {
      case 'add': return 'নতুন ফাইল যোগ করুন';
      case 'view': return `ফাইলের বিস্তারিত (ক্রমিক নং: ${dialogState.file?.serial_no.toString().padStart(4, '0')})`;
      case 'edit': return `ফাইল এডিট করুন (ক্রমিক নং: ${dialogState.file?.serial_no.toString().padStart(4, '0')})`;
      default: return '';
    }
  }
  
  const formatDobForDisplay = (dob: string | undefined): string => {
    if (!dob) return 'N/A';
    // Match YYYY-MM-DD format from the database
    const isoDateRegex = /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/;
    const match = dob.match(isoDateRegex);
    if (match?.groups) {
        const { day, month, year } = match.groups;
        return toBengali(`${day}/${month}/${year}`);
    }
    // Fallback for YYYY or other formats
    return toBengali(dob);
  };
  
   const renderFilterInput = () => {
    switch (filter) {
        case 'specific_date':
            return (
                <Popover>
                    <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full md:w-[280px] justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {specificDate ? format(specificDate, 'dd/MM/yyyy') : <span>একটি তারিখ বাছাই করুন</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={specificDate} onSelect={setSpecificDate} initialFocus />
                    </PopoverContent>
                </Popover>
            );
        case 'custom':
            return (
                <Popover>
                    <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full md:w-[300px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (dateRange.to ? <>{format(dateRange.from, "dd/MM/yy")} - {format(dateRange.to, "dd/MM/yy")}</> : format(dateRange.from, "dd/MM/yyyy")) : <span>একটি তারিখ পরিসর বাছাই করুন</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2}/>
                    </PopoverContent>
                </Popover>
            );
        case 'specific_month':
             return (
                <Input
                    type="month"
                    value={format(specificMonth, 'yyyy-MM')}
                    onChange={(e) => setSpecificMonth(dateFnsParseIso(e.target.value))}
                    className="w-full md:w-[280px]"
                />
            );
        case 'yearly':
            return (
                <Select onValueChange={(value) => setSpecificYear(parseInt(value))} defaultValue={String(specificYear)}>
                    <SelectTrigger className="w-full md:w-[180px]">
                        <SelectValue placeholder="বছর নির্বাচন করুন" />
                    </SelectTrigger>
                    <SelectContent>
                        {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
                            <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            );
        default:
            return null;
    }
  }
  
  const renderDialogContent = () => {
    if (!dialogState.file && dialogState.mode !== 'add') return null;

    if (dialogState.loadingDetails) {
        return (
            <div className="flex justify-center items-center h-32">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    switch (dialogState.mode) {
        case 'view':
            if (!dialogState.file) return null;
            return (
                <div className='space-y-4 text-sm pt-4'>
                    <div>
                        <h3 className="font-semibold mb-2 text-base">ফাইলের তথ্য</h3>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            <p><strong>আবেদনকারীর নাম:</strong></p><p>{dialogState.file.applicantName}</p>
                            <p><strong>জন্ম তারিখ/সাল:</strong></p><p>{formatDobForDisplay(dialogState.file.dob)}</p>
                            <p><strong>ক্লায়েন্টের নাম:</strong></p><p>{dialogState.file.clientName}</p>
                            <div className="flex items-center"><strong>ডকুমেন্টস:</strong></div>
                            <div className='flex gap-2'>
                                {dialogState.file.hasCertificate ? <Badge variant="secondary">প্রত্যয়নপত্র</Badge> : <Badge variant="outline">প্রত্যয়নপত্র নেই</Badge>}
                                {dialogState.file.hasElectricityBill ? <Badge variant="secondary">বিদ্যুৎ বিল</Badge> : <Badge variant="outline">বিদ্যুৎ বিল নেই</Badge>}
                            </div>
                            <p><strong>তৈরির তারিখ:</strong></p><p>{dialogState.file.createdAt ? formatInTimeZone(dateFnsParseIso(dialogState.file.createdAt), 'Asia/Dhaka', 'PPpp') : ''}</p>
                        </div>
                    </div>

                    {dialogState.file.hasCertificate && (
                        <div><Separator className="my-4" />
                        <h3 className="font-semibold mb-2 text-base">প্রত্যয়নপত্রের তথ্য</h3>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            <p><strong>পিতার নাম:</strong></p><p>{dialogState.file.fatherName}</p>
                            <p><strong>মাতার নাম:</strong></p><p>{dialogState.file.motherName}</p>
                            <p><strong>প্রতিষ্ঠান:</strong></p><p>{dialogState.file.institutionName}</p>
                            <p><strong>ক্লাস:</strong></p><p>{dialogState.file.class}</p>
                            <p><strong>রোল:</strong></p><p>{dialogState.file.roll}</p>
                            <p><strong>সেশন:</strong></p><p>{dialogState.file.sessionYear}</p>
                            <div className="flex items-center"><strong>স্ট্যাটাস:</strong></div>
                            <div><Badge variant={dialogState.file.certificate_status === 'প্রিন্ট হয়েছে' ? 'default' : 'secondary'}>{dialogState.file.certificate_status}</Badge></div>
                        </div></div>
                    )}
                    
                    {dialogState.file.hasElectricityBill && (
                        <div><Separator className="my-4" />
                        <h3 className="font-semibold mb-2 text-base">বিদ্যুৎ বিলের তথ্য</h3>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            <p><strong>বিলের নাম:</strong></p><p>{dialogState.file.bill_holder_name}</p>
                            <p><strong>কাস্টমার নং:</strong></p><p>{dialogState.file.bill_customer_no}</p>
                            <p><strong>অ্যাকাউন্ট নং:</strong></p><p>{dialogState.file.bill_account_no}</p>
                            <p><strong>মিটার নং:</strong></p><p>{dialogState.file.bill_meter_no}</p>
                            <p><strong>ঠিকানা:</strong></p><p>{dialogState.file.bill_address?.address || `দাগ নং-${dialogState.file.bill_address?.dagNo}, ${dialogState.file.bill_address?.area}, ${dialogState.file.bill_address?.division}`}</p>
                            <div className="flex items-center"><strong>টেমপ্লেট:</strong></div>
                            <div><Badge variant="outline">{dialogState.file.bill_template_name?.toUpperCase()}</Badge></div>
                             <div className="flex items-center"><strong>স্ট্যাটাস:</strong></div>
                            <div><Badge variant={dialogState.file.bill_status === 'প্রিন্ট হয়েছে' ? 'default' : 'secondary'}>{dialogState.file.bill_status}</Badge></div>
                        </div></div>
                    )}
                    <DialogFooter className='pt-4'><DialogClose asChild><Button type="button" variant="outline">বন্ধ করুন</Button></DialogClose></DialogFooter>
                </div>
            );
        case 'edit':
             if (!dialogState.file) return null;
            return (
                <EditFileForm
                    file={dialogState.file}
                    clients={clients}
                    institutions={institutions}
                    billAddresses={billAddresses}
                    billTemplates={billTemplates}
                    onSuccess={handleSuccess}
                    onCancel={handleDialogClose}
                />
            );
        case 'add':
             return <FileForm 
                clients={clients} 
                institutions={institutions}
                billAddresses={billAddresses}
                billTemplates={billTemplates}
                onSuccess={handleSuccess} 
                onCancel={handleDialogClose} 
            />;
        default:
            return null;
    }
  }


  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="mb-4 md:mb-0">
          <CardTitle>ফাইল সমূহ</CardTitle>
          <CardDescription>এখানে সকল ফাইল দেখুন, পরিচালনা করুন ও প্রিন্ট করুন।</CardDescription>
        </div>
         <div className="flex flex-col md:flex-row gap-2">
            <Button variant="outline" onClick={handlePrintFiltered} disabled={displayedFiles.length === 0}>
                <Printer className="mr-2 h-4 w-4" />
                প্রিন্ট
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={selectedRows.length === 0}>
                  বাল্ক অ্যাকশন <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        <Printer className="mr-2 h-4 w-4" />
                        <span>প্রিন্ট</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                            <DropdownMenuItem onClick={() => handleBulkPrint('certificate')}>
                                <Award className="mr-2 h-4 w-4" />
                                প্রত্যয়নপত্র প্রিন্ট
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleBulkPrint('bill')}>
                                <Bolt className="mr-2 h-4 w-4" />
                                বিদ্যুৎ বিল প্রিন্ট
                            </DropdownMenuItem>
                        </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                </DropdownMenuSub>

                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        <CheckSquare className="mr-2 h-4 w-4" />
                        <span>স্ট্যাটাস পরিবর্তন</span>
                    </DropdownMenuSubTrigger>
                     <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger>প্রত্যয়নপত্র</DropdownMenuSubTrigger>
                                <DropdownMenuPortal>
                                    <DropdownMenuSubContent>
                                        <DropdownMenuItem onClick={() => handleBulkStatusChange('certificate', 'প্রিন্ট হয়েছে')}>সকলকে প্রিন্ট হয়েছে হিসেবে চিহ্নিত করুন</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleBulkStatusChange('certificate', 'প্রিন্ট হয়নি')}>সকলকে প্রিন্ট বাকি হিসেবে চিহ্নিত করুন</DropdownMenuItem>
                                    </DropdownMenuSubContent>
                                </DropdownMenuPortal>
                            </DropdownMenuSub>
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger>বিদ্যুৎ বিল</DropdownMenuSubTrigger>
                                 <DropdownMenuPortal>
                                    <DropdownMenuSubContent>
                                        <DropdownMenuItem onClick={() => handleBulkStatusChange('bill', 'প্রিন্ট হয়েছে')}>সকলকে প্রিন্ট হয়েছে হিসেবে চিহ্নিত করুন</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleBulkStatusChange('bill', 'প্রিন্ট হয়নি')}>সকলকে প্রিন্ট বাকি হিসেবে চিহ্নিত করুন</DropdownMenuItem>
                                    </DropdownMenuSubContent>
                                </DropdownMenuPortal>
                            </DropdownMenuSub>
                        </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                </DropdownMenuSub>

                <DropdownMenuSeparator />
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                             <Trash2 className="mr-2 h-4 w-4" />
                            ডিলিট করুন
                        </DropdownMenuItem>
                    </AlertDialogTrigger>
                     <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>আপনি কি নিশ্চিত?</AlertDialogTitle>
                            <AlertDialogDescription>
                                এই কাজটি ফিরিয়ে আনা যাবে না। এটি আপনার ডাটাবেস থেকে নির্বাচিত সকল ফাইল এবং এর সাথে সম্পর্কিত ডকুমেন্ট স্থায়ীভাবে মুছে ফেলবে।
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>বাতিল</AlertDialogCancel>
                            <AlertDialogAction
                                className='bg-destructive hover:bg-destructive/90'
                                onClick={handleBulkDelete}
                                disabled={isDeletePending}
                            >
                                {isDeletePending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                ডিলিট
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button size="sm" className="gap-1 bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setDialogState({ mode: 'add', file: null })}>
              <FilePlus2 className="h-4 w-4" />
              নতুন ফাইল
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-center gap-4 py-4 px-1">
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full md:w-auto">
                        ফিল্টার: {
                            filter === 'lifetime' ? 'লাইফটাইম' :
                            filter === 'daily' ? 'দৈনিক' :
                            filter === 'weekly' ? 'সাপ্তাহিক' :
                            filter === 'monthly' ? 'মাসিক' :
                            filter === 'yearly' ? 'বাৎসরিক' :
                            filter === 'specific_date' ? 'নির্দিষ্ট দিন' :
                            filter === 'specific_month' ? 'নির্দিষ্ট মাস' :
                            'কাস্টম রেঞ্জ'
                        }
                        <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuLabel>সময়সীমা অনুযায়ী ফিল্টার</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
                        <DropdownMenuRadioItem value="lifetime">লাইফটাইম</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="daily">দৈনিক</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="weekly">সাপ্তাহিক</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="monthly">মাসিক</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="yearly">বাৎসরিক</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="specific_date">নির্দিষ্ট দিন</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="specific_month">নির্দিষ্ট মাস</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="custom">কাস্টম রেঞ্জ</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                </DropdownMenuContent>
            </DropdownMenu>
            {renderFilterInput()}
        </div>
        {displayedFiles.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p>এই সময়সীমার মধ্যে কোনো ফাইল পাওয়া যায়নি।</p>
            <p className="text-sm">অন্য একটি ফিল্টার চেষ্টা করুন অথবা নতুন ফাইল যোগ করুন।</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className='hidden md:block'>
                <Table>
                <TableHeader>
                <TableRow>
                    <TableHead className="w-[40px]"><Checkbox checked={isAllSelected} onCheckedChange={(checked) => handleSelectAll(Boolean(checked))} aria-label="Select all"/></TableHead>
                    <TableHead>ক্রমিক নং</TableHead>
                    <TableHead>আবেদনকারীর নাম</TableHead>
                    <TableHead>জন্ম তারিখ/সাল</TableHead>
                    <TableHead>ক্লায়েন্টের নাম</TableHead>
                    <TableHead>ডকুমেন্টস</TableHead>
                    <TableHead>তৈরির তারিখ</TableHead>
                    <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {displayedFiles.map((file) => {
                    return (
                    <TableRow key={file.id} data-state={selectedRows.includes(file.id) ? "selected" : undefined} onMouseEnter={() => {
                        if (file.hasCertificate) router.prefetch(`/certificates/print/bulk?ids=${file.id}`);
                        if (file.hasElectricityBill) router.prefetch(`/electricity-bills/print/bulk?ids=${file.id}`);
                    }}>
                    <TableCell><Checkbox checked={selectedRows.includes(file.id)} onCheckedChange={(checked) => handleSelectRow(file.id, Boolean(checked))} aria-label={`Select row ${file.id}`}/></TableCell>
                    <TableCell className="font-mono">{file.serial_no.toString().padStart(4, '0')}</TableCell>
                    <TableCell className="font-medium">{file.applicantName}</TableCell>
                    <TableCell>{formatDobForDisplay(file.dob)}</TableCell>
                    <TableCell>{file.clientName}</TableCell>
                    <TableCell>
                        <div className="flex gap-2">
                             {file.hasCertificate && (
                                <Badge variant={file.certificate_status === 'প্রিন্ট হয়েছে' ? 'default' : 'secondary'} className="px-1.5 py-0"><Award className="h-3 w-3 mr-1" />প্রত্যয়ন</Badge>
                            )}
                             {file.hasElectricityBill && (
                                <Badge variant={file.bill_status === 'প্রিন্ট হয়েছে' ? 'default' : 'secondary'} className="px-1.5 py-0"><Bolt className="h-3 w-3 mr-1" />বিদ্যুৎ বিল</Badge>
                            )}
                        </div>
                    </TableCell>
                    <TableCell>{file.createdAt ? format(dateFnsParseIso(file.createdAt), 'dd/MM/yyyy') : ''}</TableCell>
                    <TableCell>
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Toggle menu</span></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetails(file)}><Eye className="mr-2 h-4 w-4" />দেখুন</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditFile(file)}><Edit className="mr-2 h-4 w-4" />এডিট</DropdownMenuItem>
                             <DropdownMenuSub>
                                <DropdownMenuSubTrigger>স্ট্যাটাস পরিবর্তন</DropdownMenuSubTrigger>
                                <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                    <DropdownMenuLabel>স্ট্যাটাস</DropdownMenuLabel>
                                    {file.hasCertificate && (
                                    <DropdownMenuItem onClick={() => handleStatusChange(file, 'certificate', file.certificate_status === 'প্রিন্ট হয়েছে' ? 'প্রিন্ট হয়নি' : 'প্রিন্ট হয়েছে')}>
                                        প্রত্যয়নপত্র: {file.certificate_status === 'প্রিন্ট হয়েছে' ? 'প্রিন্ট বাকি' : 'প্রিন্ট হয়েছে'}
                                    </DropdownMenuItem>
                                    )}
                                    {file.hasElectricityBill && (
                                    <DropdownMenuItem onClick={() => handleStatusChange(file, 'bill', file.bill_status === 'প্রিন্ট হয়েছে' ? 'প্রিন্ট হয়নি' : 'প্রিন্ট হয়েছে')}>
                                        বিদ্যুৎ বিল: {file.bill_status === 'প্রিন্ট হয়েছে' ? 'প্রিন্ট বাকি' : 'প্রিন্ট হয়েছে'}
                                    </DropdownMenuItem>
                                    )}
                                </DropdownMenuSubContent>
                                </DropdownMenuPortal>
                            </DropdownMenuSub>
                            <DropdownMenuSeparator/>
                            <DropdownMenuItem asChild disabled={!file.hasCertificate}>
                                <Link href={`/certificates/print/${file.id}`} target="_blank"><Printer className="mr-2 h-4 w-4" />প্রত্যয়নপত্র প্রিন্ট</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild disabled={!file.hasElectricityBill}>
                                <Link href={`/electricity-bills/print/${file.id}`} target="_blank"><Printer className="mr-2 h-4 w-4" />বিদ্যুৎ বিল প্রিন্ট</Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator/>
                            <AlertDialog>
                                <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />ডিলিট করুন</DropdownMenuItem></AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>আপনি কি নিশ্চিত?</AlertDialogTitle><AlertDialogDescription>এই কাজটি ফিরিয়ে আনা যাবে না। এটি আপনার ডাটাবেস থেকে ফাইল এবং এর সাথে সম্পর্কিত সকল ডকুমেন্ট স্থায়ীভাবে মুছে ফেলবে।</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>বাতিল</AlertDialogCancel>
                                        <AlertDialogAction className='bg-destructive hover:bg-destructive/90' onClick={() => handleDeleteFile(file.id)} disabled={isDeletePending}>
                                            {isDeletePending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}ডিলিট
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                    </TableRow>
                )})}
                </TableBody>
            </Table>
            </div>
            
            {/* Mobile Card View */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              <div className='flex items-center gap-2 px-1'>
                 <Checkbox id="selectAllMobile" checked={isAllSelected} onCheckedChange={(checked) => handleSelectAll(Boolean(checked))} aria-label="Select all"/>
                 <label htmlFor="selectAllMobile" className='text-sm font-medium'>সবগুলো নির্বাচন করুন</label>
              </div>
              {displayedFiles.map((file) => (
                <Card key={file.id} className={cn("relative", selectedRows.includes(file.id) && "border-primary ring-2 ring-primary")} onMouseEnter={() => {
                        if (file.hasCertificate) router.prefetch(`/certificates/print/${file.id}`);
                        if (file.hasElectricityBill) router.prefetch(`/electricity-bills/print/${file.id}`);
                    }}>
                    <div className='absolute top-2 left-2'>
                        <Checkbox checked={selectedRows.includes(file.id)} onCheckedChange={(checked) => handleSelectRow(file.id, Boolean(checked))} aria-label={`Select row ${file.id}`}/>
                    </div>
                  <CardHeader className="flex flex-row items-start justify-between pb-2 pl-8">
                    <div className="flex-1">
                      <CardTitle className="text-base">{file.applicantName}</CardTitle>
                      <CardDescription>ক্লায়েন্ট: {file.clientName}</CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetails(file)}><Eye className="mr-2 h-4 w-4" />দেখুন</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditFile(file)}><Edit className="mr-2 h-4 w-4" />এডিট</DropdownMenuItem>
                             <DropdownMenuSub>
                                <DropdownMenuSubTrigger>স্ট্যাটাস পরিবর্তন</DropdownMenuSubTrigger>
                                <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                    <DropdownMenuLabel>স্ট্যাটাস</DropdownMenuLabel>
                                    {file.hasCertificate && (
                                    <DropdownMenuItem onClick={() => handleStatusChange(file, 'certificate', file.certificate_status === 'প্রিন্ট হয়েছে' ? 'প্রিন্ট হয়নি' : 'প্রিন্ট হয়েছে')}>
                                        প্রত্যয়নপত্র: {file.certificate_status === 'প্রিন্ট হয়েছে' ? 'প্রিন্ট বাকি' : 'প্রিন্ট হয়েছে'}
                                    </DropdownMenuItem>
                                    )}
                                    {file.hasElectricityBill && (
                                    <DropdownMenuItem onClick={() => handleStatusChange(file, 'bill', file.bill_status === 'প্রিন্ট হয়েছে' ? 'প্রিন্ট হয়নি' : 'প্রিন্ট হয়েছে')}>
                                        বিদ্যুৎ বিল: {file.bill_status === 'প্রিন্ট হয়েছে' ? 'প্রিন্ট বাকি' : 'প্রিন্ট হয়েছে'}
                                    </DropdownMenuItem>
                                    )}
                                </DropdownMenuSubContent>
                                </DropdownMenuPortal>
                            </DropdownMenuSub>
                            <DropdownMenuSeparator/>
                            <DropdownMenuItem asChild disabled={!file.hasCertificate}>
                                <Link href={`/certificates/print/${file.id}`} target="_blank"><Printer className="mr-2 h-4 w-4" />প্রত্যয়নপত্র প্রিন্ট</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild disabled={!file.hasElectricityBill}>
                                <Link href={`/electricity-bills/print/${file.id}`} target="_blank"><Printer className="mr-2 h-4 w-4" />বিদ্যুৎ বিল প্রিন্ট</Link>                            </DropdownMenuItem>
                            <DropdownMenuSeparator/>
                            <AlertDialog>
                                <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />ডিলিট করুন</DropdownMenuItem></AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>আপনি কি নিশ্চিত?</AlertDialogTitle><AlertDialogDescription>এই কাজটি ফিরিয়ে আনা যাবে না। এটি আপনার ডাটাবেস থেকে ফাইল এবং এর সাথে সম্পর্কিত সকল ডকুমেন্ট স্থায়ীভাবে মুছে ফেলবে।</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>বাতিল</AlertDialogCancel>
                                        <AlertDialogAction className='bg-destructive hover:bg-destructive/90' onClick={() => handleDeleteFile(file.id)} disabled={isDeletePending}>
                                            {isDeletePending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}ডিলিট
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1 pl-8">
                    <p><strong>ক্রমিক নং:</strong></p>
                    <p className="font-mono">{file.serial_no.toString().padStart(4, '0')}</p>
                    <p><strong>জন্ম তারিখ/সাল:</strong></p>
                    <p>{formatDobForDisplay(file.dob)}</p>
                    <p><strong>তৈরির তারিখ:</strong></p>
                    <p>{file.createdAt ? format(dateFnsParseIso(file.createdAt), 'dd/MM/yyyy') : ''}</p>
                    <p><strong>ডকুমেন্টস:</strong></p>
                    <div className="flex gap-2">
                        {file.hasCertificate && <Badge variant={file.certificate_status === 'প্রিন্ট হয়েছে' ? 'default' : 'secondary'} className="px-1.5 py-0"><Award className="h-3 w-3 mr-1" />প্রত্যয়ন</Badge>}
                        {file.hasElectricityBill && <Badge variant={file.bill_status === 'প্রিন্ট হয়েছে' ? 'default' : 'secondary'} className="px-1.5 py-0"><Bolt className="h-3 w-3 mr-1" />বিল</Badge>}
                        {!file.hasCertificate && !file.hasElectricityBill && <Badge variant="outline">নেই</Badge>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </CardContent>
      
      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{getDialogTitle()}</DialogTitle>
              {dialogState.mode === 'add' && <DialogDescription>নতুন ফাইল তৈরি করুন এবং ঐচ্ছিকভাবে প্রত্যয়নপত্র ও বিদ্যুৎ বিল যোগ করুন।</DialogDescription>}
               {dialogState.mode === 'edit' && <DialogDescription>ফাইলের তথ্য এবং এর সাথে যুক্ত ডকুমেন্টের বিবরণ আপডেট করুন।</DialogDescription>}
            </DialogHeader>
            {renderDialogContent()}
          </DialogContent>
        </Dialog>
    </Card>
  );
}
  

    