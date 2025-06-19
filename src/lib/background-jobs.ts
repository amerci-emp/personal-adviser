import { ExportService } from './export-service';

/**
 * Background job runner for processing failed exports
 */
export class BackgroundJobRunner {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * Start the background job runner
   */
  start(intervalMinutes: number = 5): void {
    if (this.isRunning) {
      console.log('Background job runner is already running');
      return;
    }

    console.log(`Starting background job runner with ${intervalMinutes} minute intervals`);
    this.isRunning = true;

    // Run immediately
    this.processJobs();

    // Set up recurring processing
    this.intervalId = setInterval(() => {
      this.processJobs();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop the background job runner
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('Background job runner is not running');
      return;
    }

    console.log('Stopping background job runner');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Process all background jobs
   */
  private async processJobs(): Promise<void> {
    if (!this.isRunning) return;

    try {
      console.log('Processing background jobs...');
      
      // Process failed exports
      await ExportService.processFailedExports();
      
      console.log('Background jobs processing completed');
    } catch (error) {
      console.error('Error processing background jobs:', error);
    }
  }

  /**
   * Run jobs once (for manual execution or testing)
   */
  static async runOnce(): Promise<void> {
    console.log('Running background jobs once...');
    
    try {
      await ExportService.processFailedExports();
      console.log('Background jobs completed successfully');
    } catch (error) {
      console.error('Error running background jobs:', error);
    }
  }
}

// Export a global instance
export const backgroundJobRunner = new BackgroundJobRunner(); 