import { processUploadedFile } from './src/lib/file-processing.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Configure dotenv to load environment variables from .env
dotenv.config();

// Helper to get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTest() {
  // --- Configuration: Choose ONE of the options below ---

  // Option 1: Test with a local file
  const testFilePath = path.join(__dirname, 'uploads/a0923am2343232n232.pdf'); // Replace with actual path
  // const testFilePath = path.join(__dirname, 'uploads/063dde8b-7785-4fa2-a8bf-56daa9b7551a.pdf'); // Replace with actual path
  const testFileType = 'application/pdf'; // Or 'image/png', 'image/jpeg'
  const testFileSource = testFilePath;

  // // Option 2: Test with a URL (e.g., a Supabase public URL or a pre-signed URL)
  // const testFileUrl = 'YOUR_TEST_FILE_URL_HERE'; // Replace with an actual public URL to a test PDF/image
  // const testFileType = 'application/pdf'; // Or 'image/png', 'image/jpeg' based on the URL content
  // const testFileSource = testFileUrl;
  
  // --- End Configuration ---

  if (!testFileSource || testFileSource === 'YOUR_TEST_FILE_URL_HERE' && !testFileSource.startsWith('http')) {
    if (testFileSource === 'YOUR_TEST_FILE_URL_HERE') {
        console.error('---------------------------------------------------------------------------');
        console.error('ERROR: Please configure a test file URL in test-document-ai.mjs (Option 2).');
        console.error('Or, comment out Option 2 and configure Option 1 for a local file test.');
        console.error('---------------------------------------------------------------------------');
    } else if (!testFileSource.startsWith('http')) {
        console.error('---------------------------------------------------------------------------');
        console.error('ERROR: Please configure a local test file path in test-document-ai.mjs (Option 1).');
        console.error(`Current path: ${testFilePath} does not seem to exist or is not configured.`);
        console.error('Or, comment out Option 1 and configure Option 2 for a URL test.');
        console.error('---------------------------------------------------------------------------');
    }
    return;
  }

  console.log(`Using Document AI Form Parser to scan first page of: ${testFileSource}`);
  console.log(`File type: ${testFileType}`);

  try {
    const result = await processUploadedFile(testFileSource, testFileType);

    console.log('---------------------- TEST RESULT ----------------------');
    if (result.success) {
      console.log('✅ OCR Scan Succeeded!');
      
      console.log('\n📄 Document Overview:');
      console.log(`Found ${result.textBlockCount || 'undefined'} text blocks`);
      console.log(`Found ${result.tableCount || 'undefined'} tables detected by Document AI`);
      
      // Display some basic information from the scan
      console.log('\n📋 Basic Information:');
      
      // Check if basicInfo exists
      if (result.basicInfo) {
        if (result.basicInfo.pageNumbers && result.basicInfo.pageNumbers.length > 0) {
          console.log('\n  Page Numbers:');
          result.basicInfo.pageNumbers.forEach(text => console.log(`   - ${text}`));
        }
        
        if (result.basicInfo.dates && result.basicInfo.dates.length > 0) {
          console.log('\n  Dates:');
          result.basicInfo.dates.forEach(text => console.log(`   - ${text}`));
        }
        
        if (result.basicInfo.dollarAmounts && result.basicInfo.dollarAmounts.length > 0) {
          console.log('\n  Dollar Amounts:');
          result.basicInfo.dollarAmounts.slice(0, 5).forEach(text => console.log(`   - ${text}`));
          if (result.basicInfo.dollarAmounts.length > 5) {
            console.log(`   - ... and ${result.basicInfo.dollarAmounts.length - 5} more`);
          }
        }
        
        if (result.basicInfo.accountInfo && result.basicInfo.accountInfo.length > 0) {
          console.log('\n  Account Information:');
          result.basicInfo.accountInfo.slice(0, 5).forEach(text => console.log(`   - ${text}`));
          if (result.basicInfo.accountInfo.length > 5) {
            console.log(`   - ... and ${result.basicInfo.accountInfo.length - 5} more`);
          }
        }
      } else {
        console.log('  No basic information extracted. Form Parser focuses on structured data.');
      }
      
      // Table information
      if (result.tableInfo && result.tableInfo.length > 0) {
        console.log('\n📊 Tables Detected:');
        result.tableInfo.forEach((table, i) => {
          console.log(`  Table ${i+1}: ${table.rowCount || 'unknown'} rows`);
          if (table.headerCells && table.headerCells.length > 0) {
            console.log(`   Headers: ${table.headerCells.join(' | ')}`);
          }
        });
      } else {
        console.log('\n📊 No tables were detected on the first page');
      }
      
      console.log('\n📁 OCR Results saved to:');
      console.log(`   ocr-blocks-${path.basename(testFileSource)}.json`);
      console.log('\n💡 Tip: You can use the OCR results to build a custom parser for your specific bank statements');
    } else {
      console.error('❌ OCR Scan Failed!');
      console.error('Error:', result.error);
    }
    console.log('--------------------------------------------------------');
  } catch (error) {
    console.error('---------------------- SCRIPT ERROR ----------------------');
    console.error('An unexpected error occurred in the test script:', error);
    console.error('----------------------------------------------------------');
  }
}

runTest();