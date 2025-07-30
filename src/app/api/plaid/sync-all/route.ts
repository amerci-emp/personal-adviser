import { PlaidSyncService } from '@/lib/plaid-sync-service';
import { NextResponse } from 'next/server';

export async function POST() {
  // In a real application, you would protect this endpoint.
  // For example, by checking for a secret bearer token, ensuring
  // the request comes from a trusted source, or by requiring
  // admin authentication.
  
  // For now, we will allow it to be called directly for testing.

  console.log('[API] Received request to sync all Plaid items.');

  try {
    await PlaidSyncService.syncAllItems();
    console.log('[API] Plaid sync all items completed successfully.');
    return NextResponse.json({ success: true, message: 'Sync process initiated for all items.' });
  } catch (error: any) {
    console.error('[API] Error during Plaid sync all items:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred during the sync process.', error: error.message },
      { status: 500 }
    );
  }
} 