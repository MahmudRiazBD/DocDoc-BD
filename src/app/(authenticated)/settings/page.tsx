'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Loader2, DatabaseZap } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { useToast } from '@/hooks/use-toast';
import { resetApplication, updateAllCertificates } from '@/app/actions/settings-actions';

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isResetting, startResetTransition] = useTransition();
  const [isUpdatingCerts, startCertUpdateTransition] = useTransition();

  const handleReset = () => {
    startResetTransition(async () => {
      try {
        const result = await resetApplication();
        if (result.error) {
          throw new Error(result.error);
        }
        toast({
          title: 'অ্যাপ্লিকেশন রিসেট সফল হয়েছে',
          description: 'সমস্ত ডেটা মুছে ফেলা হয়েছে। আপনাকে সাইন-আপ পৃষ্ঠায় পাঠানো হচ্ছে।',
          className: 'bg-accent text-accent-foreground',
        });
        // Redirect to signup page after successful reset
        router.push('/signup');
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'রিসেট ব্যর্থ হয়েছে',
          description: error.message || 'একটি অপ্রত্যাশিত ত্রুটি ঘটেছে।',
        });
      }
    });
  };
  
  const handleUpdateCertificates = () => {
    startCertUpdateTransition(async () => {
        try {
            const result = await updateAllCertificates();
             if (result.error) {
                throw new Error(result.error);
            }
             toast({
                title: 'প্রত্যয়নপত্র আপডেট সফল হয়েছে',
                description: `${result.updatedCount} টি প্রত্যয়নপত্র সফলভাবে আপডেট করা হয়েছে।`,
                className: 'bg-accent text-accent-foreground',
            });
        } catch (error: any) {
             toast({
                variant: 'destructive',
                title: 'আপডেট ব্যর্থ হয়েছে',
                description: error.message || 'একটি অপ্রত্যাশিত ত্রুটি ঘটেছে।',
            });
        }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">সেটিংস</h1>
        <p className="text-muted-foreground">
          এখানে আপনার অ্যাপ্লিকেশন পরিচালনা করুন।
        </p>
      </div>

       <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DatabaseZap />
            ডাটা রক্ষণাবেক্ষণ
          </CardTitle>
          <CardDescription>
           ডাটাবেজের তথ্য সংশোধন বা আপডেট করার জন্য এই অপশনগুলো ব্যবহার করুন।
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <h3 className="font-semibold">প্রত্যয়নপত্রের ক্লাস ও সেশন আপডেট</h3>
              <p className="text-sm text-muted-foreground">
                ডাটাবেজে থাকা সকল প্রত্যয়নপত্রের ক্লাস ও সেশন ইয়ার AI এর নতুন লজিক অনুযায়ী আপডেট করুন।
              </p>
            </div>
             <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={isUpdatingCerts}>
                  আপডেট করুন
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    আপনি কি নিশ্চিত?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    এই কাজটি ডাটাবেজের সকল প্রত্যয়নপত্রকে নতুন লজিক অনুযায়ী আপডেট করবে। এটি একটি необратиযোগ্য প্রক্রিয়া।
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>বাতিল</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleUpdateCertificates}
                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                    disabled={isUpdatingCerts}
                  >
                    {isUpdatingCerts && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    আমি বুঝতে পেরেছি, আপডেট করুন
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>


      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle />
            ডেঞ্জার জোন
          </CardTitle>
          <CardDescription>
            এই কাজগুলো স্থায়ী এবং অপরিবর্তনীয়। অনুগ্রহ করে সতর্কতার সাথে
            এগিয়ে যান।
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-destructive/50 p-4">
            <div>
              <h3 className="font-semibold">অ্যাপ্লিকেশন রিসেট করুন</h3>
              <p className="text-sm text-muted-foreground">
                এটি আপনার ডাটাবেসের সমস্ত ডেটা (ব্যবহারকারী, ফাইল, প্রত্যয়নপত্র, প্রতিষ্ঠান) এবং সমস্ত প্রমাণীকরণ ব্যবহারকারীকে স্থায়ীভাবে মুছে ফেলবে।
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isResetting}>
                  অ্যাপ রিসেট করুন
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    আপনি কি একেবারে নিশ্চিত?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    এই কাজটি ফিরিয়ে আনা যাবে না। এটি আপনার ডাটাবেস থেকে সমস্ত
                    তথ্য এবং প্রমাণীকরণ থেকে সমস্ত ব্যবহারকারীকে স্থায়ীভাবে মুছে
                    ফেলবে। সিস্টেমটি তার প্রাথমিক সেটআপ অবস্থায় ফিরে যাবে।
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>বাতিল</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleReset}
                    className="bg-destructive hover:bg-destructive/90"
                    disabled={isResetting}
                  >
                    {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    আমি বুঝতে পেরেছি, রিসেট করুন
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
