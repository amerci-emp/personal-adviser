import { requireAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await requireAuth();

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {session?.user?.name || "User"}
          </p>
        </div>
        <Link href="/upload">
          <Button size="lg">Upload New Statement</Button>
        </Link>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Recent Uploads</CardTitle>
          <CardDescription>
            Your 5 most recent statement uploads
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-10">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-muted p-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-10 text-muted-foreground"
                >
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-medium">No statements uploaded yet</h3>
            <p className="text-muted-foreground mt-2 mb-6">
              Upload your first financial statement to get started.
            </p>
            <Link href="/upload">
              <Button variant="outline">Upload Your First Statement</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
