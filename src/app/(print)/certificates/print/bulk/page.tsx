
'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { AppFile, Institution } from '@/lib/types';
import { getFilesByIds, getInstitution, updatePrintStatus } from '@/lib/supabase/database';
import { PrintableCertificateBody } from '../[id]/page';

type CertificatePrintData = {
  file: AppFile;
  institution: Institution;
};

const BulkPrintContent = () => {
  const searchParams = useSearchParams();
  const ids = searchParams.get('ids');
  const [printData, setPrintData] = useState<CertificatePrintData[]>([]);
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
        const files = await getFilesByIds(fileIds);

        const dataPromises = files.map(async (file) => {
          if (!file || !file.institutionId) {
            throw new Error(`ID: ${file.id} এর জন্য সার্টিফিকেট বা প্রতিষ্ঠান পাওয়া যায়নি।`);
          }
          const inst = await getInstitution(file.institutionId);
          if (!inst) {
            throw new Error(`ID: ${file.id} এর জন্য প্রতিষ্ঠান পাওয়া যায়নি।`);
          }
          return { file, institution: inst };
        });

        const results = await Promise.all(dataPromises);
        setPrintData(results);

        // Update status after fetching
        const idsToUpdate = results.map(r => r.file.id);
        if (idsToUpdate.length > 0) {
            await updatePrintStatus('certificate', idsToUpdate);
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
    if (!loading && printData.length > 0 && !error) {
      setTimeout(() => window.print(), 500); // Add a small delay
    }
  }, [loading, printData, error]);

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gray-100">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-lg">আপনার সার্টিফিকেটগুলো প্রিন্টের জন্য প্রস্তুত করা হচ্ছে...</p>
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

  return (
    <div className="print-container">
      {printData.map(({ file, institution }) => (
        <div key={file.id} className="printable-page">
            <PrintableCertificateBody
            file={file}
            institution={institution}
            />
        </div>
      ))}
      <style jsx global>{`
        @media print {
            @page {
                size: A4;
                margin: 0;
            }
            body, .print-container {
                margin: 0 !important;
                padding: 0 !important;
                background: #fff !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            .printable-page:last-of-type {
                 page-break-after: auto;
            }
            .printable-page {
                box-shadow: none !important;
                border: none !important;
                margin: 0 !important;
                width: 100% !important;
                height: 100% !important;
                page-break-after: always;
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
