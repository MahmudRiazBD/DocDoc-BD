
'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { AppFile } from '@/lib/types';
import { getFilesByIds, updatePrintStatus } from '@/lib/supabase/database';
import { DescoBill } from '../DescoBill';
import { DpdcBill } from '../DpdcBill';

const BulkPrintContent = () => {
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
        const results = await getFilesByIds(fileIds);
        const billFiles = results.filter(f => f && f.hasElectricityBill);
        
        if (billFiles.length === 0) {
            throw new Error(`এই ফাইল আইডিগুলোর জন্য কোনো বিদ্যুৎ বিল পাওয়া যায়নি।`);
        }
        setFiles(billFiles);
        
        // Update status after fetching
        const billIdsToUpdate = billFiles.map(r => r.id);
        if (billIdsToUpdate.length > 0) {
            await updatePrintStatus('bill', billIdsToUpdate);
        }

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
        <p className="mt-4 text-lg">আপনার বিলগুলো প্রিন্টের জন্য প্রস্তুত করা হচ্ছে...</p>
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

  const renderBillTemplate = (file: AppFile) => {
    switch (file.bill_template_id) {
      case 'dpdc':
        return <DpdcBill file={file} />;
      case 'desco':
      default:
        return <DescoBill file={file} />;
    }
  };

  return (
    <div className="print-container">
      {files.map((file) => (
        <div key={file.id} className="printable-page">
         {renderBillTemplate(file)}
        </div>
      ))}
      <style jsx global>{`
        @media print {
            @page {
                size: A4 portrait;
                margin: 0;
            }
            body, .print-container {
                margin: 0 !important;
                padding: 0 !important;
                background: #fff !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            .printable-page {
                page-break-after: always;
                break-after: page;
            }
            .printable-page:last-child {
                 page-break-after: auto;
                 break-after: auto;
            }
        }
        @media screen {
            .print-container {
                display: flex;
                flex-direction: column;
                gap: 2rem;
                padding: 2rem;
                background-color: #e5e7eb; /* bg-gray-200 */
            }
        }
      `}</style>
    </div>
  );
};

const BulkPrintPage = () => (
  <Suspense fallback={<div>লোড হচ্ছে...</div>}>
    <BulkPrintContent />
  </Suspense>
);

export default BulkPrintPage;

  