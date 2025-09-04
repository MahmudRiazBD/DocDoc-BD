'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';

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
import { DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { updateCurrentUser } from '@/app/actions/user-actions';
import { useRouter } from 'next/navigation';

const profileSchema = z.object({
  name: z.string().min(1, 'নাম আবশ্যক'),
  email: z.string().email(),
  role: z.string(),
  password: z.string().min(6, 'নতুন পাসওয়ার্ড অবশ্যই ৬ অক্ষরের হতে হবে').optional().or(z.literal('')),
  avatarUrl: z.string().url("অনুগ্রহ করে একটি সঠিক URL দিন").optional().or(z.literal('')),
});

type ProfileSchema = z.infer<typeof profileSchema>;

export const UpdateProfileForm = ({ user, setOpen }: { user: { name: string, email: string, role: string, avatarUrl?: string }, setOpen: (open: boolean) => void }) => {
  const { toast } = useToast();
  const router = useRouter();
  const form = useForm<ProfileSchema>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name || '',
      email: user.email || '',
      role: user.role || '',
      password: '',
      avatarUrl: user.avatarUrl || '',
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (values: ProfileSchema) => {
    try {
      const result = await updateCurrentUser({ name: values.name, password: values.password, avatarUrl: values.avatarUrl });
      if (result.error) {
        throw new Error(result.error);
      }
      toast({
        title: 'প্রোফাইল আপডেট হয়েছে',
        description: 'আপনার তথ্য সফলভাবে আপডেট করা হয়েছে।',
        className: 'bg-accent text-accent-foreground',
      });
      setOpen(false);
      window.location.reload(); // To refresh the layout and show the new avatar
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'ত্রুটি',
        description: error.message || 'প্রোফাইল আপডেট করতে সমস্যা হয়েছে।',
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
                <Input type="email" placeholder="example@email.com" {...field} disabled />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="avatarUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>প্রোফাইল ছবির URL</FormLabel>
              <FormControl>
                <Input type="url" placeholder="https://example.com/avatar.png" {...field} />
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
              <FormControl>
                <Input {...field} disabled />
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
              <FormLabel>নতুন পাসওয়ার্ড</FormLabel>
              <FormControl>
                <Input type="password" placeholder="পরিবর্তন করতে চাইলে টাইপ করুন" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter className='pt-4'>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              বাতিল
            </Button>
          </DialogClose>
          <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            আপডেট করুন
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};
