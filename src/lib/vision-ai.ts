import { ImageAnnotatorClient } from '@google-cloud/vision';
import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// 'pdf-image' is imported dynamically in server-only code
let PDFImage: any = null;

// Create a client authorized with the application default credentials
let visionClient: ImageAnnotatorClient | null = null;

// Initialize the Vision AI client
export function initVisionClient(): ImageAnnotatorClient {
  if (!visionClient) {
    try {
      const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      
      if (!credentialsPath) {
        throw new Error("GOOGLE_APPLICATION_CREDENTIALS environment variable not set");
      }
      
      console.log(`Initializing Vision AI client with credentials at: ${credentialsPath}`);
      
      // Ensure credentials file exists
      try {
        const fullPath = path.isAbsolute(credentialsPath) 
          ? credentialsPath 
          : path.join(process.cwd(), credentialsPath);
          
        fs.access(fullPath).catch(err => {
          throw new Error(`Credentials file not found at ${fullPath}: ${err.message}`);
        });
      } catch (error) {
        console.error('Failed to access credentials file:', error);
        throw error;
      }
      
      visionClient = new ImageAnnotatorClient();
      console.log('Vision AI client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Vision AI client:', error);
      throw error;
    }
  }
  return visionClient;
}

/**
 * Extract text from an image file using Google Cloud Vision API
 * @param filePath Path to the image file
 * @returns Extracted text from the image
 */
export async function extractTextFromImage(filePath: string): Promise<string> {
  console.log(`Extracting text from image: ${filePath}`);
  
  try {
    // Verify file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      throw new Error(`Image file not found at ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    const client = initVisionClient();
    
    // Read file content as a Buffer
    const fileContent = await fs.readFile(filePath);
    console.log(`Read ${fileContent.length} bytes from image file`);
    
    // Perform text detection on the image
    console.log('Calling Vision AI text detection...');
    const [result] = await client.textDetection({
      image: {
        content: fileContent.toString('base64')
      }
    });
    console.log('Vision AI text detection completed');

    const detections = result.textAnnotations;
    
    if (!detections || detections.length === 0) {
      console.log('No text detected in the image');
      return '';
    }
    
    // The first annotation contains the entire extracted text
    const extractedText = detections[0].description || '';
    console.log(`Extracted ${extractedText.length} characters of text`);
    
    return extractedText;
  } catch (error) {
    console.error('Error extracting text from image:', error);
    throw error;
  }
}

/**
 * Convert a PDF page to an image using command line tools
 * @param pdfPath Path to the PDF file
 * @param pageNum Page number to convert (0-based)
 * @returns Path to the converted image
 */
async function convertPdfPageToImage(pdfPath: string, pageNum: number = 0): Promise<string> {
  console.log(`Converting page ${pageNum} of PDF: ${pdfPath}`);
  
  try {
    // Create output directory if it doesn't exist
    const outputDir = path.join(process.cwd(), 'temp-pdf-images');
    await fs.mkdir(outputDir, { recursive: true });
    
    // Get PDF filename without extension
    const pdfName = path.basename(pdfPath, '.pdf');
    
    // Generate a unique name for the output file
    const timestamp = Date.now();
    const outputBaseName = `${pdfName}-page-${pageNum}-${timestamp}`;
    const outputPath = path.join(outputDir, `${outputBaseName}.png`);
    
    // For server-side only code, use direct command line tools instead of pdf-image
    // This approach uses ImageMagick's convert directly
    try {
      // First, try using the 'convert' command (ImageMagick)
      await execAsync(`convert -density 300 -quality 100 "${pdfPath}[${pageNum}]" "${outputPath}"`);
      console.log(`PDF page converted to: ${outputPath} using ImageMagick`);
      return outputPath;
    } catch (convertError: any) {
      console.warn('ImageMagick convert failed, trying with alternate approach:', convertError.message);
      
      // As a fallback, try using pdf-image if we're in a Node.js environment
      if (typeof window === 'undefined' && !PDFImage) {
        try {
          // Dynamic import to keep this server-side only
          const pdfImageModule = await import('pdf-image');
          PDFImage = pdfImageModule.default;
        } catch (importError) {
          console.error('Failed to import pdf-image:', importError);
          throw new Error('PDF processing libraries not available');
        }
      }
      
      if (PDFImage) {
        const pdfImage = new PDFImage(pdfPath, {
          combinedImage: false,
          convertOptions: {
            '-density': '300',
            '-quality': '100'
          }
        });
        
        const imagePath = await pdfImage.convertPage(pageNum);
        console.log(`PDF page converted to: ${imagePath} using pdf-image`);
        return imagePath;
      } else {
        throw new Error('No PDF processing methods available');
      }
    }
  } catch (error) {
    console.error('Error converting PDF to image:', error);
    throw new Error(`Failed to convert PDF to image: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Extract text from a PDF document
 * @param filePath Path to the PDF file
 * @returns Extracted text from the PDF
 */
export async function extractTextFromPdf(filePath: string): Promise<string> {
  console.log(`Processing PDF: ${filePath}`);
  
  try {
    // First, check if we can determine the number of pages
    // We'll use pdftk if available, otherwise just process the first page
    let numPages = 1;
    
    try {
      // Try to get page count using pdftk
      const { stdout } = await execAsync(`pdftk "${filePath}" dump_data | grep NumberOfPages | awk '{print $2}'`);
      numPages = parseInt(stdout.trim(), 10);
      console.log(`PDF has ${numPages} pages`);
    } catch (error) {
      console.warn('Could not determine PDF page count. Processing only first page:', error);
    }
    
    // Process each page (or just the first if we couldn't determine page count)
    const pagesToProcess = Math.min(numPages, 10); // Limit to 10 pages for performance
    let allText = '';
    const tempFiles = [];
    
    try {
      for (let i = 0; i < pagesToProcess; i++) {
        console.log(`Processing page ${i+1} of ${pagesToProcess}...`);
        
        // Convert the PDF page to an image
        const imagePath = await convertPdfPageToImage(filePath, i);
        tempFiles.push(imagePath);
        
        // Extract text from the image
        const pageText = await extractTextFromImage(imagePath);
        
        // Append the text with a page marker
        if (pageText) {
          allText += `\n--- Page ${i+1} ---\n${pageText}\n`;
        }
      }
      
      return allText.trim();
    } finally {
      // Clean up all temporary images
      for (const file of tempFiles) {
        try {
          await fs.unlink(file);
          console.log(`Cleaned up temporary file: ${file}`);
        } catch (error) {
          console.warn(`Could not delete temporary file: ${file}`, error);
        }
      }
      
      // Clean up the temp directory if it's empty
      try {
        const outputDir = path.join(process.cwd(), 'temp-pdf-images');
        const files = await fs.readdir(outputDir);
        if (files.length === 0) {
          await fs.rmdir(outputDir);
          console.log('Removed empty temporary directory');
        }
      } catch (error) {
        // Ignore errors when trying to clean up the directory
      }
    }
  } catch (error) {
    console.error('Error processing PDF:', error);
    throw new Error(`Failed to process PDF: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Process a document by extracting text based on file type
 */
export async function processStatement(filePath: string, fileType: string): Promise<string> {
  console.log(`Processing statement: ${filePath}, type: ${fileType}`);
  
  if (fileType.includes('image/')) {
    return extractTextFromImage(filePath);
  } else if (fileType === 'application/pdf') {
    return extractTextFromPdf(filePath);
  } else {
    throw new Error(`Unsupported file type: ${fileType}`);
  }
} 