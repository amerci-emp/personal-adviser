import { processStatement } from "./vision-ai";
import { promises as fs } from "fs";
import fetch from "node-fetch";
import { Blob } from "node:buffer";

interface ProcessUploadResult {
  success: boolean;
  text?: string;
  error?: string;
}

/**
 * Process an uploaded file using Vision AI
 * @param filePathOrUrl Path or URL to the uploaded file
 * @param fileType MIME type of the file
 */
export async function processUploadedFile(
  filePathOrUrl: string,
  fileType: string,
): Promise<ProcessUploadResult> {
  console.log(`Processing uploaded file: ${filePathOrUrl} (${fileType})`);

  try {
    let fileContent: Buffer;

    // Check if it's a URL (particularly a Supabase URL)
    if (filePathOrUrl.startsWith('http')) {
      try {
        console.log('Processing file from URL');
        const response = await fetch(filePathOrUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        fileContent = Buffer.from(arrayBuffer);
        console.log(`Successfully downloaded file: ${fileContent.length} bytes`);
      } catch (fetchError) {
        console.error('Error fetching file from URL:', fetchError);
        return {
          success: false,
          error: `Failed to fetch file from URL: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`,
        };
      }
    } else {
      // It's a local file path
      try {
        await fs.access(filePathOrUrl);
        const stats = await fs.stat(filePathOrUrl);
        console.log(`File exists and is accessible. Size: ${stats.size} bytes`);
        fileContent = await fs.readFile(filePathOrUrl);
      } catch (error) {
        console.error(
          `File access error: ${error instanceof Error ? error.message : String(error)}`,
        );
        return {
          success: false,
          error: `File not found or not accessible: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    }

    // Process the file using Vision AI
    console.log("Calling Vision AI processing...");

    try {
      // If processing from a URL, we need to create a temporary local file
      let tempFilePath = filePathOrUrl;
      let needsCleanup = false;

      if (filePathOrUrl.startsWith('http')) {
        tempFilePath = `/tmp/temp-statement-${Date.now()}.${fileType.split('/')[1] || 'file'}`;
        await fs.writeFile(tempFilePath, fileContent);
        needsCleanup = true;
        console.log(`Created temporary file at: ${tempFilePath}`);
      }

      try {
        const extractedText = await processStatement(tempFilePath, fileType);

        if (!extractedText || extractedText.trim().length === 0) {
          console.warn("No text extracted from file");
          return {
            success: false,
            error: "No text could be extracted from the file",
          };
        }

        console.log(
          `Successfully extracted ${extractedText.length} characters of text`,
        );
        return {
          success: true,
          text: extractedText,
        };
      } finally {
        // Clean up temporary file if created
        if (needsCleanup) {
          try {
            await fs.unlink(tempFilePath);
            console.log(`Deleted temporary file: ${tempFilePath}`);
          } catch (cleanupError) {
            console.warn('Failed to delete temporary file:', cleanupError);
          }
        }
      }
    } catch (visionError) {
      console.error("Vision AI processing error:", visionError);
      return {
        success: false,
        error: `Error during Vision AI processing: ${visionError instanceof Error ? visionError.message : String(visionError)}`,
      };
    }
  } catch (error) {
    console.error("Fatal error during file processing:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error processing file",
    };
  }
}
