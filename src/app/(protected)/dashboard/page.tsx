import { requireAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  ChevronRight,
  Building,
  CreditCard,
  PiggyBank,
  Wallet,
  BarChart,
  Clock,
  FileText,
  Upload,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Calendar,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { format, formatDistance, differenceInDays, isAfter, isBefore, subMonths } from "date-fns";
import { prisma } from "@/lib/prisma";
import { StatementTimeline } from "@/components/statement-timeline";

// Helper function to get the appropriate icon for account type
function getAccountTypeIcon(type: string) {
  switch (type) {
    case "CHECKING":
      return <Wallet className="h-5 w-5" />;
    case "SAVINGS":
      return <PiggyBank className="h-5 w-5" />;
    case "CREDIT":
      return <CreditCard className="h-5 w-5" />;
    case "INVESTMENT":
      return <BarChart className="h-5 w-5" />;
    default:
      return <CreditCard className="h-5 w-5" />;
  }
}

// Helper function to get status badge for statements
function getStatusBadge(status: string) {
  switch (status) {
    case "UPLOADED":
      return <Badge variant="outline">Uploaded</Badge>;
    case "PROCESSING":
      return <Badge variant="secondary">Processing</Badge>;
    case "REVIEW_NEEDED":
      return <Badge className="bg-yellow-500">Needs Review</Badge>;
    case "COMPLETED":
      return <Badge className="bg-green-500">Completed</Badge>;
    case "FAILED":
      return <Badge variant="destructive">Failed</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

// Helper function to get account coverage status
function getAccountStatus(account: BankAccount) {
  // Default status if no statements
  if (!account.statements || account.statements.length === 0) {
    return {
      status: "NO_STATEMENTS",
      label: "No Statements",
      description: "Upload statements to track this account",
      color: "text-gray-500",
      icon: <AlertCircle className="h-4 w-4 text-gray-500" />,
    };
  }

  // Check for any failed statement
  const hasFailedStatement = account.statements.some(stmt => stmt.status === "FAILED");
  if (hasFailedStatement) {
    return {
      status: "ATTENTION_NEEDED",
      label: "Attention Needed",
      description: "Some statements failed processing",
      color: "text-red-500",
      icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
    };
  }

  // Check for any statement needing review
  const hasReviewNeeded = account.statements.some(stmt => stmt.status === "REVIEW_NEEDED");
  if (hasReviewNeeded) {
    return {
      status: "REVIEW_NEEDED",
      label: "Review Needed",
      description: "Some statements need your review",
      color: "text-yellow-500",
      icon: <AlertCircle className="h-4 w-4 text-yellow-500" />,
    };
  }

  // Check statement coverage - find latest statement with period info
  const statementsWithPeriod = account.statements.filter(
    stmt => stmt.periodStart && stmt.periodEnd
  );
  
  if (statementsWithPeriod.length > 0) {
    // Sort by period end date, descending
    const sortedStatements = [...statementsWithPeriod].sort((a, b) => {
      if (!a.periodEnd || !b.periodEnd) return 0;
      return isBefore(new Date(a.periodEnd), new Date(b.periodEnd)) ? 1 : -1;
    });

    const latestStatement = sortedStatements[0];
    const today = new Date();
    
    // If latest statement's end date is within last 30 days, account is up to date
    if (latestStatement.periodEnd && isAfter(new Date(latestStatement.periodEnd), subMonths(today, 1))) {
      return {
        status: "UP_TO_DATE",
        label: "Up to Date",
        description: "Recent statements available",
        color: "text-green-500",
        icon: <CheckCircle className="h-4 w-4 text-green-500" />,
      };
    }
    
    // If latest statement's end date is older than 30 days, account needs update
    return {
      status: "NEEDS_UPDATE",
      label: "Needs Update",
      description: "Latest statement is more than 30 days old",
      color: "text-amber-500",
      icon: <Clock className="h-4 w-4 text-amber-500" />,
    };
  }

  // Default to in progress if we have statements but no period info
  return {
    status: "IN_PROGRESS",
    label: "In Progress",
    description: "Processing statements",
    color: "text-blue-500",
    icon: <Clock className="h-4 w-4 text-blue-500" />,
  };
}

// Format date function that handles nulls
function formatDate(date: Date | null | undefined, formatStr: string = "MMM d, yyyy") {
  if (!date) return "N/A";
  try {
    return format(new Date(date), formatStr);
  } catch (e) {
    return "Invalid date";
  }
}

// Format timeago
function formatTimeAgo(date: Date | null | undefined) {
  if (!date) return "N/A";
  try {
    return formatDistance(new Date(date), new Date(), { addSuffix: true });
  } catch (e) {
    return "Invalid date";
  }
}

// Type definitions for our data
type BankAccount = {
  id: string;
  name: string;
  financialInstitution: string;
  accountType: string;
  lastFourDigits?: string | null;
  balance?: any;
  updatedAt: Date;
  statements: Statement[];
};

type Statement = {
  id: string;
  filename: string;
  status: string;
  uploadTimestamp: Date;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  accounts: BankAccount[];
};

export default async function DashboardPage() {
  const session = await requireAuth();
  
  // Initialize with empty data
  let accounts: BankAccount[] = [];
  let recentStatements: Statement[] = [];
  let hasError = false;
  let errorMessage = "";
  
  try {
    console.log("Fetching bank accounts...");
    
    // Get real data from database
    const accountsData = await prisma.bankAccount.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        statements: {
          orderBy: {
            uploadTimestamp: 'desc',
          },
          take: 3, // Get a few more statements for better status assessment
        },
      },
      orderBy: {
        updatedAt: 'desc', // Show recently updated accounts first
      },
    });
    
    console.log(`Found ${accountsData.length} bank accounts`);
    // Use unknown as an intermediate step for type safety
    accounts = accountsData as unknown as BankAccount[];
    
    const statementsData = await prisma.statement.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        uploadTimestamp: 'desc',
      },
      take: 5,
      include: {
        accounts: true,
      },
    });
    
    console.log(`Found ${statementsData.length} statements`);
    // Use unknown as an intermediate step for type safety
    recentStatements = statementsData as unknown as Statement[];
  } catch (error) {
    console.error("Error fetching data from database:", error);
    hasError = true;
    errorMessage = error instanceof Error ? error.message : "Unknown database error";
    
    // Set up fallback data if needed - empty arrays
    accounts = [];
    recentStatements = [];
  }
  
  // Group accounts by financial institution
  const accountsByInstitution = accounts.reduce((acc: Record<string, BankAccount[]>, account) => {
    const institution = account.financialInstitution;
    if (!acc[institution]) {
      acc[institution] = [];
    }
    acc[institution].push(account);
    return acc;
  }, {});

  // Get all unique institutions for tabs
  const institutions = Object.keys(accountsByInstitution).sort();
  
  // Count statements by status
  const statusCounts = {
    processing: recentStatements.filter(s => s.status === "PROCESSING" || s.status === "UPLOADED").length,
    needsReview: recentStatements.filter(s => s.status === "REVIEW_NEEDED").length,
    completed: recentStatements.filter(s => s.status === "COMPLETED").length,
    failed: recentStatements.filter(s => s.status === "FAILED").length,
  };

  // Count accounts by status
  const accountStatusCounts = accounts.reduce((counts: Record<string, number>, account) => {
    const status = getAccountStatus(account).status;
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {session?.user?.name || "User"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/accounts">
            <Button variant="outline" className="gap-1">
              <Building className="h-4 w-4" />
              Manage Accounts
            </Button>
          </Link>
          <Link href="/upload">
            <Button size="default" className="gap-1">
              <Upload className="h-4 w-4" />
              Upload Statement
            </Button>
          </Link>
        </div>
      </div>

      {hasError && (
        <Card className="mb-6 border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Database Error</CardTitle>
            <CardDescription>
              There was a problem fetching your financial data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 border border-destructive/20 bg-destructive/10 rounded-md">
              <p className="text-destructive mb-1">Error details:</p>
              <pre className="text-sm overflow-auto p-2 bg-background/80 rounded">
                {errorMessage}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account Status Summary */}
      {accounts.length > 0 && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-green-50 border-green-100">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h3 className="font-medium">Up to Date</h3>
                </div>
                <div className="text-2xl font-semibold text-green-700">
                  {accountStatusCounts['UP_TO_DATE'] || 0}
                </div>
              </div>
              <p className="text-sm text-green-700 mt-1">Accounts with recent statements</p>
            </CardContent>
          </Card>
          
          <Card className="bg-amber-50 border-amber-100">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-600" />
                  <h3 className="font-medium">Needs Update</h3>
                </div>
                <div className="text-2xl font-semibold text-amber-700">
                  {accountStatusCounts['NEEDS_UPDATE'] || 0}
                </div>
              </div>
              <p className="text-sm text-amber-700 mt-1">Accounts missing recent statements</p>
            </CardContent>
          </Card>
          
          <Card className="bg-yellow-50 border-yellow-100">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <h3 className="font-medium">Review Needed</h3>
                </div>
                <div className="text-2xl font-semibold text-yellow-700">
                  {accountStatusCounts['REVIEW_NEEDED'] || 0}
                </div>
              </div>
              <p className="text-sm text-yellow-700 mt-1">Accounts with statements to review</p>
            </CardContent>
          </Card>
          
          <Card className="bg-blue-50 border-blue-100">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-blue-600" />
                  <h3 className="font-medium">Total Accounts</h3>
                </div>
                <div className="text-2xl font-semibold text-blue-700">{accounts.length}</div>
              </div>
              <p className="text-sm text-blue-700 mt-1">Across {institutions.length} institutions</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Bank Accounts (60% width) */}
        <div className="md:col-span-3">
          <Card className="mb-6">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Your Financial Accounts</CardTitle>
                  <CardDescription>
                    Overview of your bank accounts and their latest status
                  </CardDescription>
                </div>
                <Link href="/accounts">
                  <Button variant="ghost" size="sm" className="gap-1">
                    View All
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            
            <CardContent>
              {accounts.length === 0 ? (
                <div className="text-center py-8">
                  <Building className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <h3 className="text-lg font-medium">No accounts found</h3>
                  <p className="text-muted-foreground mt-1 mb-4">
                    Upload a statement to automatically create your first account.
                  </p>
                  <Link href="/upload">
                    <Button variant="outline">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Statement
                    </Button>
                  </Link>
                </div>
              ) : (
                <Tabs defaultValue={institutions[0] || "all"}>
                  <TabsList className="mb-4">
                    {institutions.map((institution) => (
                      <TabsTrigger key={institution} value={institution}>
                        {institution}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  
                  {institutions.map((institution) => (
                    <TabsContent key={institution} value={institution} className="space-y-4">
                      {accountsByInstitution[institution].map((account) => {
                        const accountStatus = getAccountStatus(account);
                        
                        return (
                          <div 
                            key={account.id} 
                            className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-gray-100 rounded-full">
                                  {getAccountTypeIcon(account.accountType)}
                                </div>
                                <div>
                                  <h3 className="font-medium">{account.name}</h3>
                                  <div className="text-sm text-muted-foreground">
                                    {account.lastFourDigits ? `•••• ${account.lastFourDigits}` : ''}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                {account.balance ? (
                                  <div className="font-semibold">
                                    ${parseFloat(account.balance.toString()).toFixed(2)}
                                  </div>
                                ) : (
                                  <div className="text-muted-foreground">Balance unavailable</div>
                                )}
                              </div>
                            </div>
                            
                            {/* Account Status Indicator */}
                            <div className="flex items-center gap-1.5 mb-3">
                              {accountStatus.icon}
                              <span className={`text-xs font-medium ${accountStatus.color}`}>
                                {accountStatus.label}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                - {accountStatus.description}
                              </span>
                            </div>
                            
                            {/* Recent statements for this account */}
                            {account.statements && account.statements.length > 0 ? (
                              <div className="mt-3 pt-3 border-t">
                                <StatementTimeline 
                                  statements={account.statements} 
                                  accountId={account.id} 
                                  limit={5}
                                />
                              </div>
                            ) : (
                              <div className="mt-3 pt-3 border-t">
                                <StatementTimeline 
                                  statements={[]} 
                                  accountId={account.id} 
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </TabsContent>
                  ))}
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Uploads (40% width) */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Recent Statements</CardTitle>
                  <CardDescription>
                    Your latest statement uploads and their status
                  </CardDescription>
                </div>
                {recentStatements.length > 0 && (
                  <Link href="/statements">
                    <Button variant="ghost" size="sm" className="gap-1">
                      View All
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </CardHeader>
            
            <CardContent>
              {recentStatements.length === 0 ? (
                <div className="text-center py-6">
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <h3 className="text-base font-medium">No statements uploaded yet</h3>
                  <p className="text-sm text-muted-foreground mt-1 mb-4">
                    Upload your first financial statement to get started.
                  </p>
                  <Link href="/upload">
                    <Button variant="outline" size="sm">Upload Statement</Button>
                  </Link>
                </div>
              ) : (
                <>
                  {/* Status summary */}
                  {statusCounts.processing > 0 && (
                    <div className="bg-blue-50 border border-blue-100 rounded-md p-3 mb-4 text-sm flex items-start gap-2">
                      <Clock className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-blue-800">
                          {statusCounts.processing === 1 
                            ? "1 statement is being processed" 
                            : `${statusCounts.processing} statements are being processed`}
                        </p>
                        <p className="text-blue-700 text-xs mt-0.5">
                          This may take a few minutes. Results will appear automatically.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {statusCounts.needsReview > 0 && (
                    <div className="bg-yellow-50 border border-yellow-100 rounded-md p-3 mb-4 text-sm flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-yellow-800">
                          {statusCounts.needsReview === 1 
                            ? "1 statement needs review" 
                            : `${statusCounts.needsReview} statements need review`}
                        </p>
                        <p className="text-yellow-700 text-xs mt-0.5">
                          Please review these statements to complete processing.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    {recentStatements.map((statement) => (
                      <div 
                        key={statement.id}
                        className="border rounded-lg p-3 hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-medium text-sm">{statement.filename}</h3>
                          {getStatusBadge(statement.status)}
                        </div>
                        
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                          <Clock className="h-3 w-3" />
                          <span>Uploaded {formatTimeAgo(statement.uploadTimestamp)}</span>
                        </div>
                        
                        {/* Associated account */}
                        {statement.accounts && statement.accounts.length > 0 && (
                          <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t">
                            <div className="flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              <span>{statement.accounts[0].financialInstitution}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {getAccountTypeIcon(statement.accounts[0].accountType)}
                              <span>{statement.accounts[0].name}</span>
                            </div>
                          </div>
                        )}
                        
                        {/* Statement period */}
                        {statement.periodStart && statement.periodEnd && (
                          <div className="text-xs mt-1 text-muted-foreground">
                            Period: {formatDate(statement.periodStart, "MMM d")} - 
                            {formatDate(statement.periodEnd, "MMM d, yyyy")}
                          </div>
                        )}
                        
                        {/* Statement actions */}
                        {statement.status === "REVIEW_NEEDED" && (
                          <div className="mt-2 pt-2 border-t flex justify-end">
                            <Link href={`/statements/review/${statement.id}`}>
                              <Button variant="outline" size="sm" className="h-7 text-xs">
                                Review Now
                              </Button>
                            </Link>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
            
            {recentStatements.length > 0 && (
              <CardFooter className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  {statusCounts.completed} complete · {statusCounts.processing} processing · {statusCounts.failed} failed
                </p>
                <Link href="/upload">
                  <Button variant="ghost" size="sm" className="gap-1">
                    Upload New
                    <Upload className="h-4 w-4" />
                  </Button>
                </Link>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
