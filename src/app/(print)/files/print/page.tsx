

'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Award, Bolt } from 'lucide-react';
import { AppFile } from '@/lib/types';
import { getFiles } from '@/lib/supabase/database';
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
    const formats = ["dd/MM/yyyy", "dd-MM-yyyy", "dd.MM.yyyy", "yyyy-MM-dd"];
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
    // Handle both display formats and DB format
    const date = parseDateString(dob);
    return date ? toBengaliNumber(formatInTimeZone(date, 'Asia/Dhaka', 'dd/MM/yyyy')) : toBengaliNumber(dob);
  };


const PrintContent = () => {
  const searchParams = useSearchParams();
  const [files, setFiles] = useState<AppFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllData = async () => {
       const filter = searchParams.get('filter') || undefined;
        const clientId = searchParams.get('clientId') || undefined;
        const date = searchParams.get('date') || undefined;
        const from = searchParams.get('from') || undefined;
        const to = searchParams.get('to') || undefined;
        const month = searchParams.get('month') || undefined;
        const year = searchParams.get('year') || undefined;

      try {
        const fetchedFiles = await getFiles({ 
          paginate: false,
          filter,
          clientId,
          date,
          from,
          to,
          month,
          year
        });
        
        fetchedFiles.sort((a, b) => {
            if (a.client_name < b.client_name) return -1;
            if (a.client_name > b.client_name) return 1;
            if (a.serial_no > b.serial_no) return -1;
            if (a.serial_no < b.serial_no) return 1;
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
  }, [searchParams]);

  useEffect(() => {
    if (!loading && files.length > 0 && !error) {
      setTimeout(() => window.print(), 500); 
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
    const clientName = file.client_name || 'Uncategorized';
    if (!acc[clientName]) {
      acc[clientName] = [];
    }
    acc[clientName].push(file);
    return acc;
  }, {} as { [key: string]: AppFile[] });

  let sequentialSerial = 0;

  return (
    <div className="print-container bg-gray-100 p-8 text-black print:bg-white print:p-0 print:text-black">
      <div className="a4-page bg-white p-6 font-sans shadow-lg print:shadow-none">
        <header className="mb-6 flex items-center justify-between border-b-2 border-gray-800 pb-4">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">ডকডক বিডি</h1>
                <p className="text-sm text-gray-600">ফাইল তালিকা</p>
            </div>
            <div className='text-right'>
                <p className="text-sm font-medium text-gray-700">প্রিন্টের তারিখ</p>
                <p className="text-sm text-gray-600">{toBengaliNumber(formatInTimeZone(new Date(), 'Asia/Dhaka', 'dd/MM/yyyy'))}</p>
            </div>
        </header>
        
        {Object.entries(groupedFiles).map(([clientName, clientFiles]) => (
            <div key={clientName} className="mb-4 break-inside-avoid rounded-lg border border-gray-200">
                <h2 className="bg-gray-100 px-3 py-2 text-sm font-bold text-gray-800 print:bg-gray-100">
                    {clientName} ({toBengaliNumber(clientFiles.length)})
                </h2>
                <table className="w-full text-xs">
                <thead className='bg-gray-50 text-gray-600 print:bg-gray-50'>
                    <tr>
                        <th className="p-2 text-center w-[8%]">ক্রমিক নং</th>
                        <th className="p-2 text-left w-[42%]">আবেদনকারীর নাম</th>
                        <th className="p-2 text-left w-[25%]">জন্ম তারিখ/সাল</th>
                        <th className="p-2 text-left w-[25%]">ডকুমেন্টস</th>
                    </tr>
                </thead>
                <tbody>
                    {clientFiles.map((file) => {
                        sequentialSerial++;
                        return (
                            <tr key={file.id} className="border-t border-gray-200">
                                <td className="p-2 text-center font-mono">{toBengaliNumber(sequentialSerial)}</td>
                                <td className="p-2">{file.applicant_name_bn || file.applicant_name_en}</td>
                                <td className="p-2">{formatDobForDisplay(file.dob)}</td>
                                <td className="p-2">
                                <div className='flex items-center gap-2'>
                                        {file.has_certificate && (
                                            <span title='প্রত্যয়নপত্র' className='flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-blue-800 print:bg-transparent print:border print:border-blue-800'>
                                                <Award className="h-3 w-3"/>
                                                <span>প্রত্যয়ন</span>
                                            </span>
                                        )}
                                        {file.has_electricity_bill && (
                                            <span title='বিদ্যুৎ বিল' className='flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-green-800 print:bg-transparent print:border print:border-green-800'>
                                                <Bolt className="h-3 w-3"/>
                                                <span>বিল</span>
                                            </span>
                                        )}
                                </div>
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
                </table>
            </div>
        ))}

        <footer className="mt-8 pt-4 border-t text-center text-[10px] text-gray-500">
            ডকডক বিডি দ্বারা স্বয়ংক্রিয়ভাবে তৈরি।
        </footer>
      </div>
      <style jsx global>{`
        @media print {
            @page {
                size: A4;
                margin: 10mm;
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
                padding: 0 !important;
            }
        }
      `}</style>
    </div>
  );
};

const BulkFilesPrintPage = () => (
  <Suspense fallback={<div className="flex h-screen items-center justify-center">লোড হচ্ছে...</div>}>
    <PrintContent />
  </Suspense>
);

export default BulkFilesPrintPage;
