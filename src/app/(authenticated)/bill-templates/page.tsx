
import React from 'react';
import { getBillTemplates } from '@/lib/supabase/database';
import BillTemplatesTable from './BillTemplatesTable';

export default async function BillTemplatesPage() {
  const templates = await getBillTemplates();
  return <BillTemplatesTable initialTemplates={templates} />;
}
