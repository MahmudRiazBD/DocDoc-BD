

import React from 'react';
import {
  getFiles,
  getFilesCount,
  getClients,
  getBillAddresses,
  getBillTemplates,
  getInstitutions,
} from '@/lib/supabase/database';
import FilesPageContent from './FilesPageContent';
import { AppFile } from '@/lib/types';

const PAGE_SIZE = 10;

export default async function FilesPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  
  const page = typeof searchParams.page === 'string' ? parseInt(searchParams.page, 10) : 1;
  const filter = typeof searchParams.filter === 'string' ? searchParams.filter : undefined;
  const clientId = typeof searchParams.clientId === 'string' ? searchParams.clientId : undefined;
  const date = typeof searchParams.date === 'string' ? searchParams.date : undefined;
  const from = typeof searchParams.from === 'string' ? searchParams.from : undefined;
  const to = typeof searchParams.to === 'string' ? searchParams.to : undefined;
  const month = typeof searchParams.month === 'string' ? searchParams.month : undefined;
  const year = typeof searchParams.year === 'string' ? searchParams.year : undefined;

  const filterOptions = { page, filter, clientId, date, from, to, month, year };
  const nextPageFilterOptions = { ...filterOptions, page: page + 1 };

  const [
    initialFiles,
    prefetchedFiles,
    totalFiles,
    clients,
    billAddresses,
    billTemplates,
    institutions,
  ] = await Promise.all([
    getFiles(filterOptions),
    getFiles(nextPageFilterOptions),
    getFilesCount(filterOptions),
    getClients(),
    getBillAddresses(),
    getBillTemplates(),
    getInstitutions(),
  ]);

  return (
    <FilesPageContent
      initialFiles={initialFiles}
      initialPrefetchedFiles={prefetchedFiles}
      totalFiles={totalFiles}
      clients={clients}
      billAddresses={billAddresses}
      billTemplates={billTemplates}
      institutions={institutions}
    />
  );
}

    
