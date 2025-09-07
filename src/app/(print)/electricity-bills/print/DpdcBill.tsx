
import { AppFile } from '@/lib/types';
import { subMonths, addDays } from 'date-fns';
import { toDate, formatInTimeZone } from 'date-fns-tz';
import Image from 'next/image';
import React from 'react';

export const DpdcBill = ({ file }: { file: AppFile }) => {
  if (!file.bill_recharge_history || !file.bill_address) return null;
  const endDate = addDays(toDate(new Date(file.created_at)), -10);
  const startDate = subMonths(endDate, 3);

  return (
    <div
      id="printable-area-dpdc"
      className="bg-white shadow-lg a4-page-portrait font-sans text-xs leading-tight text-black p-10 flex flex-col print:text-black"
    >
        {/* Top Section: Customer Info */}
        <div>
          <header className="flex justify-center mb-2">
            <div className='flex flex-row items-center gap-4'>
              {file.bill_templates?.logo_url && (
                <Image
                  src={file.bill_templates.logo_url}
                  alt="DPDC Logo"
                  width={70}
                  height={70}
                  unoptimized
                  className='flex-shrink-0'
                />
              )}
              <h1 className="text-xl font-bold text-left">Dhaka Power Distribution Company Limited (DPDC)</h1>
            </div>
          </header>

          <section className="text-center mb-4">
            <h2 className="text-sm font-semibold">Vending Ledger Report</h2>
            <p className="text-sm">for period of {formatInTimeZone(startDate, 'Asia/Dhaka', 'dd-MM-yyyy')} to {formatInTimeZone(endDate, 'Asia/Dhaka', 'dd-MM-yyyy')}</p>
          </section>

          <section className="grid grid-cols-2 gap-x-6 text-xs mb-2 border border-gray-300 p-1.5">
            <div className='space-y-0.5'>
              <div className='flex'><p className='w-28'>NOCS</p><p>: DANIA</p></div>
              <div className='flex'><p className='w-28'>Customer No</p><p>: {file.bill_customer_no}</p></div>
              <div className='flex'><p className='w-28'>Customer Name</p><p>: {file.bill_holder_name}</p></div>
              <div className='flex'><p className='w-28'>Sanc./Conn. Load</p><p>: {file.bill_sanc_load}</p></div>
              <div className='flex'><p className='w-28'>Address</p><p>: {file.bill_address?.address || `${file.bill_address?.dagNo}, ${file.bill_address?.area}, ${file.bill_address?.division}`}</p></div>
            </div>
            <div className='space-y-0.5'>
              <div className='flex'><p className='w-28'>Meter No</p><p>: {file.bill_meter_no}</p></div>
              <div className='flex'><p className='w-28'>Book</p><p>: {file.bill_book_no}</p></div>
              <div className='flex'><p className='w-28'>Type</p><p>: {file.bill_type}</p></div>
              <div className='flex'><p className='w-28'>Account No</p><p>: {file.bill_account_no}</p></div>
              <div className='flex'><p className='w-28'>Tariff</p><p>: {file.bill_tariff}</p></div>
            </div>
          </section>
        </div>

        {/* Bottom Section: Recharge History Table */}
        <div className="flex-grow relative border border-gray-300 p-2 flex flex-col">
            {/* Watermark is positioned relative to this container */}
            {file.bill_templates?.logo_url && (
                <div className="absolute inset-0 flex items-center justify-center z-0">
                    <Image
                        src={file.bill_templates.logo_url}
                        alt="DPDC Watermark"
                        width={400}
                        height={400}
                        className="opacity-10 object-contain"
                        unoptimized
                    />
                </div>
            )}
            
            {/* Table is positioned on top of the watermark */}
            <div className="relative z-10 flex-grow">
                <table className="w-full border-collapse">
                <thead className='text-xs'>
                    <tr className="bg-transparent">
                    <th className="p-0.5 text-center border border-gray-300">SI.</th>
                    <th className="p-0.5 text-center border border-gray-300">Recharge Date</th>
                    <th className="p-0.5 text-center border border-gray-300">Recharge Amount</th>
                    <th className="p-0.5 text-center border border-gray-300">Service Charge</th>
                    <th className="p-0.5 text-center border border-gray-300">Demand Charge</th>
                    <th className="p-0.5 text-center border border-gray-300">Meter Rent</th>
                    <th className="p-0.5 text-center border border-gray-300">Arear Amt.</th>
                    <th className="p-0.5 text-center border border-gray-300">Rebate</th>
                    <th className="p-0.5 text-center border border-gray-300">Other Charge</th>
                    <th className="p-0.5 text-center border border-gray-300">VAT</th>
                    <th className="p-0.5 text-center border border-gray-300">Energy Amt.</th>
                    <th className="p-0.5 text-center border border-gray-300">Recharge By</th>
                    </tr>
                </thead>
                <tbody>
                    {file.bill_recharge_history.map((entry, index) => (
                    <tr key={index} className="bg-transparent">
                        <td className="p-0.5 text-center border border-gray-300">{index + 1}</td>
                        <td className="p-0.5 text-center border border-gray-300">{formatInTimeZone(toDate(entry.date), 'Asia/Dhaka', 'dd-MMM-yy').toUpperCase()}</td>
                        <td className="p-0.5 text-center border border-gray-300">{entry.totalAmount.toFixed(2)}</td>
                        <td className="p-0.5 text-center border border-gray-300">{(entry.serviceCharge || 0).toFixed(2)}</td>
                        <td className="p-0.5 text-center border border-gray-300">{entry.demandCharge.toFixed(2)}</td>
                        <td className="p-0.5 text-center border border-gray-300">{entry.meterRent.toFixed(2)}</td>
                        <td className="p-0.5 text-center border border-gray-300">{(entry.arearAmt || 0).toFixed(2)}</td>
                        <td className="p-0.5 text-center border border-gray-300">{entry.rebate.toFixed(2)}</td>
                        <td className="p-0.5 text-center border border-gray-300">{(entry.otherCharge || 0).toFixed(2)}</td>
                        <td className="p-0.5 text-center border border-gray-300">{entry.vat.toFixed(2)}</td>
                        <td className="p-0.5 text-center border border-gray-300">{entry.energyAmount.toFixed(2)}</td>
                        <td className="p-0.5 text-center border border-gray-300">{entry.rechargeBy}</td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
        </div>
        
        {/* Footer */}
        <footer className="mt-auto pt-2 text-red-600 font-semibold flex-shrink-0">
          <p>This vending information contains data upto {formatInTimeZone(endDate, 'Asia/Dhaka', 'dd-MMM-yy').toUpperCase()}.</p>
        </footer>
    </div>
  );
};
