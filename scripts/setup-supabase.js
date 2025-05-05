#!/usr/bin/env node

/**
 * Setup script for Supabase
 * 
 * This script initializes the Supabase storage buckets needed for the application
 * Run it with: node scripts/setup-supabase.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Check for required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file.');
  process.exit(1);
}

// Create Supabase client with admin privileges
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Define storage buckets to create
const BUCKETS = [
  {
    name: 'statements',
    public: false,
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    fileSizeLimit: 10485760, // 10MB
  }
];

// Create storage buckets with proper permissions
async function setupStorageBuckets() {
  console.log('Setting up Supabase storage buckets...');

  for (const bucket of BUCKETS) {
    console.log(`Checking bucket: ${bucket.name}`);
    
    // Check if bucket exists
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError.message);
      continue;
    }
    
    const bucketExists = existingBuckets.some(b => b.name === bucket.name);
    
    if (bucketExists) {
      console.log(`Bucket '${bucket.name}' already exists.`);
    } else {
      // Create the bucket
      const { data, error } = await supabase.storage.createBucket(bucket.name, {
        public: bucket.public,
        allowedMimeTypes: bucket.allowedMimeTypes,
        fileSizeLimit: bucket.fileSizeLimit,
      });
      
      if (error) {
        console.error(`Error creating bucket '${bucket.name}':`, error.message);
      } else {
        console.log(`Created bucket '${bucket.name}' successfully.`);
      }
    }
    
    // Set up bucket policies
    if (bucket.public) {
      // For public buckets, allow anyone to read files
      const { error: policyError } = await supabase.storage.from(bucket.name).createSignedUrl('policy.txt', 3600);
      if (policyError) {
        console.log(`Setting up public access policy for bucket '${bucket.name}'...`);
      }
    }
  }
  
  console.log('Storage bucket setup completed.');
}

// Main execution
async function main() {
  try {
    console.log('Initializing Supabase setup...');
    await setupStorageBuckets();
    console.log('Supabase setup completed successfully!');
  } catch (error) {
    console.error('Failed to complete Supabase setup:', error);
    process.exit(1);
  }
}

main(); 