
'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import {
  FilePlus2,
  Users2,
  Building,
  Users,
  ChevronDown,
  CalendarIcon,
  Loader2,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  getDashboardStats,
  getClients,
  getInstitutions,
  getUsers,
  getBillAddresses,
  getBillTemplates,
} from '@/lib/supabase/database';
import { DashboardStats } from './DashboardStats';
import {
  DashboardStatsData,
  FilterType,
  Client,
  Institution,
  User,
  BillAddress,
  BillTemplate,
} from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  parseISO,
  differenceInDays,
} from 'date-fns';
import { bn } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { AddUserForm } from '../users/UsersTable';
import { AddFileForm } from '../files/FilesPageContent';
import { AddInstitutionForm } from '../institutions/InstitutionsTable';
import { ClientForm } from '../clients/ClientsTable';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStatsData | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  
  const [isDataLoading, setIsDataLoading] = useState({
    clients: false,
    institutions: false,
    users: false,
  });

  // State for forms
  const [clients, setClients] = useState<Client[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // State for dialogs
  const [isAddFileOpen, setAddFileOpen] = useState(false);
  const [isAddClientOpen, setAddClientOpen] = useState(false);
  const [isAddInstitutionOpen, setAddInstitutionOpen] = useState(false);
  const [isAddUserOpen, setAddUserOpen] = useState(false);

  // State for filters
  const [filter, setFilter] = useState<FilterType>('daily');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [specificDate, setSpecificDate] = useState<Date | undefined>();
  const [specificMonth, setSpecificMonth] = useState<Date>(new Date());
  const [specificYear, setSpecificYear] = useState<number>(new Date().getFullYear());


  const fetchFormData = async () => {
    if (clients.length > 0) return; // Don't refetch
    setIsDataLoading(prev => ({...prev, clients: true}));
    try {
      const clientData = await getClients();
      setClients(clientData);
    } catch (error) {
      console.error('Failed to fetch form data', error);
    } finally {
      setIsDataLoading(prev => ({...prev, clients: false}));
    }
  };

  const fetchInstitutions = async () => {
    if (institutions.length > 0) return;
    setIsDataLoading(prev => ({...prev, institutions: true}));
    try {
      const institutionData = await getInstitutions();
      setInstitutions(institutionData);
    } catch (error) {
      console.error('Failed to fetch institutions', error);
    } finally {
      setIsDataLoading(prev => ({...prev, institutions: false}));
    }
  };
  
  const fetchUsers = async () => {
    if (users.length > 0) return;
    setIsDataLoading(prev => ({...prev, users: true}));
    try {
      const userData = await getUsers();
      setUsers(userData);
    } catch (error) {
      console.error('Failed to fetch users', error);
    } finally {
      setIsDataLoading(prev => ({...prev, users: false}));
    }
  };


  const toBengaliNumber = (num: number | string) => {
    const bengaliNumbers = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num)
      .split('')
      .map((digit) => bengaliNumbers[parseInt(digit, 10)] || digit)
      .join('');
  };
  
  const handleFormSuccess = () => {
      setAddFileOpen(false);
      setAddClientOpen(false);
      setAddInstitutionOpen(false);
      setAddUserOpen(false);
      router.refresh();
  }

  const { description, chartTitle, start, end } = useMemo(() => {
    let s, e;
    let desc = '';
    let cTitle = '';
    const now = new Date();

    const formatBengali = (date: Date, fmt: string) =>
      format(date, fmt, { locale: bn });

    switch (filter) {
      case 'daily':
        s = startOfDay(now);
        e = endOfDay(now);
        desc = 'আজকের কার্যক্রমের একটি সারসংক্ষেপ।';
        cTitle = 'সর্বশেষ ৭ দিনের কার্যক্রম';
        break;
      case 'weekly':
        s = startOfWeek(now);
        e = endOfWeek(now);
        desc = 'এই সপ্তাহের কার্যক্রমের একটি সারসংক্ষেপ।';
        cTitle = 'সাপ্তাহিক কার্যক্রম (দৈনিক)';
        break;
      case 'monthly':
        s = startOfMonth(now);
        e = endOfMonth(now);
        desc = 'এই মাসের কার্যক্রমের একটি সারসংক্ষেপ।';
        cTitle = 'মাসিক কার্যক্রম (সাপ্তাহিক)';
        break;
      case 'yearly':
        s = startOfYear(new Date(specificYear, 0, 1));
        e = endOfYear(new Date(specificYear, 11, 31));
        desc = `${toBengaliNumber(specificYear)} সালের কার্যক্রমের একটি সারসংক্ষেপ।`;
        cTitle = `${toBengaliNumber(specificYear)} সালের কার্যক্রম (মাসিক)`;
        break;
      case 'specific_date':
        if (specificDate) {
          s = startOfDay(specificDate);
          e = endOfDay(specificDate);
          desc = `${formatBengali(
            specificDate,
            'dd MMMM, yyyy'
          )} তারিখের কার্যক্রমের সারসংক্ষেপ।`;
          cTitle = 'দৈনিক কার্যক্রম';
        }
        break;
      case 'specific_month':
        s = startOfMonth(specificMonth);
        e = endOfMonth(specificMonth);
        desc = `${formatBengali(
        specificMonth,
        'MMMM, yyyy'
        )} মাসের কার্যক্রমের সারসংক্ষেপ।`;
        cTitle = `${formatBengali(specificMonth, 'MMMM')} মাসের কার্যক্রম (সাপ্তাহিক)`;
        break;
      case 'custom':
        if (dateRange?.from) {
          s = startOfDay(dateRange.from);
          if (dateRange.to) {
            e = endOfDay(dateRange.to);
            desc = `${formatBengali(s, 'dd/MM/yy')} থেকে ${formatBengali(
              e,
              'dd/MM/yy'
            )} পর্যন্ত কার্যক্রমের সারসংক্ষেপ।`;
            const days = differenceInDays(e, s);
            if (days <= 7) cTitle = 'দৈনিক কার্যক্রম';
            else if (days <= 31) cTitle = 'সাপ্তাহিক কার্যক্রম';
            else cTitle = 'মাসিক কার্যক্রম';
          } else {
            e = endOfDay(dateRange.from);
            desc = `${formatBengali(s, 'dd/MM/yy')} তারিখের কার্যক্রমের সারসংক্ষেপ।`;
            cTitle = 'দৈনিক কার্যক্রম';
          }
        }
        break;
      case 'lifetime':
      default:
        desc = 'এখন পর্যন্ত মোট কার্যক্রমের একটি সারসংক্ষেপ।';
        cTitle = 'বাৎসরিক কার্যক্রম';
        break;
    }

    return { description: desc, chartTitle: cTitle, start: s, end: e };
  }, [filter, dateRange, specificDate, specificMonth, specificYear]);

  useEffect(() => {
    startTransition(async () => {
      const data = await getDashboardStats(start, end);
      setStats(data);
    });
  }, [start, end]);

  const renderFilterInput = () => {
    switch (filter) {
      case 'specific_date':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full md:w-[280px] justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {specificDate ? (
                  format(specificDate, 'dd/MM/yyyy')
                ) : (
                  <span>একটি তারিখ বাছাই করুন</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={specificDate}
                onSelect={setSpecificDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );
      case 'custom':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full md:w-[300px] justify-start text-left font-normal',
                  !dateRange && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, 'dd/MM/yy')} -{' '}
                      {format(dateRange.to, 'dd/MM/yy')}
                    </>
                  ) : (
                    format(dateRange.from, 'dd/MM/yyyy')
                  )
                ) : (
                  <span>একটি তারিখ পরিসর বাছাই করুন</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        );
      case 'specific_month':
        return (
          <Input
            type="month"
            value={format(specificMonth, 'yyyy-MM')}
            onChange={(e) => setSpecificMonth(parseISO(e.target.value))}
            className="w-full md:w-[280px]"
          />
        );
      case 'yearly':
        return (
          <Select
            onValueChange={(value) => setSpecificYear(parseInt(value))}
            defaultValue={String(specificYear)}
          >
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="বছর নির্বাচন করুন" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(
                (year) => (
                  <SelectItem key={year} value={String(year)}>
                    {toBengaliNumber(year)}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">ড্যাশবোর্ড</h1>
        <p className="text-muted-foreground">
          স্বাগতম! আপনার সাম্প্রতিক কার্যক্রম এখানে দেখুন।
        </p>
      </div>

      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">দ্রুত পদক্ষেপ</h2>
        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Dialog open={isAddFileOpen} onOpenChange={setAddFileOpen}>
            <DialogTrigger asChild>
              <Card className="transform transition-transform hover:scale-105 hover:shadow-xl cursor-pointer" onClick={fetchFormData}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-medium">
                    নতুন ফাইল যোগ করুন
                  </CardTitle>
                  <div className="p-2 rounded-full bg-blue-50">
                    <FilePlus2 className="h-6 w-6 text-blue-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground h-10">
                    PDF আপলোড করে স্বয়ংক্রিয়ভাবে নতুন ফাইল তৈরি করুন।
                  </p>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>নতুন ফাইল যোগ করুন</DialogTitle>
                <DialogDescription>
                  একটি PDF ফাইল আপলোড করে স্বয়ংক্রিয়ভাবে ফাইল তৈরি করুন।
                </DialogDescription>
              </DialogHeader>
              {isDataLoading.clients ? (
                <div className="flex justify-center items-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <AddFileForm
                  clients={clients}
                  onSuccess={handleFormSuccess}
                  onCancel={() => setAddFileOpen(false)}
                />
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={isAddClientOpen} onOpenChange={setAddClientOpen}>
            <DialogTrigger asChild>
              <Card className="transform transition-transform hover:scale-105 hover:shadow-xl cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-medium">
                    নতুন ক্লায়েন্ট যোগ
                  </CardTitle>
                  <div className="p-2 rounded-full bg-green-50">
                    <Users2 className="h-6 w-6 text-green-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground h-10">
                    আপনার সিস্টেমে একজন নতুন ক্লায়েন্ট যোগ করুন।
                  </p>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>নতুন ক্লায়েন্ট যোগ করুন</DialogTitle>
              </DialogHeader>
              <ClientForm
                onSuccess={handleFormSuccess}
                onCancel={() => setAddClientOpen(false)}
              />
            </DialogContent>
          </Dialog>

          <Dialog
            open={isAddInstitutionOpen}
            onOpenChange={setAddInstitutionOpen}
          >
            <DialogTrigger asChild>
              <Card className="transform transition-transform hover:scale-105 hover:shadow-xl cursor-pointer" onClick={fetchInstitutions}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-medium">
                    নতুন প্রতিষ্ঠান যোগ
                  </CardTitle>
                  <div className="p-2 rounded-full bg-orange-50">
                    <Building className="h-6 w-6 text-orange-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground h-10">
                    প্রত্যয়নপত্রের জন্য একটি নতুন প্রতিষ্ঠান যোগ করুন।
                  </p>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>নতুন প্রতিষ্ঠান যোগ করুন</DialogTitle>
                <DialogDescription>
                  অনুগ্রহ করে প্রতিষ্ঠানের সঠিক তথ্য পূরণ করুন।
                </DialogDescription>
              </DialogHeader>
              <AddInstitutionForm
                onSuccess={handleFormSuccess}
                onCancel={() => setAddInstitutionOpen(false)}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={isAddUserOpen} onOpenChange={setAddUserOpen}>
            <DialogTrigger asChild>
              <Card className="transform transition-transform hover:scale-105 hover:shadow-xl cursor-pointer" onClick={fetchUsers}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-medium">
                    নতুন ব্যবহারকারী যোগ
                  </CardTitle>
                  <div className="p-2 rounded-full bg-purple-50">
                    <Users className="h-6 w-6 text-purple-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground h-10">
                    সিস্টেমের জন্য নতুন এডমিন বা স্টাফ যোগ করুন।
                  </p>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>নতুন ব্যবহারকারী যোগ করুন</DialogTitle>
                <DialogDescription>
                  নতুন ব্যবহারকারীর তথ্য পূরণ করুন। পাসওয়ার্ড অবশ্যই মনে রাখবেন।
                </DialogDescription>
              </DialogHeader>
              <AddUserForm setOpen={setAddUserOpen} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div>
        <div className="flex flex-col md:flex-row items-center gap-4 py-4 px-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full md:w-auto">
                ফিল্টার:{' '}
                {filter === 'lifetime'
                  ? 'লাইফটাইম'
                  : filter === 'daily'
                    ? 'দৈনিক'
                    : filter === 'weekly'
                      ? 'সাপ্তাহিক'
                      : filter === 'monthly'
                        ? 'মাসিক'
                        : filter === 'yearly'
                          ? 'বাৎসরিক'
                          : filter === 'specific_date'
                            ? 'নির্দিষ্ট দিন'
                            : filter === 'specific_month'
                              ? 'নির্দিষ্ট মাস'
                              : 'কাস্টম রেঞ্জ'}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>সময়সীমা অনুযায়ী ফিল্টার</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={filter}
                onValueChange={(v) => setFilter(v as FilterType)}
              >
                <DropdownMenuRadioItem value="lifetime">
                  লাইফটাইম
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="daily">দৈনিক</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="weekly">
                  সাপ্তাহিক
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="monthly">মাসিক</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="yearly">
                  বাৎসরিক
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="specific_date">
                  নির্দিষ্ট দিন
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="specific_month">
                  নির্দিষ্ট মাস
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="custom">
                  কাস্টম রেঞ্জ
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          {renderFilterInput()}
        </div>
        <div className="mt-4">
          <DashboardStats
            stats={stats}
            isLoading={isPending}
            description={description}
            chartTitle={chartTitle}
          />
        </div>
      </div>
    </div>
  );
}
