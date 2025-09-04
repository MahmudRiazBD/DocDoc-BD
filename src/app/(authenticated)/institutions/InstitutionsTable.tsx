'use client';

import React, { useState, useTransition } from 'react';
import Image from 'next/image';
import {
  Building,
  MoreHorizontal,
  PlusCircle,
  Loader2,
  Trash2,
  Edit,
  Clipboard,
} from 'lucide-react';
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
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
  } from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Institution } from '@/lib/types';
import { addInstitution, updateInstitution, deleteInstitution } from '@/lib/supabase/database';
import { uploadFile } from '@/app/actions/r2-actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from 'next/navigation';

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
const urlSchema = z.preprocess(
  (arg) => (arg === '' ? undefined : arg),
  z.string().url({ message: "সঠিক URL দিন।" }).optional()
);

const defaultCertificateText = `এই মর্মে প্রত্যয়ন করা যাইতেছে যে, {{name}}, পিতা: {{fatherName}}, মাতা: {{motherName}}, অত্র প্রতিষ্ঠানের একজন নিয়মিত শিক্ষার্থী। তাহার জন্ম তারিখ {{dob}}। সে {{sessionYear}} শিক্ষাবর্ষে {{class}} শ্রেণীতে অধ্যয়নরত ছিল। তাহার ক্লাস রোল নম্বর ছিল {{roll}}।

আমার জানামতে সে একজন চরিত্রবান, পরিশ্রমী ও মেধাবী শিক্ষার্থী। তাহার নৈতিক চরিত্র ভালো। সে রাষ্ট্র বা সমাজ বিরোধী কোনো কার্যকলাপের সাথে জড়িত নয়।

আমি তাহার জীবনের সর্বাঙ্গীণ উন্নতি ও মঙ্গল কামনা করি।`;


const ImagePreview = ({ file, url }: { file?: File | null, url?: string | null }) => {
  const [src, setSrc] = React.useState<string | null>(null);

  React.useEffect(() => {
    let objectUrl: string | null = null;
    if (file) {
      objectUrl = URL.createObjectURL(file);
      setSrc(objectUrl);
    } else if (url) {
      setSrc(url);
    } else {
      setSrc(null);
    }

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [file, url]);


  if (!src) return null;

  return (
    <div className="mt-2">
      <Image
        src={src}
        alt="Preview"
        width={80}
        height={80}
        className="rounded-md object-cover"
        unoptimized // for external URLs
      />
    </div>
  );
};

export const AddInstitutionForm = ({
  institution,
  onSuccess,
  onCancel,
}: {
  institution?: Institution;
  onSuccess: () => void;
  onCancel: () => void;
}) => {
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  // Define the schema inside the component to avoid server-side execution of FileList
  const institutionSchema = z.object({
    name: z.string().min(1, 'প্রতিষ্ঠানের নাম আবশ্যক'),
    eiin: z.string().length(6, 'EIIN অবশ্যই ৬ সংখ্যার হতে হবে'),
    address: z.string().min(1, 'ঠিকানা আবশ্যক'),
    phone: z.string().min(1, 'ফোন নম্বর আবশ্যক'),
    email: z.string().email('সঠিক ইমেইল দিন'),
    website: z.preprocess((arg) => arg === '' ? undefined : arg, z.string().url('সঠিক ওয়েবসাইট URL দিন').optional()),
    collegeCode: z.string().optional(),
    schoolCode: z.string().optional(),
    certificateText: z.string().min(1, 'প্রত্যয়নের বিবরণ আবশ্যক'),
    
    logoSelection: z.enum(['upload', 'url']).default('upload'),
    logoUpload: z.instanceof(FileList).optional(),
    logoUrl: urlSchema,

    signature1Selection: z.enum(['upload', 'url']).default('upload'),
    signature1Upload: z.instanceof(FileList).optional(),
    signature1Url: urlSchema,

    signature2Selection: z.enum(['upload', 'url']).default('upload'),
    signature2Upload: z.instanceof(FileList).optional(),
    signature2Url: urlSchema,
  }).superRefine((data, ctx) => {
      // Logo validation
      if (data.logoSelection === 'upload') {
          if (!data.logoUpload || data.logoUpload.length === 0) {
              const form = (ctx as any)._form;
              if(!form.getValues('id') && !institution) { // only for new institutions
                  ctx.addIssue({ code: z.ZodIssueCode.custom, message: "লগো ইমেজ আবশ্যক।", path: ['logoUpload'] });
              }
          } else {
             if (data.logoUpload[0].size > MAX_FILE_SIZE) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `ফাইলের আকার 4MB এর বেশি হতে পারবে না।`, path: ['logoUpload'] });
             if (!ACCEPTED_IMAGE_TYPES.includes(data.logoUpload[0].type)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "শুধুমাত্র .jpg, .jpeg, .png and .webp ফরম্যাট সাপোর্ট করবে।", path: ['logoUpload'] });
          }
      } else { 
          if (!data.logoUrl) {
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: "লগো URL আবশ্যক।", path: ['logoUrl'] });
          }
      }

      // Signature 1 validation
      if (data.signature1Selection === 'upload') {
          if (!data.signature1Upload || data.signature1Upload.length === 0) {
              const form = (ctx as any)._form;
              if(!form.getValues('id') && !institution) { // only for new institutions
                  ctx.addIssue({ code: z.ZodIssueCode.custom, message: "সাইন/সীল ইমেজ-১ আবশ্যক।", path: ['signature1Upload'] });
              }
          } else {
            if (data.signature1Upload[0].size > MAX_FILE_SIZE) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `ফাইলের আকার 4MB এর বেশি হতে পারবে না।`, path: ['signature1Upload'] });
            if (!ACCEPTED_IMAGE_TYPES.includes(data.signature1Upload[0].type)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "শুধুমাত্র .jpg, .jpeg, .png and .webp ফরম্যাট সাপোর্ট করবে।", path: ['signature1Upload'] });
          }
      } else { 
          if (!data.signature1Url) {
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: "সাইন/সীল URL-১ আবশ্যক।", path: ['signature1Url'] });
          }
      }

      // Signature 2 validation
      if (data.signature2Selection === 'upload' && data.signature2Upload && data.signature2Upload.length > 0) {
          if (data.signature2Upload[0].size > MAX_FILE_SIZE) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `ফাইলের আকার 4MB এর বেশি হতে পারবে না।`, path: ['signature2Upload'] });
          if (!ACCEPTED_IMAGE_TYPES.includes(data.signature2Upload[0].type)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "শুধুমাত্র .jpg, .jpeg, .png and .webp ফরম্যাট সাপোর্ট করবে।", path: ['signature2Upload'] });
      }
  });

  type InstitutionSchema = z.infer<typeof institutionSchema>;

  const form = useForm<InstitutionSchema>({
    resolver: zodResolver(institutionSchema),
    defaultValues: {
      name: institution?.name ?? '',
      eiin: institution?.eiin ?? '',
      address: institution?.address ?? '',
      phone: institution?.phone ?? '',
      email: institution?.email ?? '',
      website: institution?.website ?? '',
      collegeCode: institution?.collegeCode ?? '',
      schoolCode: institution?.schoolCode ?? '',
      certificateText: institution?.certificateText ?? defaultCertificateText,
      logoSelection: institution?.logoUrl ? 'url' : 'upload',
      logoUrl: institution?.logoUrl ?? '',
      signature1Selection: institution?.signatureUrl1 ? 'url' : 'upload',
      signature1Url: institution?.signatureUrl1 ?? '',
      signature2Selection: institution?.signatureUrl2 ? 'url' : 'upload',
      signature2Url: institution?.signatureUrl2 ?? '',
    },
  });
  
  const handleFileUpload = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    return uploadFile(formData);
  };

  const onSubmit = (values: InstitutionSchema) => {
    startTransition(async () => {
      try {
        const institutionData: Partial<Omit<Institution, 'id' | 'createdAt' | 'serial_no'>> = {
            name: values.name,
            eiin: values.eiin,
            address: values.address,
            phone: values.phone,
            email: values.email,
            website: values.website,
            collegeCode: values.collegeCode,
            schoolCode: values.schoolCode,
            certificateText: values.certificateText,
        };

        // Logo
        if (values.logoSelection === 'url') {
            institutionData.logoUrl = values.logoUrl;
        } else if (values.logoUpload && values.logoUpload[0]) {
            institutionData.logoUrl = await handleFileUpload(values.logoUpload[0]);
        }

        // Signature 1
        if (values.signature1Selection === 'url') {
            institutionData.signatureUrl1 = values.signature1Url;
        } else if (values.signature1Upload && values.signature1Upload[0]) {
            institutionData.signatureUrl1 = await handleFileUpload(values.signature1Upload[0]);
        }
        
        // Signature 2
        if (values.signature2Selection === 'url') {
            institutionData.signatureUrl2 = values.signature2Url;
        } else if (values.signature2Upload && values.signature2Upload[0]) {
            institutionData.signatureUrl2 = await handleFileUpload(values.signature2Upload[0]);
        }


        if(institution){
            await updateInstitution(institution.id, institutionData);
             toast({
                title: 'সফল হয়েছে',
                description: 'প্রতিষ্ঠান সফলভাবে আপডেট করা হয়েছে।',
                className: 'bg-accent text-accent-foreground',
            });

        } else {
            await addInstitution(institutionData as Omit<Institution, 'id' | 'createdAt' | 'serial_no'>);
            toast({
              title: 'সফল হয়েছে',
              description: 'নতুন প্রতিষ্ঠান সফলভাবে যোগ করা হয়েছে।',
              className: 'bg-accent text-accent-foreground',
            });
        }
        onSuccess();
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'ত্রুটি',
          description: error.message || `প্রতিষ্ঠান ${institution ? 'আপডেট' : 'যোগ'} করতে সমস্যা হয়েছে।`,
        });
      }
    });
  };
  
  const watchedValues = form.watch();
  const logoFileInputRef = React.useRef<HTMLInputElement>(null);
  const signature1FileInputRef = React.useRef<HTMLInputElement>(null);
  const signature2FileInputRef = React.useRef<HTMLInputElement>(null);


  const variables = [
    { label: 'শিক্ষার্থীর নাম', value: '{{name}}' },
    { label: 'পিতার নাম', value: '{{fatherName}}' },
    { label: 'মাতার নাম', value: '{{motherName}}' },
    { label: 'জন্ম তারিখ', value: '{{dob}}' },
    { label: 'ক্লাস', value: '{{class}}' },
    { label: 'রোল', value: '{{roll}}' },
    { label: 'সেশন সাল', value: '{{sessionYear}}' },
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
        title: 'কপি হয়েছে',
        description: `"${text}" ক্লিপবোর্ডে কপি করা হয়েছে।`,
    });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <ScrollArea className="h-[60vh] pr-6">
          <div className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>প্রতিষ্ঠানের নাম</FormLabel>
                  <FormControl>
                    <Input placeholder="প্রতিষ্ঠানের পুরো নাম" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="eiin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>EIIN নম্বর</FormLabel>
                  <FormControl>
                    <Input placeholder="123456" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ঠিকানা</FormLabel>
                  <FormControl>
                    <Input placeholder="প্রতিষ্ঠানের ঠিকানা" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ফোন নম্বর</FormLabel>
                  <FormControl>
                    <Input placeholder="যোগাযোগের নম্বর" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ইমেইল</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="example@institution.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ওয়েবসাইট (ঐচ্ছিক)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="collegeCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>কলেজ কোড (ঐচ্ছিক)</FormLabel>
                  <FormControl>
                    <Input placeholder="1234" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="schoolCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>বিদ্যালয় কোড (ঐচ্ছিক)</FormLabel>
                  <FormControl>
                    <Input placeholder="5678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="certificateText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>প্রত্যয়নের বিবরণ</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="প্রত্যয়নপত্রের মূল লেখা এখানে লিখুন..."
                      className="min-h-[200px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    প্রয়োজনীয় ভেরিয়েবল ব্যবহার করে ডাইনামিক প্রত্যয়নপত্র তৈরি করুন।
                  </FormDescription>
                   <Card className="bg-muted/50">
                    <CardHeader className="p-3">
                        <CardTitle className="text-sm">ব্যবহারযোগ্য ভেরিয়েবল</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 grid grid-cols-2 md:grid-cols-3 gap-2">
                        {variables.map(v => (
                            <div key={v.value} className="flex items-center justify-between text-xs p-1.5 rounded bg-background border">
                                <span>{v.label}</span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => copyToClipboard(v.value)}
                                >
                                    <Clipboard className="h-3 w-3" />
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                   </Card>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Logo Field */}
            <FormItem>
              <FormLabel>লগো ইমেজ</FormLabel>
              <Tabs defaultValue={form.getValues('logoSelection')} className="w-full" onValueChange={(value) => form.setValue('logoSelection', value as 'upload' | 'url')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload">আপলোড</TabsTrigger>
                  <TabsTrigger value="url">URL</TabsTrigger>
                </TabsList>
                <TabsContent value="upload">
                    <FormField
                      control={form.control}
                      name="logoUpload"
                      render={({ field }) => (
                          <FormItem>
                              <FormControl>
                                <Input type="file" {...form.register('logoUpload')} ref={logoFileInputRef} />
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                      )}
                    />
                    <ImagePreview file={watchedValues.logoUpload?.[0]} url={!watchedValues.logoUpload?.[0] ? institution?.logoUrl : undefined} />
                </TabsContent>
                <TabsContent value="url">
                    <FormField
                      control={form.control}
                      name="logoUrl"
                      render={({ field }) => (
                        <FormItem>
                            <FormControl>
                              <Input placeholder="https://example.com/logo.png" {...field} />
                            </FormControl>
                            <FormMessage/>
                        </FormItem>
                      )}
                    />
                    <ImagePreview url={watchedValues.logoUrl} />
                </TabsContent>
              </Tabs>
            </FormItem>

            {/* Signature 1 Field */}
            <FormItem>
              <FormLabel>সাইন/সীল ইমেজ-১</FormLabel>
              <Tabs defaultValue={form.getValues('signature1Selection')} className="w-full" onValueChange={(value) => form.setValue('signature1Selection', value as 'upload' | 'url')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload">আপলোড</TabsTrigger>
                  <TabsTrigger value="url">URL</TabsTrigger>
                </TabsList>
                <TabsContent value="upload">
                    <FormField
                      control={form.control}
                      name="signature1Upload"
                      render={({ field }) => (
                          <FormItem>
                              <FormControl>
                                <Input type="file" {...form.register('signature1Upload')} ref={signature1FileInputRef} />
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                      )}
                    />
                    <ImagePreview file={watchedValues.signature1Upload?.[0]} url={!watchedValues.signature1Upload?.[0] ? institution?.signatureUrl1 : undefined} />
                </TabsContent>
                <TabsContent value="url">
                    <FormField
                      control={form.control}
                      name="signature1Url"
                      render={({ field }) => (
                          <FormItem>
                              <FormControl>
                                <Input placeholder="https://example.com/signature1.png" {...field} />
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                      )}
                    />
                    <ImagePreview url={watchedValues.signature1Url} />
                </TabsContent>
              </Tabs>
            </FormItem>

            {/* Signature 2 Field */}
            <FormItem>
              <FormLabel>সাইন/সীল ইমেজ-২ (ঐচ্ছিক)</FormLabel>
              <Tabs defaultValue={form.getValues('signature2Selection')} className="w-full" onValueChange={(value) => form.setValue('signature2Selection', value as 'upload' | 'url')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload">আপলোড</TabsTrigger>
                  <TabsTrigger value="url">URL</TabsTrigger>
                </TabsList>
                <TabsContent value="upload">
                    <FormField
                      control={form.control}
                      name="signature2Upload"
                      render={({ field }) => (
                          <FormItem>
                              <FormControl>
                                <Input type="file" {...form.register('signature2Upload')} ref={signature2FileInputRef} />
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                      )}
                    />
                    <ImagePreview file={watchedValues.signature2Upload?.[0]} url={!watchedValues.signature2Upload?.[0] ? institution?.signatureUrl2 : undefined} />
                </TabsContent>
                <TabsContent value="url">
                    <FormField
                      control={form.control}
                      name="signature2Url"
                      render={({ field }) => (
                          <FormItem>
                              <FormControl>
                                <Input placeholder="https://example.com/signature2.png" {...field} />
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                      )}
                    />
                    <ImagePreview url={watchedValues.signature2Url} />
                </TabsContent>
              </Tabs>
            </FormItem>

          </div>
        </ScrollArea>
        <DialogFooter className="pt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onCancel}>
                বাতিল
            </Button>
          </DialogClose>
          <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90" disabled={isPending}>
            {isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            সংরক্ষণ করুন
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

const InstitutionsTable = ({ initialInstitutions }: { initialInstitutions: Institution[] }) => {
  const [dialogState, setDialogState] = React.useState<{ mode: 'add' | 'edit' | null; institution: Institution | null }>({ mode: null, institution: null });
  const [isDeletePending, startDeleteTransition] = React.useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const handleSuccess = () => {
    handleDialogClose();
    router.refresh();
  };
  
  const handleDialogClose = () => {
    setDialogState({ mode: null, institution: null });
  };
  
  const handleDeleteInstitution = (id: string) => {
    startDeleteTransition(async () => {
      try {
        await deleteInstitution(id);
        toast({
          title: 'সফলভাবে ডিলিট হয়েছে',
          description: 'প্রতিষ্ঠানটি তালিকা থেকে মুছে ফেলা হয়েছে।',
          variant: 'destructive'
        });
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'ত্রুটি',
          description: error.message || 'প্রতিষ্ঠান ডিলিট করতে সমস্যা হয়েছে।',
        });
      }
    });
  }

  const isDialogOpen = dialogState.mode !== null;
  const getDialogTitle = () => {
    switch (dialogState.mode) {
      case 'add': return 'নতুন প্রতিষ্ঠান যোগ করুন';
      case 'edit': return 'প্রতিষ্ঠান এডিট করুন';
      default: return '';
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>প্রতিষ্ঠানের তালিকা</CardTitle>
          <CardDescription>
            এখানে সকল প্রতিষ্ঠান দেখুন ও পরিচালনা করুন।
          </CardDescription>
        </div>
        <Button size="sm" className="gap-1 bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setDialogState({ mode: 'add', institution: null })}>
          <PlusCircle className="h-4 w-4" />
          নতুন প্রতিষ্ঠান
        </Button>
      </CardHeader>
      <CardContent>
        {initialInstitutions.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Building className="mx-auto h-12 w-12 mb-4" />
            <p className="font-semibold">কোনো প্রতিষ্ঠান পাওয়া যায়নি।</p>
            <p className="text-sm">নতুন প্রতিষ্ঠান যোগ করে শুরু করুন।</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ক্রমিক নং</TableHead>
                <TableHead>লগো</TableHead>
                <TableHead>নাম</TableHead>
                <TableHead>EIIN</TableHead>
                <TableHead>ঠিকানা</TableHead>
                <TableHead>ফোন</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialInstitutions.map((inst) => (
                <TableRow key={inst.id}>
                  <TableCell className="font-mono">{inst.serial_no.toString().padStart(4, '0')}</TableCell>
                  <TableCell>
                    {inst.logoUrl ? (
                      <Image src={inst.logoUrl} alt={inst.name} width={40} height={40} className="rounded-full" unoptimized />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <Building className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{inst.name}</TableCell>
                  <TableCell>{inst.eiin}</TableCell>
                  <TableCell>{inst.address}</TableCell>
                  <TableCell>{inst.phone}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDialogState({ mode: 'edit', institution: inst })}>
                            <Edit className="mr-2 h-4 w-4" />
                            এডিট করুন
                        </DropdownMenuItem>
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
                                        এই কাজটি ফিরিয়ে আনা যাবে না। এটি আপনার ডাটাবেস থেকে প্রতিষ্ঠানটিকে স্থায়ীভাবে মুছে ফেলবে।
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>বাতিল</AlertDialogCancel>
                                    <AlertDialogAction
                                        className='bg-destructive hover:bg-destructive/90'
                                        onClick={() => handleDeleteInstitution(inst.id)}
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
       <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleDialogClose()}>
        <DialogContent className="max-w-2xl">
            <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
            <DialogDescription>
                অনুগ্রহ করে প্রতিষ্ঠানের সঠিক তথ্য পূরণ করুন।
            </DialogDescription>
            </DialogHeader>
            <AddInstitutionForm 
                institution={dialogState.institution ?? undefined}
                onSuccess={handleSuccess}
                onCancel={handleDialogClose}
            />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
export default InstitutionsTable;
