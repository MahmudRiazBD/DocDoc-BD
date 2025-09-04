'use server';

import { revalidatePath } from 'next/cache';

/**
 * Purges the entire Next.js cache by revalidating the root layout.
 * This ensures that all cached data across the application is refreshed.
 */
export async function purgeAllCache(): Promise<{ success: boolean; error?: string }> {
  try {
    // Revalidating the root layout ('/') with 'layout' mode invalidates all caches
    // that depend on it, effectively clearing the cache for the entire application.
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error) {
    console.error('Error purging cache:', error);
    return { success: false, error: 'Failed to purge cache.' };
  }
}
