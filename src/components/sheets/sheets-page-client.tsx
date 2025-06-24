"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GoogleSheetsEmbed } from "@/components/sheets/google-sheets-embed";
import { ExternalLink, RefreshCw, Plus } from "lucide-react";
import Link from "next/link";

type ViewMode = "edit" | "view" | "preview";
type EmbedSize = "compact" | "normal" | "fullscreen";

interface SheetsPageClientProps {
  personalFinanceSpreadsheet: {
    id: string;
    spreadsheetId: string;
    spreadsheetUrl: string | null;
    monthlySheets: Array<{
      id: string;
      sheetName: string;
      transactionCount: number;
      lastUpdated: Date;
    }>;
  } | null;
  hasSheetsPermission: boolean;
  userEmail?: string | null;
}

export function SheetsPageClient({ 
  personalFinanceSpreadsheet, 
  hasSheetsPermission, 
  userEmail 
}: SheetsPageClientProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("view");
  const [embedSize, setEmbedSize] = useState<EmbedSize>("normal");

  const handleRefresh = () => {
    window.location.reload();
  };

  if (!hasSheetsPermission) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Google Sheets Setup Required
          </CardTitle>
          <CardDescription>
            You need to connect your Google account with Sheets permission to view embedded sheets.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              To view your financial data directly in the app, please set up Google Sheets integration.
            </p>
            <Link href="/settings">
              <Button>
                Go to Settings to Connect Google Sheets
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!personalFinanceSpreadsheet) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Financial Data Found</CardTitle>
          <CardDescription>
            You haven't exported any financial data to Google Sheets yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload and process some bank statements to see your financial data here.
            </p>
            <Link href="/upload">
              <Button>
                Upload Your First Statement
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

    return (
    <Card className="h-full">
      <div className="px-4 py-1 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Personal Finance Spreadsheet</h2>
          </div>
          <div className="flex items-center gap-2">
            <Select value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view">View</SelectItem>
                <SelectItem value="edit">Edit</SelectItem>
                <SelectItem value="preview">Preview</SelectItem>
              </SelectContent>
            </Select>

            <Select value={embedSize} onValueChange={(value) => setEmbedSize(value as EmbedSize)}>
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Small</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="fullscreen">Full</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" asChild>
              <a 
                href={personalFinanceSpreadsheet.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${personalFinanceSpreadsheet.spreadsheetId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                Open in Google Sheets
              </a>
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
          </div>
        </div>
      </div>
      <CardContent className="p-0 h-full">
        <GoogleSheetsEmbed 
          spreadsheetId={personalFinanceSpreadsheet.spreadsheetId}
          spreadsheetUrl={personalFinanceSpreadsheet.spreadsheetUrl}
          viewMode={viewMode}
          embedSize={embedSize}
        />
      </CardContent>
    </Card>
  );
} 