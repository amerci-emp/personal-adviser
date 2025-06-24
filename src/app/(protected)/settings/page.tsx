import { requireAuth } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LogoutButton } from "@/components/auth/logout-button";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GoogleSheetsSection } from "@/components/settings/google-sheets-section";
import { CategoryCustomization } from "@/components/settings/category-customization";
import { prisma } from "@/lib/prisma";

export default async function SettingsPage() {
  const session = await requireAuth();
  const user = session.user;

  // Check if user has Google account connected with Sheets scope
  const googleAccount = await prisma.account.findFirst({
    where: {
      userId: session.user.id,
      provider: "google",
    },
  });

  // Check if the Google account has the required Sheets scope
  const hasSheetsPermission = googleAccount?.scope?.includes("https://www.googleapis.com/auth/spreadsheets") || false;

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center mb-8">
        <Link href="/dashboard">
          <Button variant="outline" size="sm" className="mr-4">
            ← Back to Dashboard
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              View and manage your account settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-1">
                Name
              </h3>
              <p>{user?.name || "Not provided"}</p>
            </div>
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-1">
                Email
              </h3>
              <p>{user?.email || "Not provided"}</p>
            </div>
            <div className="pt-4">
              <LogoutButton />
            </div>
          </CardContent>
        </Card>

        {/* Google Sheets Integration Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Google Sheets Export</span>
              <Badge variant={hasSheetsPermission ? "default" : "secondary"}>
                {hasSheetsPermission ? "Ready" : "Setup Required"}
              </Badge>
            </CardTitle>
            <CardDescription>
              Connect your Google account to export transactions to Google Sheets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GoogleSheetsSection 
              isConnected={!!googleAccount}
              hasSheetsPermission={hasSheetsPermission}
              userEmail={session.user.email}
            />
          </CardContent>
        </Card>
      </div>

      {/* Category Customization Section (Full Width) */}
      <div className="mt-8">
        <CategoryCustomization />
      </div>
    </div>
  );
}