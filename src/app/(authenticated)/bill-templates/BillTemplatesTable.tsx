'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Image from 'next/image';
import {
  FileText,
  MoreHorizontal,
  PlusCircle,
  Loader2,
  Trash2,
  Edit,
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
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { BillTemplate } from '@/lib/types';
import { updateBillTemplate } from '@/lib/supabase/database';
import { uploadFile } from '@/app/actions/r2-actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { toDate, formatInTimeZone } from 'date-fns-tz';

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
const urlSchema = z.preprocess(
  (arg) => (arg === '' ? undefined : arg),
  z.string().url({ message: "সঠিক URL দিন।" }).optional()
);


const ImagePreview = ({ file, url }: { file?: File | null, url?: string | null }) => {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
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


const EditTemplateForm = ({
  template,
  onSuccess,
  onCancel,
}: {
  template: BillTemplate;
  onSuccess: () => void;
  onCancel: () => void;
}) => {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const templateSchema = z.object({
    name: z.string().min(1, 'টেমপ্লেটের নাম আবশ্যক'),
    logoSelection: z.enum(['upload', 'url']).default('upload'),
    logoUpload: z.instanceof(FileList).optional(),
    logoUrl: urlSchema,
  }).superRefine((data, ctx) => {
      if (data.logoSelection === 'upload') {
          if (!data.logoUpload || data.logoUpload.length === 0) {
              const form = (ctx as any)._form;
              if(!form.getValues('initialLogoUrl')) { // Only require upload if no logo existed before
                  ctx.addIssue({ code: z.ZodIssueCode.custom, message: "লগো ইমেজ আবশ্যক।", path: ['logoUpload'] });
              }
          } else {
              if(data.logoUpload[0].size > MAX_FILE_SIZE) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `ফাইলের আকার 4MB এর বেশি হতে পারবে না।`, path: ['logoUpload'] });
              if(!ACCEPTED_IMAGE_TYPES.includes(data.logoUpload[0].type)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "শুধুমাত্র .jpg, .jpeg, .png and .webp ফরম্যাট সাপোর্ট করবে।", path: ['logoUpload'] });
          }
      } else { // url
          if (!data.logoUrl) {
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: "লগো URL আবশ্যক।", path: ['logoUrl'] });
          }
      }
  });

  type TemplateSchema = z.infer<typeof templateSchema>;

  const form = useForm<TemplateSchema & { initialLogoUrl?: string }>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: template.name,
      logoSelection: template.logoUrl ? 'url' : 'upload',
      logoUrl: template.logoUrl ?? '',
      initialLogoUrl: template.logoUrl,
    },
  });
  
  const handleFileUpload = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    return uploadFile(formData);
  };

  const onSubmit = (values: TemplateSchema) => {
    startTransition(async () => {
      try {
        const templateData: Partial<Omit<BillTemplate, 'id' | 'createdAt'>> = {
            name: values.name,
        };

        if (values.logoSelection === 'url') {
            templateData.logoUrl = values.logoUrl;
        } else if (values.logoUpload && values.logoUpload[0]) {
            templateData.logoUrl = await handleFileUpload(values.logoUpload[0]);
        }

        await updateBillTemplate(template.id, templateData);
        onSuccess();
          toast({
            title: 'সফল হয়েছে',
            description: 'টেমপ্লেট সফলভাবে আপডেট করা হয়েছে।',
            className: 'bg-accent text-accent-foreground',
        });

      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'ত্রুটি',
          description: error.message || `টেমপ্লেট আপডেট করতে সমস্যা হয়েছে।`,
        });
      }
    });
  };
  
  const watchedValues = form.watch();

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <div className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>টেমপ্লেটের নাম</FormLabel>
                  <FormControl>
                    <Input placeholder="যেমন: DESCO, DPDC" {...field} disabled />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormItem>
              <FormLabel>লগো ইমেজ</FormLabel>
              <Tabs defaultValue={form.getValues('logoSelection')} className="w-full" onValueChange={(value) => form.setValue('logoSelection', value as 'upload' | 'url')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload">আপলোড</TabsTrigger>
                  <TabsTrigger value="url">URL</TabsTrigger>
                </TabsList>
                <TabsContent value="upload">
                    <FormControl>
                        <Input type="file" {...form.register('logoUpload')} />
                    </FormControl>
                    <FormMessage>{form.formState.errors.logoUpload?.message?.toString()}</FormMessage>
                    <ImagePreview file={watchedValues.logoUpload?.[0]} url={!watchedValues.logoUpload?.[0] ? template.logoUrl : undefined}/>
                </TabsContent>
                <TabsContent value="url">
                    <FormControl>
                        <Input placeholder="https://example.com/logo.png" {...form.register('logoUrl')} />
                    </FormControl>
                    <FormMessage>{form.formState.errors.logoUrl?.message}</FormMessage>
                    <ImagePreview url={watchedValues.logoUrl} />
                </TabsContent>
              </Tabs>
            </FormItem>
          </div>
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

const BillTemplatesTable = ({ initialTemplates }: { initialTemplates: BillTemplate[]}) => {
  const [editingTemplate, setEditingTemplate] = useState<BillTemplate | null>(null);
  const [isUpdatingStatus, startStatusUpdate] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  
  const handleToggleActive = (template: BillTemplate) => {
    startStatusUpdate(async () => {
      const newStatus = !template.isActive;
      try {
        await updateBillTemplate(template.id, { isActive: newStatus });
        toast({
          title: 'স্ট্যাটাস আপডেট হয়েছে',
          description: `"${template.name}" টেমপ্লেটটি এখন ${newStatus ? 'সক্রিয়' : 'নিষ্ক্রিয়'}।`,
        });
        router.refresh();
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'ত্রুটি',
          description: error.message || 'স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে।',
        });
      }
    });
  }

  const handleSuccess = () => {
    handleDialogClose();
    router.refresh();
  };
  
  const handleDialogClose = () => {
    setEditingTemplate(null);
  };
  
  const isDialogOpen = editingTemplate !== null;
  const activeTemplatesCount = initialTemplates.filter(t => t.isActive).length;

  return (
    <Card>
      <CardHeader>
          <CardTitle>বিল টেমপ্লেটসমূহ পরিচালনা</CardTitle>
          <CardDescription>
            এখানে বিল্ট-ইন বিদ্যুৎ বিলের টেমপ্লেটগুলোর লগো পরিবর্তন করুন এবং সক্রিয় অবস্থা নিয়ন্ত্রণ করুন।
          </CardDescription>
      </CardHeader>
      <CardContent>
        {initialTemplates.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="mx-auto h-12 w-12 mb-4" />
            <p className="font-semibold">কোনো টেমপ্লেট পাওয়া যায়নি।</p>
            <p className="text-sm">অনুগ্রহ করে সিস্টেম অ্যাডমিনের সাথে যোগাযোগ করুন।</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>লগো</TableHead>
                <TableHead>নাম</TableHead>
                <TableHead>স্ট্যাটাস</TableHead>
                <TableHead>সক্রিয়/নিষ্ক্রিয়</TableHead>
                <TableHead>তৈরির তারিখ</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialTemplates.map((temp) => (
                <TableRow key={temp.id}>
                  <TableCell>
                    {temp.logoUrl ? (
                      <Image src={temp.logoUrl} alt={temp.name} width={40} height={40} className="rounded-md object-contain" unoptimized />
                    ) : (
                      <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{temp.name}</TableCell>
                   <TableCell>
                      <Badge variant={temp.isActive ? 'default' : 'secondary'}>
                          {temp.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                  </TableCell>
                  <TableCell>
                      <Switch
                        checked={temp.isActive}
                        onCheckedChange={() => handleToggleActive(temp)}
                        disabled={isUpdatingStatus || (temp.isActive && activeTemplatesCount <= 1)}
                      />
                  </TableCell>
                  <TableCell>{formatInTimeZone(toDate(temp.createdAt), 'Asia/Dhaka', 'dd/MM/yyyy')}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => setEditingTemplate(temp)}>
                      <Edit className="mr-2 h-4 w-4" />
                      এডিট করুন
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
       <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleDialogClose()}>
        <DialogContent className="max-w-md">
            <DialogHeader>
            <DialogTitle>"{editingTemplate?.name}" টেমপ্লেট এডিট করুন</DialogTitle>
            <DialogDescription>
                অনুগ্রহ করে টেমপ্লেটের তথ্য আপডেট করুন।
            </DialogDescription>
            </DialogHeader>
            {editingTemplate && (
              <EditTemplateForm
                  template={editingTemplate}
                  onSuccess={handleSuccess}
                  onCancel={handleDialogClose}
              />
            )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default BillTemplatesTable;
