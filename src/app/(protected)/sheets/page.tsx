import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
    <div className="container mx-auto py-2">
      <SheetsPageClient 
        personalFinanceSpreadsheet={personalFinanceSpreadsheet}
        hasSheetsPermission={hasSheetsPermission}
        userEmail={session.user.email}
      />
    </div>
  );
} 