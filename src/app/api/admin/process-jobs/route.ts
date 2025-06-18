import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BackgroundJobRunner } from '@/lib/background-jobs';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // For now, allow any authenticated user to trigger jobs
    // In production, you might want to restrict this to admin users
    console.log(`Manual job processing triggered by user ${session.user.id}`);

    // Run background jobs once
    await BackgroundJobRunner.runOnce();

    return NextResponse.json({
      success: true,
      message: 'Background jobs processed successfully'
    });
  } catch (error) {
    console.error('Error processing background jobs:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process background jobs',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 