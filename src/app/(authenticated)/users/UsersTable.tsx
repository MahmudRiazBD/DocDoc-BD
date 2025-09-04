'use client';

import React, { useState } from 'react';
import { MoreHorizontal, Trash2, UserPlus, Loader2 } from 'lucide-react';
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { User } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { toDate, formatInTimeZone } from 'date-fns-tz';
import { useToast } from '@/hooks/use-toast';
import { updateUserRole, deleteUser } from '@/lib/supabase/database';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createNewUser } from '@/app/actions/user-actions';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';

const userSchema = z.object({
  name: z.string().min(1, 'নাম আবশ্যক'),
  email: z.string().email('সঠিক ইমেইল দিন'),
  password: z.string().min(6, 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে'),
  role: z.enum(['admin', 'staff'], {
    errorMap: () => ({ message: 'একটি ভূমিকা নির্বাচন করুন' }),
  }),
});

type UserSchema = z.infer<typeof userSchema>;

export const AddUserForm = ({
  setOpen,
}: {
  setOpen: (open: boolean) => void;
}) => {
  const { toast } = useToast();
  const router = useRouter();
  const form = useForm<UserSchema>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'staff',
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (values: UserSchema) => {
    try {
      const result = await createNewUser(values);
      if (result.error) {
        throw new Error(result.error);
      }
      toast({
        title: 'ব্যবহারকারী যোগ হয়েছে',
        description: 'নতুন ব্যবহারকারী সফলভাবে যোগ করা হয়েছে।',
        className: 'bg-accent text-accent-foreground',
      });
      setOpen(false);
      form.reset();
      router.refresh();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'ত্রুটি',
        description:
          error.message || 'ব্যবহারকারী যোগ করতে সমস্যা হয়েছে।',
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>নাম</FormLabel>
              <FormControl>
                <Input placeholder="সম্পূর্ণ নাম" {...field} />
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
                <Input type="email" placeholder="example@email.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>পাসওয়ার্ড</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ভূমিকা (Role)</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="ভূমিকা নির্বাচন করুন" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="staff">স্টাফ</SelectItem>
                  <SelectItem value="admin">এডমিন</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              বাতিল
            </Button>
          </DialogClose>
          <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            সংরক্ষণ করুন
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};


export default function UsersTable({ initialUsers }: { initialUsers: User[] }) {
  const [isAddUserOpen, setAddUserOpen] = useState(false);
  const [isDeletePending, startDeleteTransition] = React.useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const handleRoleChange = async (userId: string, role: 'super-admin' | 'admin' | 'staff') => {
    try {
        await updateUserRole(userId, role);
        toast({
            title: 'ভূমিকা পরিবর্তন হয়েছে',
            description: `ব্যবহারকারীর ভূমিকা "${role}" হিসেবে সেট করা হয়েছে।`,
            className: 'bg-accent text-accent-foreground',
        });
        router.refresh();
    } catch(error: any) {
        toast({ variant: 'destructive', title: 'ত্রুটি', description: error.message || 'ভূমিকা পরিবর্তন করতে সমস্যা হয়েছে।'});
    }
  };

  const handleDelete = async (userId: string) => {
    startDeleteTransition(async () => {
      try {
          await deleteUser(userId);
          toast({
              variant: 'destructive',
              title: 'ব্যবহারকারী ডিলিট হয়েছে',
              description: `ব্যবহারকারীকে তালিকা থেকে মুছে ফেলা হয়েছে।`,
          });
          router.refresh();
      } catch(error: any) {
          toast({ variant: 'destructive', title: 'ত্রুটি', description: error.message || 'ডিলিট করতে সমস্যা হয়েছে।'});
      }
    });
  }

  const getRoleBadgeVariant = (role: 'super-admin' | 'admin' | 'staff') => {
    switch (role) {
      case 'super-admin':
        return 'destructive';
      case 'admin':
        return 'default';
      case 'staff':
        return 'secondary';
      default:
        return 'outline';
    }
  }

  return (
     <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>ব্যবহারকারীর তালিকা</CardTitle>
          <CardDescription>
            সকল ব্যবহারকারী দেখুন ও তাদের ভূমিকা পরিচালনা করুন।
          </CardDescription>
        </div>
        <Dialog open={isAddUserOpen} onOpenChange={setAddUserOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1 bg-accent text-accent-foreground hover:bg-accent/90">
                <UserPlus className="h-4 w-4" />
                নতুন ব্যবহারকারী
            </Button>
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
      </CardHeader>
      <CardContent>
        {initialUsers.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p>কোনো ব্যবহারকারী পাওয়া যায়নি।</p>
          </div>
        ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>নাম</TableHead>
              <TableHead>ইমেইল</TableHead>
              <TableHead>ভূমিকা (Role)</TableHead>
              <TableHead>যোগদানের তারিখ</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatarUrl} alt={user.name} />
                        <AvatarFallback>{user.name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    {user.name}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant={getRoleBadgeVariant(user.role)}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>{user.createdAt ? formatInTimeZone(toDate(user.createdAt), 'Asia/Dhaka', 'dd/MM/yyyy') : 'N/A'}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost" disabled={user.role === 'super-admin'}>
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>ভূমিকা পরিবর্তন</DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                          <DropdownMenuSubContent>
                            <DropdownMenuItem onClick={() => handleRoleChange(user.id, 'super-admin')}>সুপার-এডমিন</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRoleChange(user.id, 'admin')}>এডমিন</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRoleChange(user.id, 'staff')}>স্টাফ</DropdownMenuItem>
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
                                      এই কাজটি ফিরিয়ে আনা যাবে না। এটি আপনার ডাটাবেস থেকে ব্যবহারকারীকে স্থায়ীভাবে মুছে ফেলবে।
                                  </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                  <AlertDialogCancel>বাতিল</AlertDialogCancel>
                                  <AlertDialogAction
                                      className='bg-destructive hover:bg-destructive/90'
                                      onClick={() => handleDelete(user.id)}
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
    </Card>
  )
}
