"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";

interface GoogleSheetsSectionProps {
  isConnected: boolean;
  hasSheetsPermission: boolean;
  userEmail?: string | null;
}

export function GoogleSheetsSection({ 
  isConnected, 
  hasSheetsPermission, 
  userEmail 
}: GoogleSheetsSectionProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConnectSheets = async () => {
    setIsLoading(true);
    try {
      // Force re-authentication with Google to get Sheets permission
      await signIn("google", {
        callbackUrl: "/settings",
        prompt: "consent", // Force consent screen to get updated permissions
      });
    } catch (error) {
      console.error("Error connecting to Google Sheets:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderConnectionStatus = () => {
    if (!isConnected) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-amber-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Google account not connected</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Connect your Google account to enable automatic transaction export to Google Sheets.
          </p>
          <Button onClick={handleConnectSheets} disabled={isLoading}>
            {isLoading ? "Connecting..." : "Connect Google Account"}
          </Button>
        </div>
      );
    }

    if (isConnected && !hasSheetsPermission) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-amber-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Google Sheets permission needed</span>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Your Google account is connected as <strong>{userEmail}</strong>, but you need to grant Google Sheets access to export transactions.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
              <p className="text-sm text-amber-800">
                <strong>Why do we need this?</strong> Google Sheets permission allows the app to create and update spreadsheets with your categorized financial transactions.
              </p>
            </div>
          </div>
          <Button onClick={handleConnectSheets} disabled={isLoading}>
            {isLoading ? "Granting access..." : "Grant Google Sheets Access"}
          </Button>
        </div>
      );
    }

    if (isConnected && hasSheetsPermission) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-medium">Google Sheets ready</span>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Connected as <strong>{userEmail}</strong> with Google Sheets export permissions.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <p className="text-sm text-green-800 mb-2">
                <strong>✓ Ready to export!</strong> You can now export your categorized transactions to Google Sheets.
              </p>
              <div className="space-y-1 text-xs text-green-700">
                <p>• Transactions will be organized by account and category</p>
                <p>• Exported data includes dates, descriptions, amounts, and categories</p>
                <p>• Your financial data stays private in your Google account</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleConnectSheets} 
              disabled={isLoading}
            >
              {isLoading ? "Updating..." : "Update Permissions"}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              asChild
            >
              <a 
                href="https://sheets.google.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1"
              >
                Open Google Sheets
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="space-y-4">
      {renderConnectionStatus()}

      {/* Export Status Info */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium mb-2">Export Features</h4>
        <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            {hasSheetsPermission ? (
              <CheckCircle2 className="h-3 w-3 text-green-600" />
            ) : (
              <AlertCircle className="h-3 w-3 text-amber-600" />
            )}
            <span>Automatic transaction categorization</span>
          </div>
          <div className="flex items-center gap-2">
            {hasSheetsPermission ? (
              <CheckCircle2 className="h-3 w-3 text-green-600" />
            ) : (
              <AlertCircle className="h-3 w-3 text-amber-600" />
            )}
            <span>Export to your personal Google Sheets</span>
          </div>
          <div className="flex items-center gap-2">
            {hasSheetsPermission ? (
              <CheckCircle2 className="h-3 w-3 text-green-600" />
            ) : (
              <AlertCircle className="h-3 w-3 text-amber-600" />
            )}
            <span>Organize by account and time period</span>
          </div>
        </div>
      </div>
    </div>
  );
} 