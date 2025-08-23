"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format } from 'date-fns';

// Define a type for the transaction object
type Transaction = {
  id: string;
  description: string;
  amount: number;
  transactionDate: string;
  assignedCategory: string | null;
};

// A simplified list of categories. In a real app, this would come from the database.
const categories = [
  "Food & Drink", "Shopping", "Transportation", "Bills & Utilities", "Entertainment", "Health & Wellness", "Home", "Travel", "Income"
];

export default function ReviewTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedCategories, setUpdatedCategories] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function fetchTransactions() {
      try {
        const response = await fetch('/api/transactions/review');
        if (!response.ok) {
          throw new Error('Failed to fetch transactions');
        }
        const data = await response.json();
        
        if (data.length === 0) {
          // If no transactions need review, go straight to the quiz
          router.push('/onboarding/quiz');
        } else {
          // Prisma's Decimal is serialized as a string. Convert it back to a number.
          const formattedData = data.map((tx: any) => ({
            ...tx,
            amount: parseFloat(tx.amount)
          }));
          setTransactions(formattedData);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchTransactions();
  }, [router]);

  const handleCategoryChange = (transactionId: string, newCategory: string) => {
    setUpdatedCategories(prev => ({
      ...prev,
      [transactionId]: newCategory,
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    const transactionsToUpdate = Object.entries(updatedCategories).map(([id, assignedCategory]) => ({
      id,
      assignedCategory,
    }));

    try {
      const response = await fetch('/api/transactions/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transactionsToUpdate }),
      });

      if (!response.ok) {
        throw new Error('Failed to update transactions');
      }

      // On success, navigate to the next step in onboarding
      router.push('/onboarding/quiz');

    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };
  
  const reviewedCount = Object.keys(updatedCategories).length;
  const totalCount = transactions.length;
  const progress = totalCount > 0 ? (reviewedCount / totalCount) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading transactions for review...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Review a Few Transactions</CardTitle>
          <CardDescription>
            Help us understand your spending better. Categorize these items to power up your AI coach.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 mb-6">
            <Progress value={progress} />
            <p className="text-sm text-center text-muted-foreground">
              {reviewedCount} of {totalCount} reviewed
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
            {transactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex-1">
                  <p className="font-medium">{tx.description}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(tx.transactionDate), 'MMM d, yyyy')} • ${tx.amount.toFixed(2)}
                  </p>
                </div>
                <div className="w-48">
                  <Select
                    onValueChange={(value) => handleCategoryChange(tx.id, value)}
                    value={updatedCategories[tx.id] || ''}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || reviewedCount < totalCount}
            className="w-full"
          >
            {isSubmitting ? 'Submitting...' : `Continue (${reviewedCount}/${totalCount})`}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
