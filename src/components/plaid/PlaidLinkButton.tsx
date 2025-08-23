'use client';

import { trpc } from '@/trpc/client';
import { usePlaidLink } from 'react-plaid-link';
import { useEffect } from 'react';

interface PlaidLinkButtonProps {
  onSuccess?: (publicToken: string, institution: { name: string; id: string }) => void;
  onComplete?: () => void; // For modal use - called after successful connection
  className?: string;
  autoStart?: boolean; // Whether to auto-start the connection flow
}

export function PlaidLinkButton({ onSuccess, onComplete, className, autoStart = true }: PlaidLinkButtonProps) {
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
  
  // Automatically open Plaid Link when the component is ready (if autoStart is enabled)
  useEffect(() => {
    if (ready && autoStart) {
      open();
    }
  }, [ready, open, autoStart]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error loading Plaid. Please try again later.</div>;
  }

  return (
    <button 
      onClick={() => open()} 
      disabled={!ready}
      className={className}
    >
      {autoStart ? 'Connecting...' : 'Connect a bank account'}
    </button>
  );
} 