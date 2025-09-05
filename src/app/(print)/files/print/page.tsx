
'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { AppFile } from '@/lib/types';
import { getFilesByIds } from '@/lib/supabase/database';
import { isValid, parse } from 'date-fns';
import { toDate, formatInTimeZone } from 'date-fns-tz';

const toBengaliNumber = (num: number | string | undefined) => {
    if (num === null || num === undefined) return '';
    const bengaliNumbers = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num).split('').map(digit => bengaliNumbers[parseInt(digit, 10)] || digit).join('');
};

const toEnglish = (str: string): string => {
    const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return str.replace(/[০-৯]/g, (digit) => String(bengaliDigits.indexOf(digit)));
};

const parseDateString = (dateString: string): Date | null => {
    if (!dateString) return null;
    const englishDateString = toEnglish(dateString);
    const formats = ["dd/MM/yyyy", "dd-MM-yyyy", "dd.MM.yyyy"];
    const timeZone = 'Asia/Dhaka';
    const referenceDate = new Date();

    for (const formatStr of formats) {
        const date = parse(englishDateString, formatStr, referenceDate, { timeZone });
        if (isValid(date)) return date;
    }
    return null;
}

const formatDobForDisplay = (dob: string | undefined): string => {
    if (!dob) return 'N/A';
    if (/^\d{4}$/.test(toEnglish(dob))) {
      return toBengaliNumber(dob);
    }
    const date = parseDateString(dob);
    return date ? toBengaliNumber(formatInTimeZone(date, 'Asia/Dhaka', 'dd/MM/yyyy')) : toBengaliNumber(dob);
  };


const PrintContent = () => {
  const searchParams = useSearchParams();
  const ids = searchParams.get('ids');
  const [files, setFiles] = useState<AppFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllData = async () => {
      if (!ids) {
        setError('কোনো ফাইল আইডি পাওয়া যায়নি।');
        setLoading(false);
        return;
      }
      const fileIds = ids.split(',');
      try {
        const fetchedFiles = await getFilesByIds(fileIds);
        
        // Sort by clientName, then by applicantName
        fetchedFiles.sort((a, b) => {
            if (a.clientName < b.clientName) return -1;
            if (a.clientName > b.clientName) return 1;
            if (a.applicantName < b.applicantName) return -1;
            if (a.applicantName > b.applicantName) return 1;
            return 0;
        });

        setFiles(fetchedFiles);
      } catch (err: any) {
        setError(err.message || 'ডেটা আনতে সমস্যা হয়েছে।');
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [ids]);

  useEffect(() => {
    if (!loading && files.length > 0 && !error) {
      setTimeout(() => window.print(), 500); // Add a small delay
    }
  }, [loading, files, error]);

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gray-100">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-lg">আপনার ফাইলগুলো প্রিন্টের জন্য প্রস্তুত করা হচ্ছে...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center text-red-500 bg-gray-100">
        <p>ত্রুটি: {error}</p>
      </div>
    );
  }

  if (files.length === 0) {
     return (
      <div className="flex h-screen items-center justify-center text-gray-500 bg-gray-100">
        <p>প্রিন্ট করার জন্য কোনো ফাইল পাওয়া যায়নি।</p>
      </div>
    );
  }

  const groupedFiles: { [key: string]: AppFile[] } = files.reduce((acc, file) => {
    const clientName = file.clientName || 'Uncategorized';
    if (!acc[clientName]) {
      acc[clientName] = [];
    }
    acc[clientName].push(file);
    return acc;
  }, {} as { [key: string]: AppFile[] });

  let globalSerial = 1;

  return (
    <div className="print-container bg-white font-sans">
      <div className="a4-page p-4">
        <h1 className="text-xl font-bold text-center mb-1">ফাইল তালিকা</h1>
        <p className="text-center text-xs text-gray-600 mb-4">প্রিন্টের তারিখ: {toBengaliNumber(formatInTimeZone(new Date(), 'Asia/Dhaka', 'dd/MM/yyyy'))}</p>
        
        {Object.entries(groupedFiles).map(([clientName, clientFiles]) => (
            <div key={clientName} className="mb-4 break-inside-avoid">
                <h2 className="text-base font-bold mb-1 border-b-2 pb-1">ক্লায়েন্ট: {clientName}</h2>
                <table className="w-full border-collapse text-xs">
                <thead>
                    <tr className="bg-gray-100 font-semibold">
                    <th className="p-1 border text-left w-[5%]">ক্র.</th>
                    <th className="p-1 border text-left w-[35%]">আবেদনকারীর নাম</th>
                    <th className="p-1 border text-left w-[20%]">জন্ম তারিখ/সাল</th>
                    <th className="p-1 border text-left w-[20%]">স্ট্যাটাস</th>
                    <th className="p-1 border text-left w-[20%]">কমেন্ট</th>
                    </tr>
                </thead>
                <tbody>
                    {clientFiles.map((file) => (
                    <tr key={file.id} className="even:bg-gray-50">
                        <td className="p-1 border text-center">{toBengaliNumber(globalSerial++)}</td>
                        <td className="p-1 border">{file.applicantName}</td>
                        <td className="p-1 border">{formatDobForDisplay(file.dob)}</td>
                        <td className="p-1 border"></td>
                        <td className="p-1 border"></td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
        ))}
      </div>
      <style jsx global>{`
        @media print {
            @page {
                size: A4;
                margin: 15mm;
            }
            body, .print-container {
                background: #fff !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            .a4-page {
                box-shadow: none !important;
                border: none !important;
                width: 100% !important;
                height: 100% !important;
            }
        }
        @media screen {
            .print-container {
                padding: 2rem;
                background-color: #e5e7eb; /* bg-gray-200 */
            }
            .a4-page {
                width: 210mm;
                min-height: 297mm;
                margin: auto;
                box-shadow: 0 0 0.5cm rgba(0,0,0,0.5);
            }
        }
      `}</style>
    </div>
  );
};

const BulkPrintPage = () => (
  <Suspense fallback={<div className="flex h-screen items-center justify-center">লোড হচ্ছে...</div>}>
    <PrintContent />
  </Suspense>
);

export default BulkPrintPage;
