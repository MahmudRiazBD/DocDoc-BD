
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PawPrint } from 'lucide-react';
import { createNewUser } from '@/app/actions/user-actions';

const formSchema = z.object({
  name: z.string().min(1, 'নাম আবশ্যক'),
  email: z.string().email({ message: 'অনুগ্রহ করে একটি সঠিক ইমেল এড্রেস দিন।' }),
  password: z.string().min(6, { message: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' }),
});

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    toast({
      title: 'রেজিস্ট্রেশন চলছে...',
      description: 'এটি কয়েক মুহূর্ত সময় নিতে পারে। অনুগ্রহ করে অপেক্ষা করুন।',
    });
    
    try {
      // Create user in Supabase Auth and DB via server action
      const result = await createNewUser({ ...values, role: 'super-admin' });
      
      if (result.error) {
        throw new Error(result.error);
      }

      toast({
        title: 'রেজিস্ট্রেশন সফল হয়েছে',
        description: 'আপনাকে ড্যাশবোর্ডে নিয়ে যাওয়া হচ্ছে।',
        className: 'bg-accent text-accent-foreground',
      });
      
      router.push('/dashboard');
      router.refresh();

    } catch (error: any) {
      let errorMessage = 'একটি অপ্রত্যাশিত ত্রুটি ঘটেছে।';
      if (error.message.includes('unique constraint')) {
        errorMessage = 'এই ইমেইল দিয়ে ইতিমধ্যে একটি একাউন্ট আছে।';
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast({
        variant: 'destructive',
        title: 'রেজিস্ট্রেশন ব্যর্থ হয়েছে',
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary rounded-full p-3 w-fit mb-4">
            <PawPrint className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-bold text-primary">
            ডকডক বিডি - সুপার এডমিন রেজিস্ট্রেশন
          </CardTitle>
          <CardDescription>সিস্টেমের প্রথম ব্যবহারকারী হিসেবে সাইন-আপ করুন</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>নাম</FormLabel>
                    <FormControl>
                      <Input placeholder="আপনার সম্পূর্ণ নাম" {...field} className="text-base" />
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
                        placeholder="your.email@example.com"
                        {...field}
                        className="text-base"
                      />
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
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                        className="text-base"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full text-lg py-6 bg-accent text-accent-foreground hover:bg-accent/90" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'সাইন-আপ করুন'}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-xs text-muted-foreground text-center">
            এটি একটি এককালীন প্রক্রিয়া। সফল রেজিস্ট্রেশনের পর এই পেইজটি আর দেখা যাবে না।
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}
