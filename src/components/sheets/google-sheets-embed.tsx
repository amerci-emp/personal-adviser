"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Loader2, Maximize2, Minimize2, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface GoogleSheetsEmbedProps {
  spreadsheetId: string;
  spreadsheetUrl?: string | null;
  className?: string;
}

type ViewMode = "edit" | "view" | "preview";
type EmbedSize = "compact" | "normal" | "fullscreen";

export function GoogleSheetsEmbed({ 
  spreadsheetId, 
  spreadsheetUrl, 
  className 
}: GoogleSheetsEmbedProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("view");
  const [embedSize, setEmbedSize] = useState<EmbedSize>("normal");
  const [showControls, setShowControls] = useState(true);

  // Generate the embed URL based on current settings
  const getEmbedUrl = () => {
    const baseUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
    
    switch (viewMode) {
      case "edit":
        return `${baseUrl}/edit?usp=sharing&embedded=true`;
      case "view":
        return `${baseUrl}/edit?usp=sharing&embedded=true&rm=minimal`;
      case "preview":
        return `${baseUrl}/preview?usp=sharing&embedded=true`;
      default:
        return `${baseUrl}/edit?usp=sharing&embedded=true&rm=minimal`;
    }
  };

  const getSizeClasses = () => {
    switch (embedSize) {
      case "compact":
        return "h-96";
      case "normal":
        return "h-[600px]";
      case "fullscreen":
        return "h-[80vh]";
      default:
        return "h-[600px]";
    }
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  useEffect(() => {
    // Reset loading state when URL changes
    setIsLoading(true);
    setHasError(false);
  }, [viewMode, spreadsheetId]);

  if (!spreadsheetId) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>No spreadsheet ID provided</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Controls */}
      {showControls && (
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex flex-wrap items-center gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">View Mode</label>
              <Select value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">
                    <div className="flex items-center gap-2">
                      <Eye className="h-3 w-3" />
                      View
                    </div>
                  </SelectItem>
                  <SelectItem value="edit">
                    <div className="flex items-center gap-2">
                      <Maximize2 className="h-3 w-3" />
                      Edit
                    </div>
                  </SelectItem>
                  <SelectItem value="preview">
                    <div className="flex items-center gap-2">
                      <EyeOff className="h-3 w-3" />
                      Preview
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Size</label>
              <Select value={embedSize} onValueChange={(value) => setEmbedSize(value as EmbedSize)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">Compact</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="fullscreen">Fullscreen</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {isLoading ? "Loading..." : hasError ? "Error" : "Ready"}
              </Badge>
              {viewMode === "edit" && (
                <Badge variant="outline" className="text-xs">
                  Interactive
                </Badge>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowControls(false)}
            className="text-muted-foreground"
          >
            <Minimize2 className="h-4 w-4" />
            Hide Controls
          </Button>
        </div>
      )}

      {!showControls && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowControls(true)}
            className="text-muted-foreground"
          >
            <Maximize2 className="h-4 w-4" />
            Show Controls
          </Button>
        </div>
      )}

      {/* Embed Container */}
      <div className="relative">
        {/* Loading State */}
        {isLoading && (
          <div className={cn(
            "absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg border",
            getSizeClasses()
          )}>
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading your spreadsheet...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {hasError && (
          <div className={cn(
            "flex items-center justify-center bg-destructive/5 border border-destructive/20 rounded-lg",
            getSizeClasses()
          )}>
            <div className="text-center space-y-3">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
              <div className="space-y-1">
                <h3 className="font-medium text-destructive">Failed to load spreadsheet</h3>
                <p className="text-sm text-muted-foreground">
                  The spreadsheet might not be shared properly or there could be a connectivity issue.
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a
                    href={spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open in New Tab
                  </a>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Iframe */}
        <iframe
          src={getEmbedUrl()}
          className={cn(
            "w-full border rounded-lg bg-background transition-opacity",
            getSizeClasses(),
            isLoading || hasError ? "opacity-0" : "opacity-100"
          )}
          title="Google Sheets - Personal Finance"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          allow="camera; microphone; fullscreen; display-capture"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        />
      </div>

      {/* Help Text */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p>
          <strong>Tip:</strong> Use "Edit" mode for full functionality, "View" for read-only access, or "Preview" for a simplified view.
        </p>
        {viewMode === "edit" && (
          <p className="text-amber-600">
            <strong>Note:</strong> Changes made here will be saved directly to your Google Sheets.
          </p>
        )}
      </div>
    </div>
  );
} 