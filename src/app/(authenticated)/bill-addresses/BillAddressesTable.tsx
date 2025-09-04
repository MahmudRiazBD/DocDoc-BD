'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { MoreHorizontal, PlusCircle, Loader2, Trash2, Edit, MapPin, ChevronsUpDown, Check } from 'lucide-react';
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
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { BillAddress, BillTemplate } from '@/lib/types';
import { addBillAddress, updateBillAddress, deleteBillAddress } from '@/lib/supabase/database';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

const addressSchema = z.object({
  templateId: z.string().min(1, 'বিল টেমপ্লেট আবশ্যক'),
  dagNo: z.string().optional(),
  area: z.string().optional(),
  division: z.string().optional(),
  address: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.templateId === 'desco') {
        if (!data.dagNo) ctx.addIssue({ code: 'custom', message: 'দাগ নং আবশ্যক', path: ['dagNo']});
        if (!data.area) ctx.addIssue({ code: 'custom', message: 'এলাকা আবশ্যক', path: ['area']});
        if (!data.division) ctx.addIssue({ code: 'custom', message: 'বিভাগ আবশ্যক', path: ['division']});
    } else if (data.templateId === 'dpdc') {
        if (!data.address) ctx.addIssue({ code: 'custom', message: 'ঠিকানা আবশ্যক', path: ['address']});
    }
});


type AddressSchema = z.infer<typeof addressSchema>;

const AddressForm = ({
  address,
  templates,
  onSuccess,
  onCancel,
}: {
  address?: BillAddress;
  templates: BillTemplate[];
  onSuccess: () => void;
  onCancel: () => void;
}) => {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const form = useForm<AddressSchema>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      dagNo: address?.dagNo ?? '',
      area: address?.area ?? '',
      division: address?.division ?? '',
      address: address?.address ?? '',
      templateId: address?.templateId ?? '',
    },
  });

  const onSubmit = (values: AddressSchema) => {
    startTransition(async () => {
      try {
        const dataToSave: Partial<BillAddress> = { templateId: values.templateId };
        if (values.templateId === 'desco') {
            dataToSave.dagNo = values.dagNo;
            dataToSave.area = values.area;
            dataToSave.division = values.division;
            dataToSave.address = undefined;
        } else if (values.templateId === 'dpdc') {
            dataToSave.address = values.address;
            dataToSave.dagNo = undefined;
            dataToSave.area = undefined;
            dataToSave.division = undefined;
        }

        if (address) {
          await updateBillAddress(address.id, dataToSave);
          toast({
            title: 'সফলভাবে আপডেট হয়েছে',
            description: 'ঠিকানাটি সফলভাবে আপডেট করা হয়েছে।',
            className: 'bg-accent text-accent-foreground',
          });
        } else {
          await addBillAddress(dataToSave as any);
          toast({
            title: 'সফলভাবে যোগ করা হয়েছে',
            description: 'নতুন ঠিকানা তালিকায় যোগ করা হয়েছে।',
            className: 'bg-accent text-accent-foreground',
          });
        }
        onSuccess();
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'ত্রুটি',
          description: error.message || `ঠিকানা ${address ? 'আপডেট' : 'যোগ'} করতে সমস্যা হয়েছে।`,
        });
      }
    });
  };

  const selectedTemplateId = form.watch('templateId');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
            control={form.control}
            name="templateId"
            render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>বিল টেমপ্লেট</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                            <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                                {field.value ? templates.find((t) => t.id === field.value)?.name : "টেমপ্লেট নির্বাচন করুন"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                                <CommandInput placeholder="টেমপ্লেট খুঁজুন..." />
                                <CommandEmpty>কোনো টেমপ্লেট পাওয়া যায়নি।</CommandEmpty>
                                <CommandList>
                                    <CommandGroup>
                                    {templates.filter(t => t.isActive).map((template) => (
                                        <CommandItem value={template.name} key={template.id} onSelect={() => form.setValue("templateId", template.id)}>
                                        <Check className={cn("mr-2 h-4 w-4", template.id === field.value ? "opacity-100" : "opacity-0")} />
                                        {template.name}
                                        </CommandItem>
                                    ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>
            )}
        />

        {selectedTemplateId === 'desco' && (
            <>
                <FormField
                control={form.control}
                name="dagNo"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>দাগ নং</FormLabel>
                    <FormControl>
                        <Input placeholder="উদাহরণ: 151/235" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="area"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>এলাকা</FormLabel>
                    <FormControl>
                        <Input placeholder="উদাহরণ: Nokuni Talna" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="division"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>বিভাগ</FormLabel>
                    <FormControl>
                        <Input placeholder="উদাহরণ: Khilkhet" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </>
        )}

        {selectedTemplateId === 'dpdc' && (
            <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>ঠিকানা</FormLabel>
                    <FormControl>
                        <Input placeholder="সম্পূর্ণ ঠিকানা লিখুন" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        )}

        <DialogFooter className="pt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onCancel}>
              বাতিল
            </Button>
          </DialogClose>
          <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90" disabled={isPending || !selectedTemplateId}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            সংরক্ষণ করুন
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

export default function BillAddressesTable({ initialAddresses, initialTemplates }: { initialAddresses: BillAddress[], initialTemplates: BillTemplate[] }) {
  const [dialogState, setDialogState] = useState<{ mode: 'add' | 'edit' | null; address: BillAddress | null }>({ mode: null, address: null });
  const [isDeletePending, startDeleteTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  
  const handleSuccess = () => {
    handleDialogClose();
    router.refresh();
  };
  
  const handleDialogClose = () => {
    setDialogState({ mode: null, address: null });
  };
  
  const handleDeleteAddress = (id: string) => {
    startDeleteTransition(async () => {
      try {
        await deleteBillAddress(id);
        toast({
          title: 'সফলভাবে ডিলিট হয়েছে',
          description: 'ঠিকানাটি তালিকা থেকে মুছে ফেলা হয়েছে।',
          variant: 'destructive'
        });
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'ত্রুটি',
          description: error.message || 'ঠিকানা ডিলিট করতে সমস্যা হয়েছে।',
        });
      }
    });
  }

  const isDialogOpen = dialogState.mode !== null;
  const getDialogTitle = () => {
    switch (dialogState.mode) {
      case 'add': return 'নতুন ঠিকানা যোগ করুন';
      case 'edit': return 'ঠিকানা এডিট করুন';
      default: return '';
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>বিদ্যুৎ বিলের ঠিকানা</CardTitle>
          <CardDescription>
            এখানে বিদ্যুৎ বিলের জন্য ব্যবহারযোগ্য ঠিকানা যোগ ও পরিচালনা করুন।
          </CardDescription>
        </div>
        <Button size="sm" className="gap-1 bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setDialogState({ mode: 'add', address: null })}>
          <PlusCircle className="h-4 w-4" />
          নতুন ঠিকানা
        </Button>
      </CardHeader>
      <CardContent>
        {initialAddresses.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <MapPin className="mx-auto h-12 w-12 mb-4" />
            <p className="font-semibold">কোনো ঠিকানা পাওয়া যায়নি।</p>
            <p className="text-sm">নতুন ঠিকানা যোগ করে শুরু করুন।</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ক্রমিক নং</TableHead>
                <TableHead>টেমপ্লেট</TableHead>
                <TableHead>ঠিকানা</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialAddresses.map((addr) => (
                <TableRow key={addr.id}>
                  <TableCell className="font-mono">{addr.serial_no.toString().padStart(4, '0')}</TableCell>
                   <TableCell>
                    {addr.templateId && (
                      <Badge variant={'outline'}>
                        {addr.templateName || addr.templateId}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {addr.templateId === 'dpdc' 
                      ? addr.address 
                      : `দাগ নং- ${addr.dagNo}, ${addr.area}, ${addr.division}`
                    }
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDialogState({ mode: 'edit', address: addr })}>
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
                                        এই কাজটি ফিরিয়ে আনা যাবে না। এটি আপনার ডাটাবেস থেকে ঠিকানাটি স্থায়ীভাবে মুছে ফেলবে।
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>বাতিল</AlertDialogCancel>
                                    <AlertDialogAction
                                        className='bg-destructive hover:bg-destructive/90'
                                        onClick={() => handleDeleteAddress(addr.id)}
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
        <DialogContent className="max-w-md">
            <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
            <DialogDescription>
                অনুগ্রহ করে ঠিকানার সঠিক তথ্য পূরণ করুন।
            </DialogDescription>
            </DialogHeader>
            <AddressForm 
                address={dialogState.address ?? undefined}
                templates={initialTemplates}
                onSuccess={handleSuccess}
                onCancel={handleDialogClose}
            />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
