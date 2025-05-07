"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
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
import { toast } from "sonner";
import { FileCheck, Upload, Loader2 } from "lucide-react";

export function UploadForm() {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  const uploadMutation = api.statement.upload.useMutation({
    onSuccess: () => {
      toast.success("Statement uploaded successfully", {
        description: "Your statement is now processing. You can view its status on the dashboard.",
        duration: 5000,
      });
    },
    onError: (error: Error) => {
      toast.error("Failed to upload statement", {
        description: error.message || "Something went wrong. Please try again.",
        duration: 5000,
      });
      router.push("/dashboard");
    },
  });

  const handleFileSelected = (file: File, fileData: Blob) => {
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("No file selected", {
        description: "Please select a file to upload.",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Use FormData approach for file upload
      const formData = new FormData();
      formData.append("file", selectedFile);

      // Toast notification before redirecting
      toast.info("Uploading statement...", {
        description: "You'll be redirected to the dashboard",
        duration: 3000,
      });

      // Upload file to temporary endpoint first
      const response = await fetch("/api/upload-temp", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload file");
      }

      const { fileUrl } = await response.json();

      // Immediately redirect to dashboard
      router.push("/dashboard");

      // Create the statement record in the background
      uploadMutation.mutate({
        filename: selectedFile.name,
        fileType: selectedFile.type,
        fileUrl: fileUrl,
      });
    } catch (error) {
      setIsUploading(false);
      toast.error(
        error instanceof Error ? error.message : "Failed to upload file"
      );
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Upload Financial Statement</CardTitle>
        <CardDescription>
          Upload your bank or credit card statement to track your expenses
        </CardDescription>
      </CardHeader>

      <CardContent>
        <FileUpload onFileSelected={handleFileSelected} />

        <div className="mt-6 space-y-2">
          <h3 className="text-sm font-medium flex items-center gap-1">
            <FileCheck className="h-4 w-4" />
            Tips for best results
          </h3>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
            <li>Use PDF statements directly from your bank</li>
            <li>Ensure the PDF is not password protected</li>
            <li>Statements should include account details and transaction history</li>
          </ul>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard")}
          disabled={isUploading}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleUpload} 
          disabled={!selectedFile || isUploading}
          className="gap-2"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading...
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
