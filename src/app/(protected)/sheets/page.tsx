import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SheetsPageClient } from "@/components/sheets/sheets-page-client";

export default async function SheetsPage() {
  const session = await requireAuth();
  
  // Get user's Personal Finance spreadsheet
  const personalFinanceSpreadsheet = await prisma.personalFinanceSpreadsheet.findUnique({
    where: { userId: session.user.id },
    include: {
      monthlySheets: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });

  // Check if user has Google Sheets permission
  const googleAccount = await prisma.account.findFirst({
    where: {
      userId: session.user.id,
      provider: "google",
    },
  });

  const hasSheetsPermission = googleAccount?.scope?.includes("https://www.googleapis.com/auth/spreadsheets") || false;

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              ← Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Your Financial Sheets</h1>
            <p className="text-muted-foreground">
              View and interact with your exported transaction data
            </p>
          </div>
        </div>
      </div>

      <SheetsPageClient 
        personalFinanceSpreadsheet={personalFinanceSpreadsheet}
        hasSheetsPermission={hasSheetsPermission}
        userEmail={session.user.email}
      />
    </div>
  );
} 