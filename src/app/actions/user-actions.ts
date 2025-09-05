
'use server';

import { z } from 'zod';
import { User } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['admin', 'staff', 'super-admin']),
});

type UserSchema = z.infer<typeof userSchema>;

export async function createNewUser(
  values: UserSchema
): Promise<{ user?: User; error?: string }> {
  const supabase = createClient();
  
  try {
    const validatedData = userSchema.parse(values);

    // For sign-up, we must use the public `signUp` method, not the admin `createUser` method.
    // The admin method is for creating users from an already authenticated admin session.
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: validatedData.email,
      password: validatedData.password,
      options: {
        data: {
            name: validatedData.name,
            role: validatedData.role,
        }
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('User creation was successful but no user object was returned.');

    // Since signUp doesn't automatically insert into the public.users table,
    // we do it manually here. This is safe because this server action is
    // only called from controlled components and the middleware protects the signup page.
    const newUser: Omit<User, 'created_at' | 'serial_no'> = {
      id: authData.user.id,
      name: validatedData.name,
      email: validatedData.email,
      role: validatedData.role,
    };
    
    // We use the admin client here to bypass RLS for the initial insert.
    const supabaseAdmin = createClient();
    const { data: dbUser, error: dbError } = await supabaseAdmin
        .from('users')
        .insert(newUser)
        .select()
        .single();
    
    if (dbError) {
        // If the DB insert fails, we should roll back the auth user creation.
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw dbError;
    }

    revalidatePath('/users');
    revalidatePath('/dashboard', 'layout'); // Revalidate layout to update user state

    return { user: dbUser as User };
  } catch (error: any) {
    console.error('Error creating new user:', error);
    let errorMessage = 'An unexpected error occurred.';
    if (error.message.includes('unique constraint')) {
       errorMessage = 'এই ইমেইল দিয়ে ইতিমধ্যে একটি একাউন্ট আছে।';
    } else if (error.message.includes('User not allowed')) {
        errorMessage = 'User not allowed';
    } else if (error.message) {
      errorMessage = error.message;
    }
    return { error: errorMessage };
  }
}

const updateUserSchema = z.object({
    name: z.string().min(1, 'নাম আবশ্যক'),
    password: z.string().min(6, 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে').optional().or(z.literal('')),
    avatarUrl: z.string().url("অনুগ্রহ করে একটি সঠিক URL দিন").optional().or(z.literal('')),
});

export async function updateCurrentUser(values: z.infer<typeof updateUserSchema>): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();

    try {
        const { data: { user }, error: getUserError } = await supabase.auth.getUser();
        if (getUserError || !user) {
            throw new Error('ব্যবহারকারী খুঁজে পাওয়া যায়নি বা প্রমাণೀকরণ ব্যর্থ হয়েছে।');
        }

        const validatedData = updateUserSchema.parse(values);
        const { name, password, avatarUrl } = validatedData;
        
        const updates: { data: any, password?: string } = { data: { ...user.user_metadata } };
        const dbUpdates: { name?: string, avatar_url?: string } = {};

        // Name update
        if (name && name !== user.user_metadata.name) {
            updates.data.name = name;
            dbUpdates.name = name;
        }

        // Avatar URL update
        if (avatarUrl !== user.user_metadata.avatar_url) {
            updates.data.avatar_url = avatarUrl;
            dbUpdates.avatar_url = avatarUrl;
        }

        // Password update
        if (password) {
            updates.password = password;
        }

        let authUpdateNeeded = Object.keys(updates.data).some(key => updates.data[key] !== user.user_metadata[key]) || updates.password;

        if (authUpdateNeeded) {
            const { error: authUpdateError } = await supabase.auth.updateUser(updates);
            if (authUpdateError) throw authUpdateError;
        }
        
        // Update public.users table
        if (Object.keys(dbUpdates).length > 0) {
            const { error: dbUpdateError } = await supabase.from('users').update(dbUpdates).eq('id', user.id);
            if (dbUpdateError) throw dbUpdateError;
        }

        revalidatePath('/dashboard', 'layout'); 
        return { success: true };

    } catch (error: any) {
        console.error('Error updating current user:', error);
        return { success: false, error: error.message || 'প্রোফাইল আপডেট করতে সমস্যা হয়েছে।' };
    }
}
