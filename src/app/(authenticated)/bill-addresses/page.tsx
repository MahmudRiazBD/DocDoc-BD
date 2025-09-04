
import React from 'react';
import {
  getBillAddresses,
  getBillTemplates,
  getBillAddressData,
} from '@/lib/supabase/database';
import BillAddressesTable from './BillAddressesTable';

export default async function BillAddressesPage() {
  const addresses = await getBillAddressData();
  const templates = await getBillTemplates();

  return (
    <BillAddressesTable
      initialAddresses={addresses}
      initialTemplates={templates}
    />
  );
}
