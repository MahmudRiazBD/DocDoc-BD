
import React from 'react';
import { getClientData } from '@/lib/supabase/database';
import ClientsTable from './ClientsTable';

export default async function ClientsPage() {
  const clients = await getClientData();
  return <ClientsTable initialClients={clients} />;
}
