
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

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
import Link from 'next/link';

const formSchema = z.object({
  email: z.string().email({ message: 'অনুগ্রহ করে একটি সঠিক ইমেল এড্রেস দিন।' }),
  password: z.string().min(6, { message: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' }),
});

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'লগইন সফল হয়েছে',
        description: 'আপনাকে ড্যাশবোর্ডে নিয়ে যাওয়া হচ্ছে।',
        className: 'bg-accent text-accent-foreground',
      });
      router.push('/dashboard');
      router.refresh(); // To trigger middleware and layout rerender
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'লগইন ব্যর্থ হয়েছে',
        description: 'আপনার ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।',
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
            ডকডক বিডি
          </CardTitle>
          <CardDescription>আপনার অ্যাকাউন্টে লগইন করুন</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
              <div>
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
                 <div className="text-right mt-2">
                    <Button variant="link" asChild className="p-0 h-auto">
                        <Link href="/forgot-password">পাসওয়ার্ড ভুলে গেছেন?</Link>
                    </Button>
                 </div>
              </div>
              <Button type="submit" className="w-full text-lg py-6 bg-accent text-accent-foreground hover:bg-accent/90" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'লগইন করুন'}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-xs text-muted-foreground text-center">
          সুপার এডমিন বা এডমিন দ্বারা তৈরিকৃত একাউন্ট দিয়ে লগইন করুন।
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}
