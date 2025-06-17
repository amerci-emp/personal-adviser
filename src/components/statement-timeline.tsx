"use client";

import * as React from "react";
import { format, isAfter, isBefore, subMonths, parseISO, isSameMonth, isSameYear, differenceInMonths } from "date-fns";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  FileText, 
  Calendar, 
  Info, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  ChevronRight, 
  Calendar as CalendarIcon 
} from "lucide-react";
import { analyzeStatementTimeline, TimelineGap } from "@/lib/timeline-analyzer";

type Statement = {
  id: string;
  filename: string;
  status: string;
  uploadTimestamp: Date;
  periodStart?: Date | null;
  periodEnd?: Date | null;
};

type StatementTimelineProps = {
  statements: Statement[];
  accountId: string;
  limit?: number;
  statementFrequency?: 'MONTHLY' | 'QUARTERLY' | 'WEEKLY' | 'BIWEEKLY' | null;
};

// Organize statements by year and month
type TimelineItem = {
  date: Date;
  type: 'timeMarker' | 'statement' | 'gap';
  statement?: Statement;
  gap?: TimelineGap;
  isNewYear?: boolean;
  height?: number; // Height for period line (in pixels)
};

function getStatusBadge(status: string) {
  switch (status) {
    case "COMPLETED":
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Completed
        </Badge>
      );
    case "REVIEW_NEEDED":
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          <AlertCircle className="h-3 w-3 mr-1" />
          Review Needed
        </Badge>
      );
    case "FAILED":
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Failed
        </Badge>
      );
    case "PROCESSING":
    case "UPLOADED":
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <Clock className="h-3 w-3 mr-1" />
          Processing
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          {status.charAt(0) + status.slice(1).toLowerCase().replace("_", " ")}
        </Badge>
      );
  }
}

function formatDate(date: Date | null | undefined, formatStr = "MMM d, yyyy") {
  if (!date) return "";
  return format(new Date(date), formatStr);
}

function getStatusColor(status: string): string {
  switch (status) {
    case "COMPLETED":
      return "bg-green-500";
    case "REVIEW_NEEDED":
      return "bg-yellow-500";
    case "FAILED":
      return "bg-red-500";
    case "PROCESSING":
    case "UPLOADED":
      return "bg-blue-500";
    default:
      return "bg-gray-500";
  }
}

function getLineColor(status: string): string {
  switch (status) {
    case "COMPLETED":
      return "bg-green-400";
    case "REVIEW_NEEDED":
      return "bg-yellow-400";
    case "FAILED":
      return "bg-red-400";
    case "PROCESSING":
    case "UPLOADED":
      return "bg-blue-400";
    default:
      return "bg-gray-400";
  }
}

export function StatementTimeline({ statements, accountId, limit = 5, statementFrequency = 'MONTHLY' }: StatementTimelineProps) {
  // Filter only statements with period data and sort chronologically
  const validStatements = React.useMemo(() => {
    return [...statements]
      .filter(s => s.periodStart && s.periodEnd)
      .sort((a, b) => {
        // Sort by period end date (most recent first)
        if (a.periodEnd && b.periodEnd) {
          return new Date(b.periodEnd).getTime() - new Date(a.periodEnd).getTime();
        }
        return 0;
      })
      .slice(0, limit);
  }, [statements, limit]);

  // Analyze timeline for gaps
  const analysis = React.useMemo(() => {
    return analyzeStatementTimeline(
      validStatements as any, 
      { id: accountId, statementFrequency }, 
      12 // 12 month lookback
    );
  }, [validStatements, accountId, statementFrequency]);

  // Generate timeline items (both time markers and statements)
  const timelineItems = React.useMemo(() => {
    const items: TimelineItem[] = [];
    
    if (validStatements.length === 0) {
      return items;
    }

    // Create a set of unique year/month combinations from statements
    const timePoints = new Set<string>();
    
    // Track min and max dates to ensure we have a complete timeline
    let minDate: Date | null = null;
    let maxDate: Date | null = null;
    
    // Add both period start and period end dates to capture the full range
    validStatements.forEach(statement => {
      if (statement.periodStart) {
        const startDate = new Date(statement.periodStart);
        timePoints.add(`${startDate.getFullYear()}-${startDate.getMonth()}`);
        
        if (!minDate || startDate < minDate) {
          minDate = startDate;
        }
      }
      
      if (statement.periodEnd) {
        const endDate = new Date(statement.periodEnd);
        timePoints.add(`${endDate.getFullYear()}-${endDate.getMonth()}`);
        
        if (!maxDate || endDate > maxDate) {
          maxDate = endDate;
        }
      }
    });
    
    // Fill in any gaps in the timeline to ensure continuous monthly markers
    if (minDate && maxDate) {
      let currentDate = new Date(minDate);
      const endDate = new Date(maxDate);
      while (currentDate <= endDate) {
        timePoints.add(`${currentDate.getFullYear()}-${currentDate.getMonth()}`);
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }
    
    // Convert the set to an array of dates and sort chronologically (newest first)
    const sortedTimePoints = Array.from(timePoints)
      .map(point => {
        const [year, month] = point.split('-').map(Number);
        return new Date(year, month);
      })
      .sort((a, b) => b.getTime() - a.getTime())
      .slice(0, 3); // Limit to 3 time markers
    
    // Add time markers
    sortedTimePoints.forEach((date, index) => {
      // Add a time marker
      const isNewYear = index === 0 || date.getFullYear() !== sortedTimePoints[index-1]?.getFullYear();
      items.push({
        date,
        type: 'timeMarker',
        isNewYear
      });
    });
    
    // Add statements (separate from time markers)
    validStatements.forEach(statement => {
      if (statement.periodEnd && statement.periodStart) {
        const periodLengthMonths = differenceInMonths(
          new Date(statement.periodEnd), 
          new Date(statement.periodStart)
        );
        // Calculate height based on period length (1 month = 24px)
        // Minimum height of 24px, maximum of 60px to avoid excessive height
        const height = Math.max(24, Math.min(60, periodLengthMonths * 24));
        
        items.push({
          date: new Date(statement.periodEnd),
          type: 'statement',
          statement,
          height
        });
      }
    });
    
    // Add gaps (if analysis is available)
    if (analysis.hasGaps) {
      analysis.gaps.forEach(gap => {
        // Only add gaps that are within the displayed timeframe
        if (validStatements.some(s => 
          (s.periodStart && isBefore(new Date(gap.startDate), new Date(s.periodStart))) ||
          (s.periodEnd && isAfter(new Date(gap.endDate), new Date(s.periodEnd)))
        )) {
          const durationMonths = differenceInMonths(gap.endDate, gap.startDate);
          const height = Math.max(20, Math.min(40, durationMonths * 20));
          
          items.push({
            date: gap.endDate,
            type: 'gap',
            gap,
            height
          });
        }
      });
    }
    
    // Sort all items chronologically (newest first)
    items.sort((a, b) => b.date.getTime() - a.date.getTime());
    
    return items;
  }, [validStatements, analysis]);

  // If no statements with period data, show empty state
  if (validStatements.length === 0) {
    return (
      <div className="flex flex-col items-center py-2 text-center">
        <Calendar className="h-5 w-5 text-muted-foreground mb-1" />
        <p className="text-sm text-muted-foreground mb-2">No statements available</p>
        <Link href={`/upload?accountId=${accountId}`}>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
            <Upload className="h-3 w-3" />
            Upload Statement
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-0 pb-0">
      {/* Header with title and View All */}
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <h3 className="text-base font-semibold bg-green-50 px-2 py-1 rounded-md">Statement Timeline</h3>
          {analysis.hasGaps && (
            <Badge variant="outline" className="ml-2 bg-amber-50 text-amber-700 border-amber-200">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Missing Statements
            </Badge>
          )}
        </div>
        <Link href={`/statements?account=${accountId}`} className="text-sm text-muted-foreground hover:text-foreground flex items-center">
          View All
          <ChevronRight className="h-4 w-4 ml-1" />
        </Link>
      </div>
      
      {/* Timeline container */}
      <div className="relative border rounded-lg mt-3">
        <div className="absolute top-2 right-2 z-10">
          <Link href={`/upload?accountId=${accountId}`}>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
              <Upload className="h-3 w-3" />
              Upload Statement
            </Button>
          </Link>
        </div>
        
        <div className="pl-0 pt-10 pb-2 pr-2">
          
          {/* Timeline items */}
          {timelineItems.map((item, index) => (
            <div 
              key={`${item.type}-${item.type === 'statement' ? item.statement?.id : index}`} 
              className="relative"
            >
              {item.type === 'statement' && item.statement && (
                <div className="mb-2 relative">
                  {/* Vertical connecting line for statement period */}
                  {item.statement.periodStart && item.statement.periodEnd && (
                    <div 
                      className="absolute left-6 transform -translate-x-1/2" 
                      style={{
                        top: 0,
                        height: `${item.height || 24}px`,
                        width: '3px'
                      }}
                    >
                      <div className={`w-full h-full ${getLineColor(item.statement.status)}`}></div>
                    </div>
                  )}
                  
                  {/* Statement box */}
                  <div className="flex items-center ml-10 relative top-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div 
                            className="flex items-center bg-white border rounded-md px-2 py-0.5 shadow-sm hover:bg-gray-50 cursor-default w-full text-sm"
                          >
                            {/* Statement filename */}
                            <div className="text-sm truncate mr-2 flex-1 font-normal">
                              {item.statement.filename}
                            </div>
                            
                            {/* Period information */}
                            <div className="text-xs text-gray-500 whitespace-nowrap">
                              {item.statement.periodStart && item.statement.periodEnd && (
                                formatDate(item.statement.periodStart, "MMM d") + " - " + 
                                formatDate(item.statement.periodEnd, "MMM d, yyyy")
                              )}
                            </div>
                            
                            {/* Status text on the right */}
                            <div className={`ml-2 text-xs whitespace-nowrap font-medium
                              ${item.statement.status === "COMPLETED" ? "text-green-600" : 
                               item.statement.status === "FAILED" ? "text-red-600" : 
                               item.statement.status === "REVIEW_NEEDED" ? "text-yellow-600" : 
                               "text-blue-600"}`}
                            >
                              {item.statement.status === "COMPLETED" ? "Completed" : 
                               item.statement.status === "FAILED" ? "Failed" : 
                               item.statement.status === "REVIEW_NEEDED" ? "Review Needed" : 
                               "Processing"}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <div className="space-y-1.5">
                            <p className="text-sm font-medium">{item.statement.filename}</p>
                            <div className="text-xs flex items-center">
                              <Calendar className="h-3 w-3 mr-1 text-muted-foreground" />
                              {item.statement.periodStart && item.statement.periodEnd ? (
                                <span>Period: {formatDate(item.statement.periodStart)} - {formatDate(item.statement.periodEnd)}</span>
                              ) : (
                                <span>No period information</span>
                              )}
                            </div>
                            <div className="text-xs flex items-center">
                              <Clock className="h-3 w-3 mr-1 text-muted-foreground" />
                              <span>Uploaded: {formatDate(item.statement.uploadTimestamp)}</span>
                            </div>
                            <div className="text-xs flex items-center">
                              <Info className="h-3 w-3 mr-1 text-muted-foreground" />
                              <span>Status: {item.statement.status.charAt(0) + item.statement.status.slice(1).toLowerCase().replace("_", " ")}</span>
                            </div>
                            {item.statement.status === "REVIEW_NEEDED" && (
                              <Link href={`/statements/review/${item.statement.id}`} className="block mt-1">
                                <Button variant="outline" size="sm" className="w-full h-7 text-xs">
                                  Review Now
                                </Button>
                              </Link>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              )}
              
              {item.type === 'gap' && item.gap && (
                <div className="mb-2 relative">
                  {/* Gap indicator vertical line (dashed) */}
                  <div 
                    className="absolute left-6 transform -translate-x-1/2" 
                    style={{
                      top: 0,
                      height: `${item.height || 24}px`,
                      width: '3px'
                    }}
                  >
                    <div className="w-full h-full bg-amber-300 opacity-60 border-l-2 border-dashed border-amber-400"></div>
                  </div>
                  
                  {/* Gap notification */}
                  <div className="flex items-center ml-10 relative top-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center bg-amber-50 border border-amber-200 rounded-md px-2 py-0.5 shadow-sm hover:bg-amber-100 cursor-default w-full text-sm">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mr-2" />
                            <div className="text-sm text-amber-700 flex-1">
                              Missing Statement{item.gap.durationInDays > 45 ? 's' : ''}
                            </div>
                            
                            {/* Period information */}
                            <div className="text-xs text-amber-600 whitespace-nowrap">
                              {formatDate(item.gap.startDate, "MMM d")} - {formatDate(item.gap.endDate, "MMM d, yyyy")}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <div className="space-y-1.5">
                            <p className="text-sm font-medium flex items-center">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mr-1.5" />
                              {item.gap.isCritical ? 'Critical Gap Detected' : 'Missing Statement Period'}
                            </p>
                            <div className="text-xs flex items-center">
                              <Calendar className="h-3 w-3 mr-1 text-muted-foreground" />
                              <span>Period: {formatDate(item.gap.startDate)} - {formatDate(item.gap.endDate)}</span>
                            </div>
                            <div className="text-xs flex items-center">
                              <Info className="h-3 w-3 mr-1 text-muted-foreground" />
                              <span>Duration: {item.gap.durationInDays} days</span>
                            </div>
                            <div className="mt-1">
                              <Link href={`/upload?accountId=${accountId}`}>
                                <Button variant="outline" size="sm" className="w-full h-7 text-xs text-amber-700 hover:text-amber-800 border-amber-300">
                                  Upload Missing Statement
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Summary of coverage */}
        {analysis.hasGaps && (
          <div className="px-4 py-2 border-t text-xs text-muted-foreground">
            <span className="font-medium">Coverage: {analysis.coveragePercent}%</span>
            {analysis.missingMonths.length > 0 && (
              <span className="ml-2">
                Missing: {analysis.missingMonths.slice(0, 2).join(", ")}
                {analysis.missingMonths.length > 2 && ` +${analysis.missingMonths.length - 2} more`}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}