"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface GoogleSheetsEmbedProps {
  spreadsheetId: string;
  spreadsheetUrl?: string | null;
  className?: string;
  viewMode: ViewMode;
  embedSize: EmbedSize;
}

type ViewMode = "edit" | "view" | "preview";
type EmbedSize = "compact" | "normal" | "fullscreen";

export function GoogleSheetsEmbed({ 
  spreadsheetId, 
  spreadsheetUrl, 
  className,
  viewMode,
  embedSize
}: GoogleSheetsEmbedProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Generate the embed URL based on current settings
  const getEmbedUrl = () => {
    const baseUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
    
    switch (viewMode) {
      case "edit":
        return `${baseUrl}/edit?usp=sharing&embedded=true`;
      case "view":
        return `${baseUrl}/edit?usp=sharing&embedded=true&rm=minimal&chrome=false`;
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
        return "h-[85vh]";
      default:
        return "h-[85vh]";
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

  // Touch event handlers to prevent swipe navigation
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;

      // Calculate if this is primarily a horizontal swipe
      const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);
      const isSignificantSwipe = Math.abs(deltaX) > 30; // Minimum distance to consider it a swipe

      // Prevent navigation if it's a significant horizontal swipe
      if (isHorizontalSwipe && isSignificantSwipe) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleTouchEnd = () => {
      touchStartRef.current = null;
    };

    // Add event listeners with passive: false to allow preventDefault
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

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
    <div className={cn("", className)}>

      {/* Embed Container */}
      <div 
        ref={containerRef}
        className="relative"
        style={{ touchAction: 'pan-y' }} // Allow vertical panning only
      >
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


    </div>
  );
} 