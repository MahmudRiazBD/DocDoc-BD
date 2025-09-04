import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// This is a server-side only file. 
// We use service_role key here to bypass RLS for this specific check.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase is not initialized." }, { status: 500 });
  }
  
  try {
    const { count, error } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (error) {
        throw error;
    }

    return NextResponse.json({ hasUsers: (count || 0) > 0 });
  } catch (error: any) {
    console.error("Error fetching user count:", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}
