'use client';

import { useState } from 'react';
import { trpc } from '@/trpc/client';
import { useRouter } from 'next/navigation';
import { PlaidLinkButton } from '../plaid/PlaidLinkButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, Hand } from 'lucide-react';

export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: Welcome, 2: Choice, 3: Plaid
  
  const setUserChoice = trpc.user.setConnectionType.useMutation({
    onSuccess: (data) => {
      if (data.connectionType === 'PLAID') {
        setStep(3); // Move to Plaid Link step
      } else {
        router.push('/dashboard');
      }
    },
    onError: (error) => {
      console.error("Failed to set connection type:", error);
      // TODO: Add user-facing error toast
    }
  });

  const handleChoice = (choice: 'PLAID' | 'MANUAL') => {
    setUserChoice.mutate({ connectionType: choice });
  };

  const onPlaidSuccess = () => {
    router.push('/dashboard');
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Welcome to Personal Adviser!</CardTitle>
              <CardDescription>Let's get your financial journey started in just a few steps.</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button onClick={() => setStep(2)} className="w-full">
                Get Started
              </Button>
            </CardFooter>
          </Card>
        );
      case 2:
        return (
          <Card>
            <CardHeader>
              <CardTitle>How to Connect?</CardTitle>
              <CardDescription>Choose the method that works best for you. We recommend Plaid for a fully automated experience.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => handleChoice('PLAID')}
                className="w-full h-24 flex-col"
                variant="default"
                disabled={setUserChoice.isPending}
              >
                <Zap className="h-6 w-6 mb-2" />
                <span className="font-bold">Automate with Plaid</span>
                <span className="text-xs font-normal">Connect in seconds.</span>
              </Button>
              <Button
                onClick={() => handleChoice('MANUAL')}
                className="w-full h-24 flex-col"
                variant="outline"
                disabled={setUserChoice.isPending}
              >
                <Hand className="h-6 w-6 mb-2" />
                <span className="font-bold">Manual Upload</span>
                <span className="text-xs font-normal">For unsupported banks.</span>
              </Button>
            </CardContent>
             <CardFooter>
              <p className="text-xs text-muted-foreground">By choosing Plaid, manual uploads will be disabled to prevent duplicates. You can upgrade to Plaid from Manual at any time.</p>
            </CardFooter>
          </Card>
        );
      case 3:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Connecting with Plaid...</CardTitle>
              <CardDescription>You will be prompted to securely connect your bank account. This window will close automatically on success.</CardDescription>
            </CardHeader>
            <CardContent>
              <PlaidLinkButton onSuccess={onPlaidSuccess} />
            </CardContent>
          </Card>
        );
      default:
        return <Card><CardContent>Loading...</CardContent></Card>;
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md">
        {renderStep()}
      </div>
    </div>
  );
} 