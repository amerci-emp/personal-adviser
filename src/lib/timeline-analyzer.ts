import { addMonths, differenceInDays, differenceInMonths, format, isAfter, isBefore, isSameMonth, subMonths } from "date-fns";

type Statement = {
  id: string;
  periodStart: Date | null;
  periodEnd: Date | null;
  status: string;
};

type Account = {
  id: string;
  statementFrequency?: 'MONTHLY' | 'QUARTERLY' | 'WEEKLY' | 'BIWEEKLY' | null;
};

export type TimelineGap = {
  startDate: Date;
  endDate: Date;
  durationInDays: number;
  isCritical: boolean; // Gap is larger than expected based on frequency
};

export type TimelineAnalysis = {
  hasGaps: boolean;
  gaps: TimelineGap[];
  coveragePercent: number;
  oldestStatementDate: Date | null;
  newestStatementDate: Date | null;
  totalGapDays: number;
  totalCoverageDays: number;
  missingMonths: string[];
};

/**
 * Detects gaps in statement coverage for an account
 */
export function analyzeStatementTimeline(
  statements: Statement[],
  account: Account,
  lookbackMonths = 12
): TimelineAnalysis {
  // Filter valid statements with period dates and completed processing
  const validStatements = statements
    .filter(s => s.periodStart && s.periodEnd && s.status !== 'FAILED')
    .map(s => ({
      ...s,
      periodStart: s.periodStart ? new Date(s.periodStart) : null,
      periodEnd: s.periodEnd ? new Date(s.periodEnd) : null,
    }))
    .sort((a, b) => {
      if (!a.periodStart || !b.periodStart) return 0;
      return a.periodStart.getTime() - b.periodStart.getTime();
    });

  // Initialize analysis result
  const result: TimelineAnalysis = {
    hasGaps: false,
    gaps: [],
    coveragePercent: 0,
    oldestStatementDate: null,
    newestStatementDate: null,
    totalGapDays: 0,
    totalCoverageDays: 0,
    missingMonths: [],
  };

  // If no valid statements, return result indicating no coverage
  if (validStatements.length === 0) {
    return result;
  }

  // Determine frequency in days for this account
  const frequencyInDays = getFrequencyInDays(account.statementFrequency || 'MONTHLY');
  
  // Determine the lookback period
  const today = new Date();
  const lookbackDate = subMonths(today, lookbackMonths);
  
  // Set oldest and newest statement dates
  result.oldestStatementDate = validStatements[0].periodStart;
  result.newestStatementDate = validStatements[validStatements.length - 1].periodEnd;
  
  // Adjust analysis range based on lookback period
  const analysisStartDate = isAfter(lookbackDate, validStatements[0].periodStart!)
    ? lookbackDate
    : validStatements[0].periodStart!;
  
  const analysisEndDate = isBefore(today, validStatements[validStatements.length - 1].periodEnd!)
    ? today
    : validStatements[validStatements.length - 1].periodEnd!;
  
  // Calculate total days in analysis period
  const totalDays = differenceInDays(analysisEndDate, analysisStartDate);
  
  // Identify gaps between statements
  for (let i = 0; i < validStatements.length - 1; i++) {
    const currentEnd = validStatements[i].periodEnd!;
    const nextStart = validStatements[i + 1].periodStart!;
    
    // Check if there's a gap
    if (differenceInDays(nextStart, currentEnd) > 1) {
      // Gap detected
      const gap: TimelineGap = {
        startDate: new Date(currentEnd),
        endDate: new Date(nextStart),
        durationInDays: differenceInDays(nextStart, currentEnd),
        isCritical: differenceInDays(nextStart, currentEnd) > frequencyInDays * 1.5,
      };
      
      result.gaps.push(gap);
      result.totalGapDays += gap.durationInDays;
      
      // Add missing months to the missing months list
      const missingMonths = getMissingMonthsInGap(gap.startDate, gap.endDate);
      result.missingMonths = [...result.missingMonths, ...missingMonths];
    }
  }
  
  // Check for gap at the beginning (between lookback date and first statement)
  if (isAfter(validStatements[0].periodStart!, lookbackDate)) {
    const gap: TimelineGap = {
      startDate: new Date(lookbackDate),
      endDate: new Date(validStatements[0].periodStart!),
      durationInDays: differenceInDays(validStatements[0].periodStart!, lookbackDate),
      isCritical: differenceInDays(validStatements[0].periodStart!, lookbackDate) > frequencyInDays * 1.5,
    };
    
    result.gaps.push(gap);
    result.totalGapDays += gap.durationInDays;
    
    // Add missing months to the missing months list
    const missingMonths = getMissingMonthsInGap(gap.startDate, gap.endDate);
    result.missingMonths = [...result.missingMonths, ...missingMonths];
  }
  
  // Check for gap at the end (between last statement and today)
  if (isBefore(validStatements[validStatements.length - 1].periodEnd!, today)) {
    const gap: TimelineGap = {
      startDate: new Date(validStatements[validStatements.length - 1].periodEnd!),
      endDate: new Date(today),
      durationInDays: differenceInDays(today, validStatements[validStatements.length - 1].periodEnd!),
      isCritical: differenceInDays(today, validStatements[validStatements.length - 1].periodEnd!) > frequencyInDays * 1.5,
    };
    
    result.gaps.push(gap);
    result.totalGapDays += gap.durationInDays;
    
    // Add missing months to the missing months list
    const missingMonths = getMissingMonthsInGap(gap.startDate, gap.endDate);
    result.missingMonths = [...result.missingMonths, ...missingMonths];
  }
  
  // Calculate coverage metrics
  result.hasGaps = result.gaps.length > 0;
  result.totalCoverageDays = totalDays - result.totalGapDays;
  result.coveragePercent = Math.round((result.totalCoverageDays / totalDays) * 100);
  
  // Remove duplicates from missing months
  result.missingMonths = [...new Set(result.missingMonths)];
  
  return result;
}

/**
 * Gets the approximate frequency in days based on statement frequency
 */
function getFrequencyInDays(frequency: 'MONTHLY' | 'QUARTERLY' | 'WEEKLY' | 'BIWEEKLY'): number {
  switch (frequency) {
    case 'WEEKLY':
      return 7;
    case 'BIWEEKLY':
      return 14;
    case 'MONTHLY':
      return 30;
    case 'QUARTERLY':
      return 90;
    default:
      return 30; // Default to monthly
  }
}

/**
 * Get an array of formatted strings representing missing months in a gap
 */
function getMissingMonthsInGap(startDate: Date, endDate: Date): string[] {
  const months: string[] = [];
  let currentDate = new Date(startDate);
  
  // Advance to the first of the next month
  currentDate.setDate(1);
  currentDate = addMonths(currentDate, 1);
  
  while (isBefore(currentDate, endDate)) {
    months.push(format(currentDate, 'MMM yyyy'));
    currentDate = addMonths(currentDate, 1);
  }
  
  return months;
}

/**
 * Identifies expected statements based on frequency, and returns missing statements
 */
export function getExpectedMissingStatements(
  statements: Statement[],
  account: Account,
  lookbackMonths = 12
): { month: string, expected: Date }[] {
  // Get frequency
  const frequency = account.statementFrequency || 'MONTHLY';
  
  // Determine the lookback period
  const today = new Date();
  const lookbackDate = subMonths(today, lookbackMonths);
  
  // Generate expected statement dates based on frequency
  const expectedDates: Date[] = [];
  let currentDate = new Date(lookbackDate);
  
  // Normalize to the start of the month for monthly/quarterly
  if (frequency === 'MONTHLY' || frequency === 'QUARTERLY') {
    currentDate.setDate(1);
  }
  
  while (isBefore(currentDate, today)) {
    expectedDates.push(new Date(currentDate));
    
    // Advance based on frequency
    switch (frequency) {
      case 'WEEKLY':
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case 'BIWEEKLY':
        currentDate.setDate(currentDate.getDate() + 14);
        break;
      case 'MONTHLY':
        currentDate = addMonths(currentDate, 1);
        break;
      case 'QUARTERLY':
        currentDate = addMonths(currentDate, 3);
        break;
    }
  }
  
  // Filter out dates that are covered by existing statements
  const missingDates = expectedDates.filter(expectedDate => {
    // Check if this expected date is covered by any statement
    return !statements.some(statement => {
      if (!statement.periodStart || !statement.periodEnd) return false;
      
      const start = new Date(statement.periodStart);
      const end = new Date(statement.periodEnd);
      
      return (
        (isSameMonth(expectedDate, start) || isSameMonth(expectedDate, end)) ||
        (isAfter(expectedDate, start) && isBefore(expectedDate, end))
      );
    });
  });
  
  // Format into month strings
  return missingDates.map(date => ({
    month: format(date, 'MMM yyyy'),
    expected: date
  }));
} 