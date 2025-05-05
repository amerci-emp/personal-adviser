"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileUpload } from "./file-upload";
import { api } from "@/trpc/client";

export function UploadForm() {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<Blob | null>(null);

  const uploadMutation = api.statement.upload.useMutation({
    onSuccess: () => {
      toast.success("Statement uploaded successfully");

      // Redirect to dashboard after successful upload
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });

  const handleFileSelected = (file: File, data: Blob) => {
    setSelectedFile(file);
    setFileData(data);
  };

  const handleUpload = async () => {
    if (!selectedFile || !fileData) {
      toast.error("Please select a file to upload");
      return;
    }

    setIsUploading(true);

    try {
      // Direct upload to Supabase via tRPC
      await uploadMutation.mutateAsync({
        filename: selectedFile.name,
        fileType: selectedFile.type,
        fileData: fileData,
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to upload file",
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">Upload Financial Statement</CardTitle>
        <CardDescription>
          Upload your bank or credit card statement for processing and
          categorization
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FileUpload onFileSelected={handleFileSelected} />

        <div className="mt-6 space-y-2">
          <h3 className="text-sm font-medium">Tips for best results:</h3>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>
              Upload high-quality scanned documents or official digital
              statements
            </li>
            <li>Ensure all transaction details are clearly visible</li>
            <li>
              For PDFs, make sure text is selectable (not just images of text)
            </li>
            <li>Remove any personal identifying information if desired</li>
          </ul>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-4">
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard")}
          disabled={isUploading || uploadMutation.isPending}
        >
          Cancel
        </Button>
        <Button
          onClick={handleUpload}
          disabled={!selectedFile || isUploading || uploadMutation.isPending}
          className="gap-2"
        >
          {isUploading || uploadMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Upload Statement
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
