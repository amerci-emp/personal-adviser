"use client";

import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot } from 'lucide-react';

export function EnableAICoach() {
  const router = useRouter();

  const handleClick = () => {
    router.push('/onboarding/review-transactions');
  };

  return (
    <Card className="bg-gradient-to-br from-purple-50 via-blue-50 to-green-50">
      <CardHeader className="flex flex-row items-center space-x-4">
        <div className="p-3 bg-primary/10 rounded-full">
          <Bot className="w-8 h-8 text-primary" />
        </div>
        <div>
          <CardTitle>Unlock Your AI Financial Coach</CardTitle>
          <CardDescription>Get personalized insights and a plan tailored to you.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          To power up your AI, we need your help with two quick things:
        </p>
        <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
          <li>Review a few transactions we were unsure about.</li>
          <li>Answer 5 short questions about your money habits.</li>
        </ul>
      </CardContent>
      <CardFooter>
        <Button onClick={handleClick} className="w-full">
          Enable AI Coach
        </Button>
      </CardFooter>
    </Card>
  );
}
