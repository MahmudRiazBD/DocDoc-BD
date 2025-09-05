

'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { format, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

import { AppFile, Institution } from '@/lib/types';
import { getFileById, getInstitution, updatePrintStatus } from '@/lib/supabase/database';
import { Button } from '@/components/ui/button';
import { Loader2, Printer } from 'lucide-react';

const BD_TIME_ZONE = 'Asia/Dhaka';

// Helper to convert English numbers to Bengali
const toBengaliNumber = (num: number | string | undefined | null) => {
    if (num === null || num === undefined) return '';
    const bengaliNumbers = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num).split('').map(digit => bengaliNumbers[parseInt(digit, 10)] || digit).join('');
};

// Helper to convert class number to Bengali ordinal
const toBengaliOrdinal = (classStr: string | undefined | null) => {
    if (!classStr) return '';
    
    // Improved regex to handle cases like "Class 1" or just "1"
    const numberMatch = classStr.match(/\d+/);
    if (!numberMatch) return classStr;

    const num = parseInt(numberMatch[0], 10);
    const bengaliNum = toBengaliNumber(num);
    
    if (num === 1) return `${bengaliNum}ম`; // ১ম
    if (num === 2) return `${bengaliNum}য়`; // ২য়
    if (num === 3) return `${bengaliNum}য়`; // ৩য়
    if (num === 4) return `${bengaliNum}র্থ`; // ৪র্থ
    if (num === 5) return `${bengaliNum}ম`; // ৫ম
    if (num === 6) return `${bengaliNum}ষ্ঠ`; // ৬ষ্ঠ
    if (num >= 7 && num <= 10) return `${bengaliNum}ম`; // ৭ম, ৮ম, ৯ম, ১০ম

    return classStr;
}

// Helper to render dynamic certificate text
const renderCertificateText = (text: string, file: AppFile) => {
    let renderedText = text || ''; // Ensure text is not undefined
    
    const applicantName = file.applicantNameBn;
    if (!applicantName || !file.dob || !file.roll || !file.sessionYear || !file.class || !file.fatherNameBn || !file.motherNameBn) {
      return { __html: 'Error: Missing certificate data in file.' };
    }

    // Correctly format the DOB from YYYY-MM-DD to DD/MM/YYYY
    let formattedDob = file.dob;
    try {
        const parsedDob = parseISO(file.dob);
        formattedDob = format(parsedDob, 'dd/MM/yyyy');
    } catch (e) {
        // If parsing fails, use the original string.
    }
    const bengaliFormattedDob = toBengaliNumber(formattedDob);
    const bengaliRoll = toBengaliNumber(file.roll);
    const bengaliSessionYear = toBengaliNumber(file.sessionYear);
    const bengaliClass = toBengaliOrdinal(file.class);

    renderedText = renderedText.replace(/{{name}}/g, `<span class="font-bold">${applicantName}</span>`);
    renderedText = renderedText.replace(/{{fatherName}}/g, `<span class="font-semibold">${file.fatherNameBn}</span>`);
    renderedText = renderedText.replace(/{{motherName}}/g, `<span class="font-semibold">${file.motherNameBn}</span>`);
    renderedText = renderedText.replace(/{{dob}}/g, `<span class="font-semibold">${bengaliFormattedDob}</span>`);
    renderedText = renderedText.replace(/{{class}}/g, `<span class="font-semibold">${bengaliClass}</span>`);
    renderedText = renderedText.replace(/{{roll}}/g, `<span class="font-semibold">${bengaliRoll}</span>`);
    renderedText = renderedText.replace(/{{sessionYear}}/g, `<span class="font-semibold">${bengaliSessionYear}</span>`);

    return { __html: renderedText.replace(/\n/g, '<br />') };
};


// This component contains only the printable body.
export const PrintableCertificateBody = ({ file, institution }: { file: AppFile; institution: Institution }) => {
    const [memoNo, setMemoNo] = useState('');

    useEffect(() => {
        // Generate a random number between 111 and 999 for the memo number
        const randomMemoNo = Math.floor(Math.random() * (999 - 111 + 1)) + 111;
        setMemoNo(toBengaliNumber(randomMemoNo));
    }, [file.id]); // Re-generate if the file ID changes

    if (!file.certificateDate) return null;
    const certificateDate = parseISO(file.certificateDate);
    const bengaliFormattedCertificateDate = toBengaliNumber(formatInTimeZone(certificateDate, BD_TIME_ZONE, 'dd/MM/yyyy'));
    
    return (
        <div id="printable-area" className="bg-white shadow-lg p-10 print:shadow-none a4-page font-serif-bengali text-black print:text-black">
            {/* Header Section */}
            <header className="flex items-start justify-between pb-4">
                <div className="w-32 flex-shrink-0">
                    {institution.logoUrl && (
                         <div className="w-32 h-32 flex items-center justify-center">
                            <Image
                                src={institution.logoUrl}
                                alt="Logo"
                                width={100}
                                height={100}
                                className="object-contain"
                                unoptimized
                            />
                        </div>
                    )}
                </div>
                <div className="text-center flex-grow mx-4">
                    <h1 className="text-3xl font-bold text-red-700">{institution.name}</h1>
                    <p className="text-md mt-1">{institution.address}</p>
                    {institution.email && <p className="text-sm">ইমেইল: {institution.email}</p>}
                    {institution.website && <p className="text-sm">ওয়েবসাইট: {institution.website}</p>}
                </div>
                 <div className="text-sm text-right flex-shrink-0 w-48">
                    {institution.eiin && <p>EIIN: {toBengaliNumber(institution.eiin)}</p>}
                    {institution.phone && <p>ফোন: {toBengaliNumber(institution.phone)}</p>}
                    {institution.collegeCode && <p>কলেজ কোড: {toBengaliNumber(institution.collegeCode)}</p>}
                    {institution.schoolCode && <p>বিদ্যালয় কোড: {toBengaliNumber(institution.schoolCode)}</p>}
                </div>
            </header>

            <div className="w-full h-0.5 bg-black my-2"></div>

            {/* Memo and Date Section */}
            <div className="flex justify-between items-start mb-4">
                <div>
                   <p>স্মারক নং: {memoNo}</p>
                </div>
                <div className='relative text-right'>
                    <p>তারিখ: {bengaliFormattedCertificateDate}</p>
                </div>
            </div>


            {/* Title */}
            <div className="text-center my-8">
                <h2 className="text-2xl font-bold inline-block border-b-4 border-gray-600 pb-2 px-8">প্রত্যয়ন পত্র</h2>
            </div>

            {/* Certificate Body */}
            <div 
                className="text-lg leading-loose space-y-6 text-justify"
                dangerouslySetInnerHTML={renderCertificateText(institution.certificateText, file)}
            >
            </div>
            
            {/* Footer Section */}
            <div className="mt-20 flex justify-end items-end">
                <div className="text-center">
                     {institution.signatureUrl1 && (
                        <Image
                            src={institution.signatureUrl1}
                            alt="Signature 1"
                            width={180}
                            height={70}
                            className="mx-auto object-contain"
                            unoptimized
                        />
                    )}
                    <p className="border-t-2 border-gray-700 pt-2 mt-2 font-semibold">প্রধান শিক্ষকের স্বাক্ষর</p>
                    <p className="text-sm">{institution.name}</p>
                </div>
            </div>
        </div>
    )
};


const CertificatePrintPage = () => {
    const params = useParams();
    const id = params.id as string; // This is a file ID
    const [file, setFile] = useState<AppFile | null>(null);
    const [institution, setInstitution] = useState<Institution | null>(null);
    const [loading, setLoading] = useState(true);
    const [statusUpdated, setStatusUpdated] = useState(false);


    const handlePrint = () => {
        window.print();
    };


    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            try {
                setLoading(true);
                const fileData = await getFileById(id);
                
                if (fileData?.institutionId) {
                    const instData = await getInstitution(fileData.institutionId);
                    setInstitution(instData);
                }
                setFile(fileData);
                 // Update status after fetching, only once
                if (fileData && !statusUpdated) {
                    await updatePrintStatus('certificate', [fileData.id]);
                    setStatusUpdated(true);
                }
            } catch (error) {
                console.error("Failed to fetch data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id, statusUpdated]);

    if (loading) {
        return <div className="flex h-screen items-center justify-center bg-gray-100"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
    }

    if (!file || !institution) {
        return <div className="flex h-screen items-center justify-center text-red-500 bg-gray-100">ফাইল বা প্রতিষ্ঠানের তথ্য পাওয়া যায়নি।</div>;
    }
    
    return (
        <div className="bg-gray-200 min-h-screen p-4 sm:p-8 print-container">
             <div className="max-w-5xl mx-auto flex justify-end print:hidden mb-4">
                <Button onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" />
                    প্রিন্ট করুন
                </Button>
            </div>
            
            {/* A4 Page Container */}
            <div>
                 {/* The component to be printed */}
                <PrintableCertificateBody file={file} institution={institution}/>
            </div>
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
                    .a4-page {
                        box-shadow: none !important;
                        border: none !important;
                        margin: 0 !important;
                        width: 100% !important;
                        height: 100% !important;
                    }
                }
             `}</style>
        </div>
    );
};

export default CertificatePrintPage;
