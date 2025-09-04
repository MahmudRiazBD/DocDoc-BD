import type { Metadata } from 'next';
import React from 'react';
import '../globals.css';

export const metadata: Metadata = {
  title: 'প্রিন্ট প্রিভিউ - ডকডক বিডি',
  description: 'আপনার ফাইল ও প্রত্যয়ন ব্যবস্থাপনার ডিজিটাল সমাধান',
};

export default function PrintLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {/* 
        The <head> tag was removed from here to fix the hydration error.
        Next.js manages the head content through the main layout and metadata object.
        Specific fonts for this layout are now linked in the main layout file.
      */}
      {children}
    </>
  );
}
