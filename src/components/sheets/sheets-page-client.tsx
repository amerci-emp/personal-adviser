"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GoogleSheetsEmbed } from "@/components/sheets/google-sheets-embed";
import { ExternalLink, RefreshCw, Plus } from "lucide-react";
import Link from "next/link";

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
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" asChild>
          <a 
            href={personalFinanceSpreadsheet.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${personalFinanceSpreadsheet.spreadsheetId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1"
          >
            <ExternalLink className="h-4 w-4" />
            Open in Google Sheets
          </a>
        </Button>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Monthly Sheets Overview */}
      {personalFinanceSpreadsheet.monthlySheets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Monthly Sheets</CardTitle>
            <CardDescription>
              Quick access to your latest financial data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {personalFinanceSpreadsheet.monthlySheets.map((sheet) => (
                <div
                  key={sheet.id}
                  className="p-3 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="font-medium text-sm">{sheet.sheetName}</div>
                  <div className="text-xs text-muted-foreground">
                    {sheet.transactionCount} transactions
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Last updated: {new Date(sheet.lastUpdated).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Embedded Google Sheets */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Finance Spreadsheet</CardTitle>
          <CardDescription>
            Interactive view of your financial data exported to Google Sheets
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <GoogleSheetsEmbed 
            spreadsheetId={personalFinanceSpreadsheet.spreadsheetId}
            spreadsheetUrl={personalFinanceSpreadsheet.spreadsheetUrl}
          />
        </CardContent>
      </Card>
    </div>
  );
} 