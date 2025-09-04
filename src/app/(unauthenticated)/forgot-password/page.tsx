
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useState } from 'react';
import { Loader2, Mail } from 'lucide-react';
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
});

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${location.origin}/api/auth/callback`,
      });
      
      if (error) throw error;

      toast({
        title: 'রিসেট লিঙ্ক পাঠানো হয়েছে',
        description: 'আপনার ইমেইল চেক করুন এবং পাসওয়ার্ড রিসেট করার জন্য নির্দেশাবলী অনুসরণ করুন।',
        className: 'bg-accent text-accent-foreground',
      });
      router.push('/login');
    } catch (error: any) {
       let errorMessage = 'একটি অপ্রত্যাশিত ত্রুটি ঘটেছে।';
       if(error.message.includes('User not found')){
           errorMessage = 'এই ইমেইল দিয়ে কোনো একাউন্ট পাওয়া যায়নি।';
       }
      toast({
        variant: 'destructive',
        title: 'লিঙ্ক পাঠাতে সমস্যা',
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
            পাসওয়ার্ড রিসেট
          </CardTitle>
          <CardDescription>আপনার ইমেইলে পাসওয়ার্ড রিসেট লিঙ্ক পাঠান</CardDescription>
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
              <Button type="submit" className="w-full text-lg py-6 bg-accent text-accent-foreground hover:bg-accent/90" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                রিসেট লিঙ্ক পাঠান
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center">
            <Button variant="link" asChild>
                <Link href="/login">লগইন পেজে ফিরে যান</Link>
            </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
