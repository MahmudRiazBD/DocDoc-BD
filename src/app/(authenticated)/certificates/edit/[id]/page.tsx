'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useState, useEffect } from 'react';
import { BrainCircuit, Loader2, Save } from 'lucide-react';
import { CalendarIcon } from 'lucide-react';
import { format as formatDate, parse, isValid } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { generateCertificateData } from '@/ai/flows/certificate-data-tool';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { getFileById, updateFile, getInstitutions } from '@/lib/supabase/database';
import { AppFile, Institution } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const toEnglish = (str: string): string => {
    const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return str.replace(/[০-৯]/g, (digit) => String(bengaliDigits.indexOf(digit)));
};

const parseDateString = (dateString: string): Date | null => {
    if (!dateString) return null;
    const englishDateString = toEnglish(dateString);
    // This will only work for full dates, which is required for certificate DOB
    const date = parse(englishDateString, 'dd/MM/yyyy', new Date());
    return isValid(date) ? date : null;
};

const formSchema = z.object({
  name: z.string().min(1, 'নাম আবশ্যক'),
  fatherName: z.string().min(1, 'পিতার নাম আবশ্যক'),
  motherName: z.string().min(1, 'মাতার নাম আবশ্যক'),
  dob: z.string().refine(val => parseDateString(val) !== null, {
    message: "সম্পূর্ণ জন্ম তারিখ DD/MM/YYYY ফরম্যাটে আবশ্যক",
  }),
  class: z.string().min(1, 'ক্লাস আবশ্যক'),
  roll: z.coerce.number().min(1, 'রোল আবশ্যক'),
  certificateDate: z.string().min(1, 'প্রত্যয়নের তারিখ আবশ্যক'),
  sessionYear: z.string().min(1, 'সেশন সাল আবশ্যক'),
  institutionId: z.string().min(1, "প্রতিষ্ঠান আবশ্যক"),
});

type FormSchemaType = z.infer<typeof formSchema>;

export default function EditCertificatePage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const id = params.id as string;

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      fatherName: '',
      motherName: '',
      dob: '',
      class: '',
      roll: undefined,
      certificateDate: '',
      sessionYear: '',
      institutionId: undefined,
    },
  });

  useEffect(() => {
    async function fetchData() {
        if (!id) return;
        try {
            const [fileData, instData] = await Promise.all([
                getFileById(id),
                getInstitutions(),
            ]);

            if (fileData) {
                let formattedDob = fileData.dob;
                try {
                  const parsedDate = parse(fileData.dob, 'yyyy-MM-dd', new Date());
                  if(isValid(parsedDate)) {
                    formattedDob = formatDate(parsedDate, 'dd/MM/yyyy');
                  }
                } catch (e) {
                    // keep original if parsing fails
                }
                form.reset({
                    name: fileData.applicantName,
                    fatherName: fileData.fatherName ?? '',
                    motherName: fileData.motherName ?? '',
                    dob: formattedDob,
                    class: fileData.class ?? '',
                    roll: fileData.roll ?? undefined,
                    certificateDate: fileData.certificateDate ?? '',
                    sessionYear: fileData.sessionYear ?? '',
                    institutionId: fileData.institutionId ?? undefined,
                });
            } else {
                toast({ variant: 'destructive', title: 'ত্রুটি', description: 'ফাইল পাওয়া যায়নি।'});
                router.push('/files');
            }
            setInstitutions(instData);
        } catch (error) {
            toast({ variant: 'destructive', title: 'ত্রুটি', description: 'ডেটা আনতে সমস্যা হয়েছে।'});
        } finally {
            setLoading(false);
        }
    }
    fetchData();
  }, [id, form, router, toast]);

  const handleGenerateData = async () => {
    const dobString = form.getValues('dob');
    const dob = parseDateString(dobString);

    if (!dob) {
      toast({
        variant: 'destructive',
        title: 'ত্রুটি',
        description: 'অনুগ্রহ করে প্রথমে সঠিক ফরম্যাটে জন্ম তারিখ দিন।',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      
      const result = await generateCertificateData({
        age,
        date: today.toISOString(),
      });
      
      form.setValue('class', result.class, { shouldValidate: true });
      form.setValue('roll', Number(result.roll), { shouldValidate: true });
      form.setValue('certificateDate', result.certificateDate, { shouldValidate: true });
      form.setValue('sessionYear', result.sessionYear, { shouldValidate: true });

      toast({
        title: 'তথ্য তৈরি হয়েছে',
        description: 'AI দ্বারা তথ্য সফলভাবে তৈরি করা হয়েছে।',
        className: 'bg-accent text-accent-foreground',
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'AI জেনারেশনে সমস্যা',
        description: 'তথ্য তৈরি করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  async function onSubmit(values: FormSchemaType) {
    setIsSubmitting(true);
    try {
       const parsedDob = parseDateString(values.dob);
       if (!parsedDob) {
           toast({ variant: 'destructive', title: 'ত্রুটি', description: 'সঠিক ফরম্যাটে জন্ম তারিখ দিন।'});
           setIsSubmitting(false);
           return;
       }
       const dobForDb = formatDate(parsedDob, 'yyyy-MM-dd');

      const fileUpdateData: Partial<AppFile> = {
        applicantName: values.name,
        fatherName: values.fatherName,
        motherName: values.motherName,
        dob: dobForDb,
        class: values.class,
        roll: values.roll,
        certificateDate: values.certificateDate,
        sessionYear: values.sessionYear,
        institutionId: values.institutionId,
      };
      await updateFile(id, fileUpdateData);
      
      toast({
        title: 'প্রত্যয়নপত্র আপডেট হয়েছে',
        description: 'প্রত্যয়নপত্র সফলভাবে আপডেট করা হয়েছে।',
        className: 'bg-accent text-accent-foreground',
      });
      router.push('/files');

    } catch (error) {
       toast({
        variant: 'destructive',
        title: 'সংরক্ষণে সমস্যা',
        description: 'প্রত্যয়নপত্র সংরক্ষণ করতে সমস্যা হয়েছে।',
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  const dobValue = form.watch('dob');
  const selectedDateForPicker = parseDateString(dobValue);


  if (loading) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">প্রত্যয়নপত্র এডিট করুন</CardTitle>
        <CardDescription>
          আবেদনকারীর তথ্য পরিবর্তন করুন।
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>নাম</FormLabel>
                    <FormControl>
                      <Input placeholder="আবেদনকারীর সম্পূর্ণ নাম" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fatherName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>পিতার নাম</FormLabel>
                    <FormControl>
                      <Input placeholder="পিতার সম্পূর্ণ নাম" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="motherName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>মাতার নাম</FormLabel>
                    <FormControl>
                      <Input placeholder="মাতার সম্পূর্ণ নাম" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dob"
                render={({ field }) => (
                  <FormItem className="flex flex-col pt-2">
                    <FormLabel>জন্ম তারিখ</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {selectedDateForPicker ? (
                              formatDate(selectedDateForPicker, 'dd/MM/yyyy')
                            ) : (
                              <span>একটি তারিখ বাছাই করুন</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDateForPicker ?? undefined}
                          onSelect={(date) => {
                            if (date) {
                              field.onChange(formatDate(date, 'dd/MM/yyyy'));
                            }
                          }}
                          disabled={(date) =>
                            date > new Date() || date < new Date('1950-01-01')
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <Separator />
            
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-medium">একাডেমিক তথ্য</h3>
                        <p className="text-sm text-muted-foreground">AI দ্বারা এই তথ্য তৈরি করতে পারেন।</p>
                    </div>
                    <Button type="button" onClick={handleGenerateData} disabled={isGenerating}>
                        {isGenerating ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <BrainCircuit className="mr-2 h-4 w-4" />
                        )}
                        AI দিয়ে তৈরি করুন
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                    control={form.control}
                    name="class"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>ক্লাস</FormLabel>
                        <FormControl>
                            <Input placeholder="ক্লাস" {...field} disabled={isGenerating} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="roll"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>রোল</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="রোল নম্বর" {...field} disabled={isGenerating} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="certificateDate"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>প্রত্যয়নের তারিখ</FormLabel>
                        <FormControl>
                            <Input placeholder="YYYY-MM-DD" {...field} disabled={isGenerating} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="sessionYear"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>সেশন সাল</FormLabel>
                        <FormControl>
                            <Input placeholder="YYYY" {...field} disabled={isGenerating} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                     <FormField
                        control={form.control}
                        name="institutionId"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>প্রতিষ্ঠান</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value ?? undefined}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="প্রতিষ্ঠান নির্বাচন করুন" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {institutions.map(inst => (
                                    <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <Button type="submit" size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    আপডেট করুন
                </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
