import { processStatement } from "./vision-ai";
import path from "path";
import { promises as fs } from "fs";

interface ProcessUploadResult {
  success: boolean;
  text?: string;
  error?: string;
}

/**
 * Process an uploaded file using Vision AI
 * @param filePath Path to the uploaded file
 * @param fileType MIME type of the file
 */
export async function processUploadedFile(
  filePath: string,
  fileType: string
): Promise<ProcessUploadResult> {
  console.log(`Processing uploaded file: ${filePath} (${fileType})`);
  
  try {
    // Check if file exists
    try {
      await fs.access(filePath);
      
      // Get file stats for debugging
      const stats = await fs.stat(filePath);
      console.log(`File exists and is accessible. Size: ${stats.size} bytes`);
    } catch (error) {
      console.error(`File access error: ${error instanceof Error ? error.message : String(error)}`);
      return {
        success: false,
        error: `File not found or not accessible: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    // Process the file using Vision AI
    console.log('Calling Vision AI processing...');
    
    try {
      const extractedText = await processStatement(filePath, fileType);
      
      if (!extractedText || extractedText.trim().length === 0) {
        console.warn('No text extracted from file');
        return {
          success: false,
          error: "No text could be extracted from the file",
        };
      }

      console.log(`Successfully extracted ${extractedText.length} characters of text`);
      return {
        success: true,
        text: extractedText,
      };
    } catch (visionError) {
      console.error('Vision AI processing error:', visionError);
      return {
        success: false,
        error: `Error during Vision AI processing: ${visionError instanceof Error ? visionError.message : String(visionError)}`,
      };
    }
  } catch (error) {
    console.error('Fatal error during file processing:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error processing file",
    };
  }
} 