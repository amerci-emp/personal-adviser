import { requireAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
  ExternalLink,
} from "lucide-react";
import { format, formatDistance, differenceInDays, isAfter, isBefore, subMonths } from "date-fns";
import { prisma } from "@/lib/prisma";
import { StatementTimeline } from "@/components/statement-timeline";

// Define types based on the Prisma schema
type AccountType = "CHECKING" | "SAVINGS" | "CREDIT" | "INVESTMENT" | "OTHER";

type Statement = {
  id: string;
  filename: string;
  uploadTimestamp: Date;
  periodStart: Date | null;
  periodEnd: Date | null;
  status: string;
};

type BankAccount = {
  id: string;
  name: string;
  financialInstitution: string;
  accountType: AccountType;
  lastFourDigits: string | null;
  balance: { toString: () => string } | null;
  notes: string | null;
  color: string | null;
  institutionLogo: string | null;
  updatedAt: Date;
  statements: Statement[];
};

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

// Format date helper
function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "Unknown";
  try {
    return format(new Date(dateStr), 'MMM d, yyyy');
  } catch (e) {
    return String(dateStr);
  }
}

export default async function AccountsPage() {
  const session = await requireAuth();
  
  // Initialize with empty data
  let accounts: BankAccount[] = [];
  let hasError = false;
  let errorMessage = "";
  
  try {
    // Get accounts from database
    const accountsData = await prisma.bankAccount.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        statements: {
          orderBy: {
            uploadTimestamp: 'desc',
          },
          take: 2,
        },
      },
      orderBy: {
        financialInstitution: 'asc',
      },
    });
    
    accounts = accountsData as unknown as BankAccount[];
  } catch (error) {
    console.error("Error fetching accounts from database:", error);
    hasError = true;
    errorMessage = error instanceof Error ? error.message : "Unknown database error";
    accounts = [];
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
  const institutions = Object.keys(accountsByInstitution);

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Accounts</h1>
          <p className="text-muted-foreground">
            All your financial accounts
          </p>
        </div>
        <Link href="/upload">
          <Button size="lg">Upload New Statement</Button>
        </Link>
      </div>

      {hasError && (
        <Card className="mb-6 border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Database Error</CardTitle>
            <CardDescription>
              There was a problem fetching your account data
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

      <Card>
        <CardHeader>
          <CardTitle>Your Financial Accounts</CardTitle>
          <CardDescription>
            {accounts.length > 0 
              ? `You have ${accounts.length} accounts across ${institutions.length} financial institutions`
              : "You don't have any accounts yet. Upload a statement to create your first account."}
          </CardDescription>
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
                  <div className="grid gap-4 md:grid-cols-2">
                    {accountsByInstitution[institution].map((account) => (
                      <div 
                        key={account.id} 
                        className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {getAccountTypeIcon(account.accountType)}
                            <div>
                              <h3 className="font-medium">{account.name}</h3>
                              <div className="text-sm text-muted-foreground">
                                {account.lastFourDigits ? `•••• ${account.lastFourDigits}` : ''}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            {account.balance ? (
                              <div className="font-medium">
                                ${parseFloat(account.balance.toString()).toFixed(2)}
                              </div>
                            ) : (
                              <div className="text-muted-foreground">Balance unavailable</div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              Last updated: {formatDate(account.updatedAt)}
                            </div>
                          </div>
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
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 