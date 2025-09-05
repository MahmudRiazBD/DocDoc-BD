

import { AppFile } from '@/lib/types';
import { subYears } from 'date-fns';
import { toDate, formatInTimeZone } from 'date-fns-tz';
import Image from 'next/image';
import React from 'react';

export const DescoBill = ({ file }: { file: AppFile }) => {
  if (!file.bill_recharge_history || !file.bill_address) return null;

  const endDate = file.bill_recharge_history.length > 0 ? toDate(file.bill_recharge_history[0].date) : toDate(file.createdAt);
  const startDate = subYears(endDate, 1);

  return (
    <div id="printable-area-desco" className="bg-white shadow-lg a4-page-portrait font-sans text-xs relative print:text-black">
      {/* Header */}
      <header className="px-10 pt-8 pb-4 flex items-center gap-4">
          {file.bill_template_logo_url && (
             <Image src={file.bill_template_logo_url} alt="Desco Logo" width={100} height={40} data-ai-hint="company logo" unoptimized/>
          )}
          <h1 className="text-xl font-bold">Dhaka Electric Supply Company Ltd</h1>
      </header>

      {/* Account Info */}
      <section className="px-10 grid grid-cols-2 gap-x-8 gap-y-1 mb-4">
          <div>
              <p><span className="font-bold">Account No:</span> {file.bill_account_no}</p>
              <p className="font-bold">{file.bill_holder_name}</p>
              <p>DAG NO-{file.bill_address.dagNo}, {file.bill_address.area}, {file.bill_address.division}</p>
          </div>
          <div className="text-left">
              <p><span className="font-bold">S&amp;D:</span> {file.bill_s_and_d}</p>
              <p><span className="font-bold">Tariff:</span> {file.bill_tariff}</p>
          </div>
          <div className="col-span-2">
              <p className="font-semibold">Recharge history from {formatInTimeZone(startDate, 'Asia/Dhaka', 'MMM dd, yyyy')} to {formatInTimeZone(endDate, 'Asia/Dhaka', 'MMM dd, yyyy')}</p>
          </div>
      </section>

      {/* Table */}
      <section className="px-10">
          <table className="w-full border-collapse">
              <thead>
                  <tr className="bg-gray-100">
                      <th className="p-1 border border-gray-300 text-left">SL</th>
                      <th className="p-1 border border-gray-300 text-left">Order No</th>
                      <th className="p-1 border border-gray-300 text-left">Meter No</th>
                      <th className="p-1 border border-gray-300 text-left">Date</th>
                      <th className="p-1 border border-gray-300 text-right">Total Amount</th>
                      <th className="p-1 border border-gray-300 text-right">Energy Amount</th>
                      <th className="p-1 border border-gray-300 text-right">VAT</th>
                      <th className="p-1 border border-gray-300 text-right">Rebate</th>
                      <th className="p-1 border border-gray-300 text-right">Demand Charge</th>
                      <th className="p-1 border border-gray-300 text-right">Meter Rent 1P</th>
                  </tr>
              </thead>
              <tbody>
                  {file.bill_recharge_history.map((entry, index) => (
                      <tr key={index} className="odd:bg-white even:bg-gray-50">
                          <td className="p-1 border border-gray-300">{index + 1}</td>
                          <td className="p-1 border border-gray-300">{entry.orderNo}</td>
                          <td className="p-1 border border-gray-300">{file.bill_meter_no}</td>
                          <td className="p-1 border border-gray-300">{formatInTimeZone(toDate(entry.date), 'Asia/Dhaka', 'yyyy-MM-dd')}</td>
                          <td className="p-1 border border-gray-300 text-right">{entry.totalAmount.toFixed(2)}</td>
                          <td className="p-1 border border-gray-300 text-right">{entry.energyAmount.toFixed(2)}</td>
                          <td className="p-1 border border-gray-300 text-right">{entry.vat.toFixed(2)}</td>
                          <td className="p-1 border border-gray-300 text-right">{entry.rebate.toFixed(2)}</td>
                          <td className="p-1 border border-gray-300 text-right">{entry.demandCharge.toFixed(2)}</td>
                          <td className="p-1 border border-gray-300 text-right">{entry.meterRent.toFixed(2)}</td>
                      </tr>
                  ))}
              </tbody>
          </table>
      </section>
      
      {/* Footer */}
      <footer className="absolute bottom-4 left-0 right-0 px-10 flex justify-between items-center text-gray-600 text-[10px]">
          <p>© System Automation, ICT Division, DESCO</p>
          <p>Downloaded on: {formatInTimeZone(new Date(), 'Asia/Dhaka', 'MMM dd, yyyy hh:mm a')}</p>
          <p>Page 1 of 1</p>
      </footer>
    </div>
  );
};
