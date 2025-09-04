

import React from 'react';
import {
  getFiles,
  getClients,
  getBillAddresses,
  getBillTemplates,
  getInstitutions,
} from '@/lib/supabase/database';
import FilesPageContent from './FilesPageContent';

export default async function FilesPage() {
  
  const [
    initialFiles,
    allFiles,
    clients,
    billAddresses,
    billTemplates,
    institutions,
  ] = await Promise.all([
    getFiles(true), // Fetch only today's files for the initial view
    getFiles(), // Fetch all files for client-side filtering
    getClients(),
    getBillAddresses(),
    getBillTemplates(),
    getInstitutions(),
  ]);

  return (
    <FilesPageContent
      initialFiles={initialFiles}
      allFiles={allFiles}
      clients={clients}
      billAddresses={billAddresses}
      billTemplates={billTemplates}
      institutions={institutions}
    />
  );
}

    
