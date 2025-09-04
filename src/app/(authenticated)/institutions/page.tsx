
import React from 'react';
import { getInstitutions } from '@/lib/supabase/database';
import InstitutionsTable from './InstitutionsTable';

export default async function InstitutionsPage() {
  const institutions = await getInstitutions();
  return <InstitutionsTable initialInstitutions={institutions} />;
}
