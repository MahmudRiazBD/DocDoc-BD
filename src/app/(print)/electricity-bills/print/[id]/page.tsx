
'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppFile } from '@/lib/types';
import { getFileById, updatePrintStatus } from '@/lib/supabase/database';
import { Button } from '@/components/ui/button';
import { Loader2, Printer } from 'lucide-react';
import { DescoBill } from '../DescoBill';
import { DpdcBill } from '../DpdcBill';

const BillPrintPage = () => {
    const params = useParams();
    const id = params.id as string; // This is a file ID
    const [file, setFile] = useState<AppFile | null>(null);
    const [loading, setLoading] = useState(true);
    const [statusUpdated, setStatusUpdated] = useState(false);


    useEffect(() => {
        const fetchBill = async () => {
            if (!id) return;
            try {
                setLoading(true);
                const fileData = await getFileById(id);
                setFile(fileData);

                 // Update status after fetching, only once
                if (fileData && !statusUpdated) {
                    await updatePrintStatus('bill', [fileData.id]);
                    setStatusUpdated(true);
                }
            } catch (error) {
                console.error("Failed to fetch data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchBill();
    }, [id, statusUpdated]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return <div className="flex h-screen items-center justify-center bg-gray-100"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
    }

    if (!file || !file.has_electricity_bill) {
        return <div className="flex h-screen items-center justify-center text-red-500 bg-gray-100">বিদ্যুৎ বিলের তথ্য পাওয়া যায়নি।</div>;
    }
    
    const renderBillTemplate = () => {
        switch (file.bill_template_id) {
            case 'dpdc':
                return <DpdcBill file={file} />;
            case 'desco':
            default:
                return <DescoBill file={file} />;
        }
    };

    return (
        <div className="bg-gray-200 min-h-screen p-4 sm:p-8 print-container">
            <div className="max-w-5xl mx-auto flex justify-end print:hidden mb-4">
                <Button onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" />
                    প্রিন্ট করুন
                </Button>
            </div>
            
            {renderBillTemplate()}

            <style jsx global>{`
                @media print {
                    body, .print-container {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #fff !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .print\\:hidden {
                        display: none !important;
                    }
                    .a4-page-portrait {
                        box-shadow: none !important;
                        border: none !important;
                        margin: 0 !important;
                        width: 210mm;
                        height: 297mm;
                        position: relative;
                    }
                }
                @page {
                    size: A4 portrait;
                    margin: 0;
                }
                .a4-page-portrait {
                    width: 210mm;
                    height: 296mm; /* Slightly less than 297mm to avoid issues */
                    margin: auto;
                    position: relative;
                    overflow: hidden;
                }
            `}</style>
        </div>
    );
};

export default BillPrintPage;
