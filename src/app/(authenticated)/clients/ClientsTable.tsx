'use client';

import React, { useState, useTransition, useMemo } from 'react';
import { MoreHorizontal, UserPlus, Edit, Loader2, Trash2, CalendarIcon, ChevronDown, User, FileText } from 'lucide-react';
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
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Client } from '@/lib/types';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO } from 'date-fns';
import { toDate, formatInTimeZone } from 'date-fns-tz';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { addClient, updateClient, deleteClient } from '@/lib/supabase/database';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

const clientSchema = z.object({
  name: z.string().min(1, 'ক্লায়েন্টের নাম আবশ্যক'),
});

type ClientSchema = z.infer<typeof clientSchema>;
type ClientWithFileCount = Client & { fileCount: number };
type FilterType = 'lifetime' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom' | 'specific_date' | 'specific_month';


export const ClientForm = ({
  client,
  onSuccess,
  onCancel,
}: {
  client?: ClientWithFileCount;
  onSuccess: () => void;
  onCancel: () => void;
}) => {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const form = useForm<ClientSchema>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: client?.name ?? '',
    },
  });

  const onSubmit = (values: ClientSchema) => {
    startTransition(async () => {
      try {
        if (client) {
          await updateClient(client.id, values);
          toast({
            title: 'সফলভাবে আপডেট হয়েছে',
            description: 'ক্লায়েন্টের তথ্য আপডেট করা হয়েছে।',
            className: 'bg-accent text-accent-foreground',
          });
        } else {
          await addClient(values);
          toast({
            title: 'সফলভাবে যোগ করা হয়েছে',
            description: 'নতুন ক্লায়েন্ট তালিকায় যোগ করা হয়েছে।',
            className: 'bg-accent text-accent-foreground',
          });
        }
        onSuccess();
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'ত্রুটি',
          description: error.message || `ক্লায়েন্ট ${client ? 'আপডেট' : 'যোগ'} করতে সমস্যা হয়েছে।`,
        });
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ক্লায়েন্টের নাম</FormLabel>
              <FormControl>
                <Input placeholder="সম্পূর্ণ নাম লিখুন" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onCancel}>
              বাতিল
            </Button>
          </DialogClose>
          <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            সংরক্ষণ করুন
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};


export default function ClientsTable({ initialClients }: { initialClients: ClientWithFileCount[] }) {
  const { toast } = useToast();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const router = useRouter();

  const [dialogState, setDialogState] = useState<{
    mode: 'add' | 'edit' | null;
    client: ClientWithFileCount | null;
  }>({ mode: null, client: null });
  
  const [filter, setFilter] = useState<FilterType>('lifetime');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [specificDate, setSpecificDate] = useState<Date | undefined>();
  const [specificMonth, setSpecificMonth] = useState<Date>(new Date());
  const [specificYear, setSpecificYear] = useState<number>(new Date().getFullYear());
  

  const filteredClients = useMemo(() => {
    if (filter === 'lifetime') return initialClients;
    
    let start, end;
    const now = new Date();

    switch (filter) {
        case 'daily':
            start = startOfDay(now);
            end = endOfDay(now);
            break;
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
            if (!specificDate) return initialClients;
            start = startOfDay(specificDate);
            end = endOfDay(specificDate);
            break;
        case 'specific_month':
            start = startOfMonth(specificMonth);
            end = endOfMonth(specificMonth);
            break;
        case 'custom':
            if (!dateRange?.from || !dateRange?.to) return initialClients;
            start = startOfDay(dateRange.from);
            end = endOfDay(dateRange.to);
            break;
        default:
            return initialClients;
    }
    
    if(start && end) {
      return initialClients.filter(c => {
          const clientDate = toDate(c.createdAt, { timeZone: 'Asia/Dhaka' });
          return clientDate >= start && clientDate <= end;
      });
    }

    return initialClients;

  }, [initialClients, filter, dateRange, specificDate, specificMonth, specificYear]);

  const handleDialogClose = () => {
    setDialogState({ mode: null, client: null });
  };
  
  const handleSuccess = () => {
    handleDialogClose();
    router.refresh();
  };

  const handleDeleteClient = (id: string) => {
    startDeleteTransition(async () => {
        try {
            await deleteClient(id);
            toast({
                title: 'সফলভাবে ডিলিট হয়েছে',
                description: 'ক্লায়েন্টকে তালিকা থেকে মুছে ফেলা হয়েছে।',
                variant: 'destructive'
            });
            router.refresh();
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'ত্রুটি',
                description: error.message || 'ক্লায়েন্ট ডিলিট করতে সমস্যা হয়েছে।',
            });
        }
    });
  }

  const isDialogOpen = dialogState.mode !== null;
  const getDialogTitle = () => {
    switch (dialogState.mode) {
      case 'add': return 'নতুন ক্লায়েন্ট যোগ করুন';
      case 'edit': return 'ক্লায়েন্ট এডিট করুন';
      default: return '';
    }
  }
  
  const renderFilterInput = () => {
    switch (filter) {
        case 'specific_date':
            return (
                <Popover>
                    <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full md:w-[280px] justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {specificDate ? formatInTimeZone(specificDate, 'Asia/Dhaka', 'dd/MM/yyyy') : <span>একটি তারিখ বাছাই করুন</span>}
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
                        {dateRange?.from ? (dateRange.to ? <>{formatInTimeZone(dateRange.from, 'Asia/Dhaka', "dd/MM/yy")} - {formatInTimeZone(dateRange.to, 'Asia/Dhaka', "dd/MM/yy")}</> : formatInTimeZone(dateRange.from, 'Asia/Dhaka', "dd/MM/yyyy")) : <span>একটি তারিখ পরিসর বাছাই করুন</span>}
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
                    value={formatInTimeZone(specificMonth, 'Asia/Dhaka', 'yyyy-MM')}
                    onChange={(e) => setSpecificMonth(parseISO(e.target.value))}
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


  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>ক্লায়েন্ট তালিকা</CardTitle>
          <CardDescription>এখানে সকল ক্লায়েন্ট দেখুন ও পরিচালনা করুন।</CardDescription>
        </div>
        <Button size="sm" className="gap-1 bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setDialogState({ mode: 'add', client: null })}>
          <UserPlus className="h-4 w-4" />
          নতুন ক্লায়েন্ট
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 py-4 px-1">
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className='w-full md:w-auto justify-between'>
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
        {filteredClients.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p>এই সময়সীমার মধ্যে কোনো ক্লায়েন্ট পাওয়া যায়নি।</p>
            <p className="text-sm">অন্য একটি ফিল্টার চেষ্টা করুন অথবা নতুন ক্লায়েন্ট যোগ করুন।</p>
          </div>
        ) : (
          <>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>নাম</TableHead>
                    <TableHead>মোট ফাইল</TableHead>
                    <TableHead>যোগদানের তারিখ</TableHead>
                    <TableHead>
                    <span className="sr-only">Actions</span>
                    </TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {filteredClients.map((client) => (
                    <TableRow key={client.id}>
                    <TableCell className="font-medium">
                        {client.name}
                    </TableCell>
                    <TableCell>
                        <Badge variant="secondary">{client.fileCount}</Badge>
                    </TableCell>
                    <TableCell>{client.createdAt ? formatInTimeZone(toDate(client.createdAt), 'Asia/Dhaka', 'dd/MM/yyyy') : ''}</TableCell>
                    <TableCell>
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setDialogState({ mode: 'edit', client })}>
                            <Edit className="mr-2 h-4 w-4" />
                            এডিট
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
                                            এই কাজটি ফিরিয়ে আনা যাবে না। এটি আপনার ডাটাবেস থেকে ক্লায়েন্টকে স্থায়ীভাবে মুছে ফেলবে।
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>বাতিল</AlertDialogCancel>
                                        <AlertDialogAction
                                            className='bg-destructive hover:bg-destructive/90'
                                            onClick={() => handleDeleteClient(client.id)}
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
          </div>

          {/* Mobile Card View */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
            {filteredClients.map((client) => (
                <Card key={client.id}>
                    <CardHeader className="flex flex-row items-start justify-between pb-2">
                         <div>
                            <CardTitle className="text-base">{client.name}</CardTitle>
                             <CardDescription>যোগদান: {client.createdAt ? formatInTimeZone(toDate(client.createdAt), 'Asia/Dhaka', 'dd/MM/yyyy') : ''}</CardDescription>
                        </div>
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button aria-haspopup="true" size="icon" variant="ghost" className='-mt-2 -mr-2 h-8 w-8'>
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Toggle menu</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setDialogState({ mode: 'edit', client })}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    এডিট
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
                                                এই কাজটি ফিরিয়ে আনা যাবে না। এটি আপনার ডাটাবেস থেকে ক্লায়েন্টকে স্থায়ীভাবে মুছে ফেলবে।
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>বাতিল</AlertDialogCancel>
                                            <AlertDialogAction
                                                className='bg-destructive hover:bg-destructive/90'
                                                onClick={() => handleDeleteClient(client.id)}
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
                    </CardHeader>
                    <CardContent className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span>মোট ফাইল:</span>
                        <Badge variant="secondary">{client.fileCount}</Badge>
                    </CardContent>
                </Card>
            ))}
          </div>
          </>
        )}
      </CardContent>
      
      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleDialogClose()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{getDialogTitle()}</DialogTitle>
            </DialogHeader>
            {(dialogState.mode === 'add' || dialogState.mode === 'edit') && (
                <ClientForm 
                    client={dialogState.client ?? undefined}
                    onSuccess={handleSuccess}
                    onCancel={handleDialogClose}
                />
            )}
          </DialogContent>
        </Dialog>
    </Card>
  );
}
