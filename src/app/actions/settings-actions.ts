
'use server';

import { generateCertificateData } from '@/ai/flows/certificate-data-tool';
import { differenceInYears, parseISO } from 'date-fns';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const TABLES_TO_TRUNCATE = ['users', 'files', 'institutions', 'clients', 'bill_addresses', 'bill_templates'];

/**
 * Deletes all users from Supabase Authentication.
 */
async function deleteAllAuthUsers() {
    const supabaseAdmin = createClient();
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;

    for (const user of users) {
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
        if (deleteError) {
            console.error(`Failed to delete user ${user.id}:`, deleteError.message);
        }
    }
}


/**
 * Resets the entire application by deleting all data from Supabase tables
 * and all users from Supabase Authentication.
 */
export async function resetApplication(): Promise<{ error?: string }> {
  try {
    const supabaseAdmin = createClient();
    
    // Construct the full SQL command to truncate all tables at once.
    // Using a single transaction is more efficient and atomic.
    const sql = `TRUNCATE TABLE ${TABLES_TO_TRUNCATE.join(', ')} RESTART IDENTITY CASCADE;`;

    // Use a generic rpc call to execute the raw SQL.
    // Note: This requires the `execute_sql` function to be defined in your Supabase database.
    // If it's not defined, this will fail. A more robust solution might involve
    // calling truncate on each table individually if this function is not available.
    const { error: truncateError } = await supabaseAdmin.rpc('execute_sql', { sql });

    if (truncateError) {
        // Fallback: If the RPC fails, try truncating tables individually.
        console.warn('RPC execute_sql failed, falling back to individual truncate calls.', truncateError);
        for (const table of TABLES_TO_TRUNCATE) {
            const { error: singleTruncateError } = await supabaseAdmin.rpc('execute_sql', {
                sql: `TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE;`
            });
            if (singleTruncateError) {
                 throw new Error(`Supabase truncate error on table ${table}: ${singleTruncateError.message}`);
            }
        }
    }

    // Delete all Supabase Authentication users
    await deleteAllAuthUsers();

    revalidatePath('/', 'layout');

    return {};
  } catch (error: any) {
    console.error('Error resetting application:', error);
    let errorMessage = 'An unexpected error occurred during reset.';
    if (error.message) {
      errorMessage = error.message;
    }
    return { error: errorMessage };
  }
}

/**
 * Updates all existing certificates in the database with the corrected logic for 'class' and 'sessionYear'.
 */
export async function updateAllCertificates(): Promise<{ success?: boolean; updatedCount: number; error?: string }> {
    try {
        const supabaseAdmin = createClient();
        const { data: files, error: fetchError } = await supabaseAdmin.from('files').select('*').eq('has_certificate', true);

        if (fetchError) throw fetchError;
        if (!files || files.length === 0) {
            return { success: true, updatedCount: 0 };
        }

        let updatedCount = 0;

        for (const file of files) {
            const dob = parseISO(file.dob);
            const certificateDate = parseISO(file.certificate_date);
            const age = differenceInYears(certificateDate, dob);

            const aiResult = await generateCertificateData({
                age: age,
                date: certificateDate.toISOString(),
            });

            if (aiResult.class !== file.class || aiResult.sessionYear !== file.session_year) {
                const { error: updateError } = await supabaseAdmin.from('files')
                    .update({
                        class: aiResult.class,
                        session_year: aiResult.sessionYear,
                        roll: aiResult.roll,
                        certificate_date: aiResult.certificateDate,
                    })
                    .eq('id', file.id)
                
                if (updateError) {
                    console.warn(`Could not update certificate for file ${file.id}: ${updateError.message}`);
                    continue; // Continue to the next file
                }
                updatedCount++;
            }
        }
        
        revalidatePath('/files');

        return { success: true, updatedCount };

    } catch (error: any) {
        console.error('Error updating certificates:', error);
        return { success: false, updatedCount: 0, error: error.message || 'An unexpected error occurred.' };
    }
}
