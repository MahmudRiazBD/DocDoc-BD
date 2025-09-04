'use server';

import { uploadFileToR2 } from '@/lib/r2';

export async function uploadFile(formData: FormData): Promise<string> {
  const file = formData.get('file') as File;

  if (!file) {
    throw new Error('No file provided.');
  }

  try {
    const url = await uploadFileToR2(file);
    return url;
  } catch (error) {
    console.error('Failed to upload file:', error);
    throw new Error('File upload failed.');
  }
}
