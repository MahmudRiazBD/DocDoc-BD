
import React from 'react';
import { getUsers } from '@/lib/supabase/database';
import UsersTable from './UsersTable';

export default async function UsersPage() {
  const users = await getUsers();
  return <UsersTable initialUsers={users} />;
}
