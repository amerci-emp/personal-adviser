import { createClient } from '@supabase/supabase-js';

// Get Supabase URL and anon key from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if Supabase credentials are available
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials. Please check your environment variables.');
}

// Create Supabase client
export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
);

// Helper function to get storage URL for a file
export function getStorageUrl(bucket: string, path: string): string {
  const storageUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
  return storageUrl;
}

// Helper function to upload a file to Supabase Storage
export async function uploadToStorage(
  bucket: string, 
  path: string, 
  file: File | Blob,
  fileType?: string
): Promise<{ error: Error | null; url: string | null }> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        contentType: fileType || file.type,
        upsert: true,
      });

    if (error) {
      throw error;
    }

    // Generate the public URL for the uploaded file
    const url = getStorageUrl(bucket, path);
    return { error: null, url };
  } catch (error) {
    console.error('Error uploading to Supabase Storage:', error);
    return { error: error as Error, url: null };
  }
} 