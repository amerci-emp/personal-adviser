'use client';

import { trpc } from '@/trpc/client';
import { usePlaidLink } from 'react-plaid-link';
import { useEffect } from 'react';

interface PlaidLinkButtonProps {
  onSuccess?: (publicToken: string, institution: { name: string; id: string }) => void;
  onComplete?: () => void; // For modal use - called after successful connection
}

export function PlaidLinkButton({ onSuccess, onComplete }: PlaidLinkButtonProps) {
  const { data: linkToken, error, isLoading } = trpc.plaid.createLinkToken.useQuery();

  const exchangeToken = trpc.plaid.exchangePublicToken.useMutation({
    onSuccess: () => {
      // Call onComplete for modal use cases
      onComplete?.();
    },
    onError: (error) => {
      // TODO: Add proper user-facing error handling
      console.error('Failed to exchange public token:', error);
    }
  });

  const { open, ready } = usePlaidLink({
    token: linkToken || null,
    onSuccess: (publicToken, metadata) => {
      // Handle the case where metadata.institution might be null
      if (metadata.institution) {
        onSuccess?.(publicToken, {
          name: metadata.institution.name,
          id: metadata.institution.institution_id,
        });
        exchangeToken.mutate({
          publicToken,
          institutionName: metadata.institution.name,
          institutionId: metadata.institution.institution_id,
        });
      }
    },
  });
  
  // Automatically open Plaid Link when the component is ready
  useEffect(() => {
    if (ready) {
      open();
    }
  }, [ready, open]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error loading Plaid. Please try again later.</div>;
  }

  return (
    // The button is not strictly necessary as we auto-open, but it can be a fallback.
    <button onClick={() => open()} disabled={!ready}>
      Connect a bank account
    </button>
  );
} 