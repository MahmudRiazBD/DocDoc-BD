
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
import { isValid, parse, differenceInYears } from 'date-fns';
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
import { addFile, updateFile, deleteFile, deleteFiles, updatePrintStatus, getFiles } from '@/lib/supabase/database';
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
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

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
    // This regex supports dd/MM/yyyy, dd-MM-yyyy, and dd.MM.yyyy
    const dateRegex = /^(?<day>\d{1,2})(?<sep>[\/\-.])(?<month>\d{1,2})\k<sep>(?<year>\d{4})$/;
    const match = englishDateString.match(dateRegex);
    
    if (match?.groups) {
        const { sep } = match.groups;
        const formatString = `dd${sep}MM${sep}yyyy`;
        const parsedDate = parse(englishDateString, formatString, new Date());
        return isValid(parsedDate) ? parsedDate : null;
    }
    return null;
};


const isEnglish = (str: string) => /^[a-zA-Z\s.-]+$/.test(str);
const isBengali = (str: string) => /^[\u0980-\u09FF\s.-]+$/.test(str);


const fileSchema = z.object({
  applicantName: z.string().min(1, 'আবেদনকারীর নাম আবশ্যক'),
  clientId: z.string({ required_error: 'ক্লায়েন্ট নির্বাচন করুন' }),
  dob: z.string().min(4, 'জন্ম তারিখ বা সাল আবশ্যক'),
  
  createCertificate: z.boolean().default(false),
  createElectricityBill: z.boolean().default(false),

  fatherName: z.string().optional(),
  motherName: z.string().optional(),
  
  applicantNameEnglish: z.string().optional(),
  fatherNameEnglish: z.string().optional(),

}).superRefine((data, ctx) => {
    const today = new Date();
    let birthYear: number | null = null;
    let age: number | null = null;

    if (/^\d{4}$/.test(toEnglish(data.dob))) {
        birthYear = parseInt(toEnglish(data.dob), 10);
        age = today.getFullYear() - birthYear;
    } else {
        const parsedDate = parseDateString(data.dob);
        if (parsedDate && isValid(parsedDate)) {
            birthYear = parsedDate.getFullYear();
            age = differenceInYears(today, parsedDate);
        }
    }
    
    if (!birthYear) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'সঠিক ফরম্যাটে তারিখ বা সাল দিন (DD/MM/YYYY বা YYYY)', path: ['dob'] });
    }

    if (data.createCertificate) {
        if (!isBengali(data.applicantName)) {
             ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'প্রত্যয়নপত্রের জন্য আবেদনকারীর নাম অবশ্যই বাংলায় লিখতে হবে।', path: ['applicantName'] });
        }
        if (!parseDateString(data.dob)) {
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
    
    if (data.createElectricityBill && age !== null) {
        if (age < 24) {
            if (!data.fatherNameEnglish) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: '২৪ বছরের কম বয়সীদের জন্য পিতার ইংরেজি নাম আবশ্যক', path: ['fatherNameEnglish'] });
            } else if (!isEnglish(data.fatherNameEnglish)) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'পিতার নাম অবশ্যই ইংরেজিতে লিখতে হবে।', path: ['fatherNameEnglish'] });
            }
        } else { // 24 or older
            if (!isEnglish(data.applicantName) && !data.applicantNameEnglish) {
                 ctx.addIssue({ code: z.ZodIssueCode.custom, message: '২৪ বছর বা তার বেশি বয়সীদের জন্য আবেদনকারীর ইংরেজি নাম আবশ্যক', path: ['applicantNameEnglish'] });
            } else if (data.applicantNameEnglish && !isEnglish(data.applicantNameEnglish)) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'আবেদনকারীর নাম অবশ্যই ইংরেজিতে লিখতে হবে।', path: ['applicantNameEnglish'] });
            }
        }
    }
});


type FileSchema = z.infer<typeof fileSchema>;

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
  const [isClientPopoverOpen, setClientPopoverOpen] = useState(false);

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
          applicantNameEnglish: '',
          fatherNameEnglish: '',
        },
  });

  const watchAllFields = form.watch();
  
  const { applicantName, dob, createCertificate, createElectricityBill } = watchAllFields;

  const isCertificateEnabled = useMemo(() => {
    return isBengali(applicantName) && parseDateString(dob) !== null;
  }, [applicantName, dob]);
  
  const applicantAge = useMemo(() => {
    if (!dob) return null;
    const today = new Date();
    if (/^\d{4}$/.test(toEnglish(dob))) {
        const birthYear = parseInt(toEnglish(dob), 10);
        return today.getFullYear() - birthYear;
    }
    const parsedDob = parseDateString(dob);
    if(parsedDob && isValid(parsedDob)) {
        return differenceInYears(today, parsedDob);
    }
    return null;
  }, [dob]);

  const isBillEnabled = applicantAge !== null;

  // This determines if we need to ask for the applicant's name in English
  const showApplicantNameEnglish = useMemo(() => {
    return createElectricityBill && applicantAge !== null && applicantAge >= 24 && !isEnglish(applicantName);
  }, [createElectricityBill, applicantAge, applicantName]);

  // This determines if we need to ask for the father's name in English
  const showFatherNameEnglish = useMemo(() => {
      return createElectricityBill && applicantAge !== null && applicantAge < 24;
  }, [createElectricityBill, applicantAge]);


  // Reset checkboxes if conditions are no longer met
  useEffect(() => {
    if (!isCertificateEnabled && createCertificate) {
        form.setValue('createCertificate', false);
    }
  }, [isCertificateEnabled, createCertificate, form]);

  useEffect(() => {
    if (!isBillEnabled && createElectricityBill) {
        form.setValue('createElectricityBill', false);
    }
  }, [isBillEnabled, createElectricityBill, form]);


  const onSubmit = (values: FileSchema) => {
    startTransition(async () => {
      try {
        const selectedClient = clients.find(c => c.id === values.clientId);
        if (!selectedClient) {
            toast({ variant: 'destructive', title: 'ত্রুটি', description: 'ক্লায়েন্ট খুঁজে পাওয়া যায়নি।' });
            return;
        }

        const dobForDb = parseDateString(values.dob) 
            ? formatInTimeZone(parseDateString(values.dob)!, 'Asia/Dhaka', 'yyyy-MM-dd')
            : values.dob;

        const fileData: Partial<AppFile> = { 
            applicantNameBn: isBengali(values.applicantName) ? values.applicantName : null,
            applicantNameEn: isEnglish(values.applicantName) ? values.applicantName : (showApplicantNameEnglish ? values.applicantNameEnglish : null),
            clientId: values.clientId,
            clientName: selectedClient.name,
            dob: dobForDb,
            hasCertificate: values.createCertificate,
            hasElectricityBill: values.createElectricityBill,
            createdAt: new Date().toISOString(),
        };
        
        let toastMessages = ['নতুন ফাইলটি তালিকায় যোগ করা হয়েছে।'];

        if(values.createCertificate && applicantAge !== null) {
            if (!institutions || institutions.length === 0) {
                toast({ variant: 'destructive', title: 'কোনো প্রতিষ্ঠান পাওয়া যায়নি', description: 'প্রত্যয়নপত্র তৈরির আগে অনুগ্রহ করে কমপক্ষে একটি প্রতিষ্ঠান যোগ করুন।' });
                return;
            }
                const randomInstitution = institutions[Math.floor(Math.random() * institutions.length)];
                
                const academicData = await generateCertificateData({ age: applicantAge, date: new Date().toISOString() });
                
                fileData.fatherNameBn = values.fatherName;
                fileData.motherName = values.motherName;
                fileData.institutionId = randomInstitution.id;
                fileData.class = academicData.class;
                fileData.roll = Number(academicData.roll);
                fileData.certificateDate = academicData.certificateDate;
                fileData.sessionYear = academicData.sessionYear;
                fileData.certificate_status = 'প্রিন্ট হয়নি';
                
                toastMessages.push('সংশ্লিষ্ট প্রত্যয়নপত্র সফলভাবে তৈরি করা হয়েছে।');
        }

        if(values.createElectricityBill && applicantAge !== null) {
            const activeTemplateIds = billTemplates.filter(t => t.isActive).map(t => t.id);
            const activeAddresses = billAddresses.filter(addr => activeTemplateIds.includes(addr.templateId));
            
            if (activeAddresses.length === 0) {
                  toast({ variant: 'destructive', title: 'কোনো সক্রিয় বিলের ঠিকানা পাওয়া যায়নি', description: 'বিদ্যুৎ বিল তৈরির আগে অনুগ্রহ করে কমপক্ষে একটি সক্রিয় টেমপ্লেটের সাথে ঠিকানা যোগ করুন।' });
                  return;
            } 
            
                let billHolderName = '';
                if(applicantAge < 24) {
                    billHolderName = values.fatherNameEnglish!;
                    fileData.fatherNameEn = values.fatherNameEnglish;
                } else {
                    // If applicant name is already in english, use it. Otherwise use the separate english name field.
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
                fileData.fatherNameEn = values.fatherNameEnglish;

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
                        <FormControl><Input placeholder="বাংলা বা ইংরেজিতে সম্পূর্ণ নাম" {...field} /></FormControl>
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
                            <Popover open={isClientPopoverOpen} onOpenChange={setClientPopoverOpen}>
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
                                                <CommandItem value={client.name} key={client.id} onSelect={() => {
                                                    form.setValue("clientId", client.id);
                                                    setClientPopoverOpen(false);
                                                }}>
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
                
                <Separator />
                
                <div className="space-y-4 pt-2">
                    <h3 className="text-base font-medium">কোন ডকুমেন্ট তৈরি করতে চান?</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <FormField control={form.control} name="createCertificate" render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 data-[disabled=true]:opacity-50" data-disabled={!isCertificateEnabled}>
                            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={!isCertificateEnabled} /></FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel className={cn(!isCertificateEnabled && "text-muted-foreground")}>প্রত্যয়নপত্র তৈরি করুন</FormLabel>
                                <FormDescription className={cn(isCertificateEnabled ? 'hidden' : 'block')}>
                                    নাম বাংলায় এবং জন্ম তারিখ সম্পূর্ণ দিন।
                                </FormDescription>
                            </div>
                            </FormItem>
                        )} />
                         <FormField control={form.control} name="createElectricityBill" render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 data-[disabled=true]:opacity-50" data-disabled={!isBillEnabled}>
                            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={!isBillEnabled} /></FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel className={cn(!isBillEnabled && "text-muted-foreground")}>বিদ্যুৎ বিল তৈরি করুন</FormLabel>
                                <FormDescription className={cn(isBillEnabled ? 'hidden' : 'block')}>
                                    জন্ম তারিখ বা সাল দিন।
                                </FormDescription>
                            </div>
                            </FormItem>
                        )} />
                    </div>

                    {createCertificate && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-md">
                            <h3 className="md:col-span-2 text-sm font-medium text-muted-foreground -mb-2">প্রত্যয়নপত্রের জন্য তথ্য (বাংলা)</h3>
                            <FormField control={form.control} name="fatherName" render={({ field }) => (
                                <FormItem>
                                <FormLabel>পিতার নাম</FormLabel>
                                <FormControl><Input placeholder="পিতার সম্পূর্ণ নাম" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="motherName" render={({ field }) => (
                                <FormItem>
                                <FormLabel>মাতার নাম</FormLabel>
                                <FormControl><Input placeholder="মাতার সম্পূর্ণ নাম" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                    )}
                    
                    {(showApplicantNameEnglish || showFatherNameEnglish) && (
                        <div className="p-4 border rounded-md space-y-4">
                            <h3 className="text-sm font-medium text-muted-foreground">বিদ্যুৎ বিলের জন্য তথ্য (ইংরেজি)</h3>
                             {showFatherNameEnglish && (
                                <FormField control={form.control} name="fatherNameEnglish" render={({ field }) => (
                                    <FormItem><FormLabel>পিতার নাম</FormLabel>
                                    <FormControl><Input placeholder="Father's Full Name" {...field} /></FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )} />
                            )}
                            {showApplicantNameEnglish && (
                                <FormField control={form.control} name="applicantNameEnglish" render={({ field }) => (
                                    <FormItem><FormLabel>আবেদনকারীর নাম</FormLabel>
                                    <FormControl><Input placeholder="Applicant's Full Name" {...field} /></FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )} />
                            )}
                        </div>
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
  applicantNameBn: z.string().optional(),
  applicantNameEn: z.string().optional(),
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
            applicantNameBn: file.applicantNameBn ?? '',
            applicantNameEn: file.applicantNameEn ?? '',
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
                
                if(file.applicantNameBn !== values.applicantNameBn) fileUpdates.applicantNameBn = values.applicantNameBn;
                if(file.applicantNameEn !== values.applicantNameEn) fileUpdates.applicantNameEn = values.applicantNameEn;
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
            {file.applicantNameBn && <FormField control={form.control} name="applicantNameBn" render={({ field }) => (
                <FormItem><FormLabel>আবেদনকারীর নাম (বাংলা)</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage /></FormItem>
            )} />}
            {file.applicantNameEn && <FormField control={form.control} name="applicantNameEn" render={({ field }) => (
                <FormItem><FormLabel>আবেদনকারীর নাম (ইংরেজি)</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage /></FormItem>
            )} />}
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
  totalFiles,
  clients, 
  billAddresses, 
  billTemplates,
  institutions
}: { 
  initialFiles: AppFile[],
  totalFiles: number,
  clients: Client[],
  billAddresses: BillAddress[],
  billTemplates: BillTemplate[],
  institutions: Institution[],
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [files, setFiles] = useState(initialFiles);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  
  type DialogState = {
    mode: 'add' | 'view' | 'edit' | null;
    file: AppFile | null;
    loadingDetails?: boolean;
  };
  const [dialogState, setDialogState] = useState<DialogState>({ mode: null, file: null });

  // Update files state if initialFiles change (due to filter navigation)
  useEffect(() => {
    setFiles(initialFiles);
    setPage(1); // Reset page number on filter change
  }, [initialFiles]);
  
  useEffect(() => {
    if(searchParams.get('action') === 'add') {
      setDialogState({ mode: 'add', file: null });
      // Clean the URL without reloading the page
      router.replace(pathname, {scroll: false});
    }
  }, [searchParams, router, pathname]);

  const createQueryString = (params: Record<string, string | null>) => {
    const newSearchParams = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(params)) {
        if (value === null) {
            newSearchParams.delete(key);
        } else {
            newSearchParams.set(key, value);
        }
    }
    return newSearchParams.toString();
  };

  const handleFilterChange = (key: string, value: string | null) => {
    router.push(pathname + '?' + createQueryString({ [key]: value, page: null }));
  };

  const loadMoreFiles = async () => {
    setIsLoadingMore(true);
    try {
        const nextPage = page + 1;
        const newFiles = await getFiles({
            page: nextPage,
            filter: searchParams.get('filter') || undefined,
            clientId: searchParams.get('clientId') || undefined,
            date: searchParams.get('date') || undefined,
            from: searchParams.get('from') || undefined,
            to: searchParams.get('to') || undefined,
            month: searchParams.get('month') || undefined,
            year: searchParams.get('year') || undefined,
        });

        if (newFiles.length > 0) {
            setFiles(prev => [...prev, ...newFiles]);
            setPage(nextPage);
        }
    } catch (error) {
        toast({ variant: 'destructive', title: 'ত্রুটি', description: 'আরও ফাইল লোড করতে সমস্যা হয়েছে।' });
    } finally {
        setIsLoadingMore(false);
    }
  };
  
  
  const handleViewDetails = (file: AppFile) => {
    setDialogState({ mode: 'view', file: file });
  }

  const handleEditFile = async (file: AppFile) => {
    setDialogState({ mode: 'edit', file: file });
  }

  const handleStatusChange = async (file: AppFile, docType: 'certificate' | 'bill', newStatus: 'প্রিন্ট হয়েছে' | 'প্রিন্ট হয়নি') => {
      try {
        await updatePrintStatus(docType, [file.id], newStatus);
        toast({ title: 'স্ট্যাটাস আপডেট হয়েছে', className: 'bg-accent text-accent-foreground' });
        // Optimistically update UI
        setFiles(files.map(f => {
            if (f.id === file.id) {
                if (docType === 'certificate') f.certificate_status = newStatus;
                if (docType === 'bill') f.bill_status = newStatus;
            }
            return f;
        }));
      } catch (error) {
         toast({ variant: 'destructive', title: 'ত্রুটি', description: 'স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে।'});
      }
  }
  
  const handleBulkStatusChange = async (docType: 'certificate' | 'bill', newStatus: 'প্রিন্ট হয়েছে' | 'প্রিন্ট হয়নি') => {
    if (selectedRows.length === 0) {
      toast({ variant: 'destructive', title: 'কোনো ফাইল নির্বাচন করা হয়নি', description: 'অনুগ্রহ করে কমপক্ষে একটি ফাইল নির্বাচন করুন।'});
      return;
    }

    const docIdsToUpdate = files
      .filter(f => selectedRows.includes(f.id) && (docType === 'certificate' ? f.hasCertificate : f.hasElectricityBill))
      .map(f => f.id);

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
      // Optimistically update UI
       setFiles(files.map(f => {
            if (docIdsToUpdate.includes(f.id)) {
                if (docType === 'certificate') f.certificate_status = newStatus;
                if (docType === 'bill') f.bill_status = newStatus;
            }
            return f;
        }));
      setSelectedRows([]);
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
            setFiles(files.filter(f => f.id !== id));
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
        setFiles(files.filter(f => !selectedRows.includes(f.id)));
        setSelectedRows([]);
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
    const filteredIds = files.filter(f => selectedRows.includes(f.id) && (type === 'certificate' ? f.hasCertificate : f.hasElectricityBill)).map(f => f.id);
    
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
    const printSearchParams = new URLSearchParams(searchParams);
    printSearchParams.delete('page');
    const url = `/files/print?${printSearchParams.toString()}`;
    window.open(url, '_blank');
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedRows(checked ? files.map((f) => f.id) : []);
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    setSelectedRows(checked ? [...selectedRows, id] : selectedRows.filter((rowId) => rowId !== id));
  };
  const isAllSelected = files.length > 0 && selectedRows.length === files.length;

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
    const filter = searchParams.get('filter') || 'all';
    switch (filter) {
        case 'specific_date':
            return (
                <Popover>
                    <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full md:w-[280px] justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {searchParams.get('date') ? formatInTimeZone(parse(searchParams.get('date')!, 'yyyy-MM-dd', new Date()), 'Asia/Dhaka', 'dd/MM/yyyy') : <span>একটি তারিখ বাছাই করুন</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={searchParams.get('date') ? parse(searchParams.get('date')!, 'yyyy-MM-dd', new Date()) : undefined} onSelect={(date) => handleFilterChange('date', date ? formatInTimeZone(date, 'Asia/Dhaka', 'yyyy-MM-dd') : null)} initialFocus />
                    </PopoverContent>
                </Popover>
            );
        case 'custom':
            const from = searchParams.get('from');
            const to = searchParams.get('to');
            const dateRange: DateRange | undefined = from ? { from: parse(from, 'yyyy-MM-dd', new Date()), to: to ? parse(to, 'yyyy-MM-dd', new Date()) : undefined } : undefined;
            return (
                <Popover>
                    <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full md:w-[300px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (dateRange.to ? <>{formatInTimeZone(dateRange.from, 'Asia/Dhaka', "dd/MM/yy")} - {formatInTimeZone(dateRange.to, 'Asia/Dhaka', "dd/MM/yy")}</> : formatInTimeZone(dateRange.from, 'Asia/Dhaka', "dd/MM/yyyy")) : <span>একটি তারিখ পরিসর বাছাই করুন</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={(range) => {
                        handleFilterChange('from', range?.from ? formatInTimeZone(range.from, 'Asia/Dhaka', 'yyyy-MM-dd') : null)
                        handleFilterChange('to', range?.to ? formatInTimeZone(range.to, 'Asia/Dhaka', 'yyyy-MM-dd') : null)
                    }} numberOfMonths={2}/>
                    </PopoverContent>
                </Popover>
            );
        case 'specific_month':
             return (
                <Input
                    type="month"
                    value={searchParams.get('month') || formatInTimeZone(new Date(), 'Asia/Dhaka', 'yyyy-MM')}
                    onChange={(e) => handleFilterChange('month', e.target.value)}
                    className="w-full md:w-[280px]"
                />
            );
        case 'yearly':
            return (
                <Select onValueChange={(value) => handleFilterChange('year', value)} defaultValue={searchParams.get('year') || String(new Date().getFullYear())}>
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
            const displayName = dialogState.file.applicantNameBn || dialogState.file.applicantNameEn;
            return (
                <div className='space-y-4 text-sm pt-4'>
                    <div>
                        <h3 className="font-semibold mb-2 text-base">ফাইলের তথ্য</h3>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            <p><strong>আবেদনকারীর নাম:</strong></p><p>{displayName}</p>
                            <p><strong>জন্ম তারিখ/সাল:</strong></p><p>{formatDobForDisplay(dialogState.file.dob)}</p>
                            <p><strong>ক্লায়েন্টের নাম:</strong></p><p>{dialogState.file.clientName}</p>
                            <div className="flex items-center"><strong>ডকুমেন্টস:</strong></div>
                            <div className='flex gap-2'>
                                {dialogState.file.hasCertificate ? <Badge variant="secondary">প্রত্যয়নপত্র</Badge> : <Badge variant="outline">প্রত্যয়নপত্র নেই</Badge>}
                                {dialogState.file.hasElectricityBill ? <Badge variant="secondary">বিদ্যুৎ বিল</Badge> : <Badge variant="outline">বিদ্যুৎ বিল নেই</Badge>}
                            </div>
                            <p><strong>তৈরির তারিখ:</strong></p><p>{dialogState.file.createdAt ? formatInTimeZone(parse(dialogState.file.createdAt, "yyyy-MM-dd'T'HH:mm:ss.SSSSSSxxx", new Date()), 'Asia/Dhaka', 'PPpp') : ''}</p>
                        </div>
                    </div>

                    {dialogState.file.hasCertificate && (
                        <div><Separator className="my-4" />
                        <h3 className="font-semibold mb-2 text-base">প্রত্যয়নপত্রের তথ্য</h3>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            <p><strong>পিতার নাম:</strong></p><p>{dialogState.file.fatherNameBn}</p>
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
            <Button variant="outline" onClick={handlePrintFiltered}>
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
                           searchParams.get('filter') === 'daily' ? 'দৈনিক' :
                           searchParams.get('filter') === 'weekly' ? 'সাপ্তাহিক' :
                           searchParams.get('filter') === 'monthly' ? 'মাসিক' :
                           searchParams.get('filter') === 'yearly' ? 'বাৎসরিক' :
                           searchParams.get('filter') === 'specific_date' ? 'নির্দিষ্ট দিন' :
                           searchParams.get('filter') === 'specific_month' ? 'নির্দিষ্ট মাস' :
                           searchParams.get('filter') === 'custom' ? 'কাস্টম রেঞ্জ' : 'সব ফাইল'
                        }
                        <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuLabel>সময়সীমা অনুযায়ী ফিল্টার</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup value={searchParams.get('filter') || 'all'} onValueChange={(v) => handleFilterChange('filter', v === 'all' ? null : v)}>
                        <DropdownMenuRadioItem value="all">সব ফাইল</DropdownMenuRadioItem>
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
             <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full md:w-auto justify-between">
                        {searchParams.get('clientId') ? clients.find((c) => c.id === searchParams.get('clientId'))?.name : "ক্লায়েন্ট ফিল্টার"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                        <CommandInput placeholder="ক্লায়েন্ট খুঁজুন..." />
                         <Button variant="ghost" className="w-full justify-start text-sm" onClick={() => handleFilterChange('clientId', null)}>সব ক্লায়েন্ট</Button>
                        <CommandEmpty>কোনো ক্লায়েন্ট পাওয়া যায়নি।</CommandEmpty>
                        <CommandList>
                            <CommandGroup>
                            {clients.map((client) => (
                                <CommandItem value={client.name} key={client.id} onSelect={() => handleFilterChange('clientId', client.id)}>
                                <Check className={cn("mr-2 h-4 w-4", client.id === searchParams.get('clientId') ? "opacity-100" : "opacity-0")} />
                                {client.name}
                                </CommandItem>
                            ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
        {files.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p>এই ফিল্টার অনুযায়ী কোনো ফাইল পাওয়া যায়নি।</p>
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
                  {files.map((file) => {
                      const displayName = file.applicantNameBn || file.applicantNameEn;
                      return (
                      <TableRow key={file.id} data-state={selectedRows.includes(file.id) ? "selected" : undefined} onMouseEnter={() => {
                          if (file.hasCertificate) router.prefetch(`/certificates/print/bulk?ids=${file.id}`);
                          if (file.hasElectricityBill) router.prefetch(`/electricity-bills/print/bulk?ids=${file.id}`);
                      }}>
                      <TableCell><Checkbox checked={selectedRows.includes(file.id)} onCheckedChange={(checked) => handleSelectRow(file.id, Boolean(checked))} aria-label={`Select row ${file.id}`}/></TableCell>
                      <TableCell className="font-mono">{file.serial_no.toString().padStart(4, '0')}</TableCell>
                      <TableCell className="font-medium">{displayName}</TableCell>
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
                      <TableCell>{file.createdAt ? format(parse(file.createdAt, "yyyy-MM-dd'T'HH:mm:ss.SSSSSSxxx", new Date()), 'dd/MM/yyyy') : ''}</TableCell>
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
                                      <DropdownMenuItem onClick={() => handleStatusChange(file, 'bill', file.bill_status === 'প্রিন্ট হয়েছে' ? 'প্রিন্ট হয়নি' : 'প্রিন্ট হয়েছে')}>
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
              {files.map((file) => {
                const displayName = file.applicantNameBn || file.applicantNameEn;
                return (
                <Card key={file.id} className={cn("relative", selectedRows.includes(file.id) && "border-primary ring-2 ring-primary")} onMouseEnter={() => {
                        if (file.hasCertificate) router.prefetch(`/certificates/print/${file.id}`);
                        if (file.hasElectricityBill) router.prefetch(`/electricity-bills/print/${file.id}`);
                    }}>
                    <div className='absolute top-2 left-2'>
                        <Checkbox checked={selectedRows.includes(file.id)} onCheckedChange={(checked) => handleSelectRow(file.id, Boolean(checked))} aria-label={`Select row ${file.id}`}/>
                    </div>
                  <CardHeader className="flex flex-row items-start justify-between pb-2 pl-8">
                    <div className="flex-1">
                      <CardTitle className="text-base">{displayName}</CardTitle>
                      <CardDescription>ক্লায়েন্ট: {file.clientName}</CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 -mt-2 -mr-2">
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
                                    <DropdownMenuItem onClick={() => handleStatusChange(file, 'bill', file.bill_status === 'প্রিন্ট হয়েছে' ? 'প্রিন্ট হয়নি' : 'প্রিন্ট হয়েছে')}>
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
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />ডিলিট করুন
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>আপনি কি নিশ্চিত?</AlertDialogTitle>
                                      <AlertDialogDescription>এই কাজটি ফিরিয়ে আনা যাবে না। এটি আপনার ডাটাবেস থেকে ফাইল এবং এর সাথে সম্পর্কিত সকল ডকুমেন্ট স্থায়ীভাবে মুছে ফেলবে।</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>বাতিল</AlertDialogCancel>
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
                    <p>{file.createdAt ? format(parse(file.createdAt, "yyyy-MM-dd'T'HH:mm:ss.SSSSSSxxx", new Date()), 'dd/MM/yyyy') : ''}</p>
                    <p><strong>ডকুমেন্টস:</strong></p>
                    <div className="flex gap-2">
                        {file.hasCertificate && <Badge variant={file.certificate_status === 'প্রিন্ট হয়েছে' ? 'default' : 'secondary'} className="px-1.5 py-0"><Award className="h-3 w-3 mr-1" />প্রত্যয়ন</Badge>}
                        {file.hasElectricityBill && <Badge variant={file.bill_status === 'প্রিন্ট হয়েছে' ? 'default' : 'secondary'} className="px-1.5 py-0"><Bolt className="h-3 w-3 mr-1" />বিল</Badge>}
                        {!file.hasCertificate && !file.hasElectricityBill && <Badge variant="outline">নেই</Badge>}
                    </div>
                  </CardContent>
                </Card>
              )})}
            </div>
          </>
        )}
        {files.length < totalFiles && (
            <div className="flex justify-center mt-6">
                <Button onClick={loadMoreFiles} disabled={isLoadingMore}>
                    {isLoadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    আরো লোড করুন
                </Button>
            </div>
        )}
      </CardContent>
      
      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{getDialogTitle()}</DialogTitle>
              {dialogState.mode === 'add' && <DialogDescription>নতুন ফাইল তৈরি করুন এবং ঐচ্ছিকভাবে প্রত্যয়নপত্র ও বিদ্যুৎ বিল যোগ করুন.</DialogDescription>}
               {dialogState.mode === 'edit' && <DialogDescription>ফাইলের তথ্য এবং এর সাথে যুক্ত ডকুমেন্টের বিবরণ আপডেট করুন.</DialogDescription>}
            </DialogHeader>
            {renderDialogContent()}
          </DialogContent>
        </Dialog>
    </Card>
  );
}
  

    
    

      

    






    
