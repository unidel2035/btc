import * as cron from 'node-cron';
import { NewsCollectorService } from './collector-service';

/**
 * Scheduler for periodic news collection
 */
export class CollectorScheduler {
  private service: NewsCollectorService;
  private task: cron.ScheduledTask | null = null;
  private cronExpression: string;
  private isRunning: boolean = false;

  constructor(service: NewsCollectorService, intervalMinutes = 5) {
    this.service = service;
    // Every N minutes: */N * * * *
    this.cronExpression = `*/${intervalMinutes} * * * *`;
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.task) {
      console.log('Scheduler already running');
      return;
    }

    console.log(`Starting scheduler: ${this.cronExpression}`);

    this.task = cron.schedule(this.cronExpression, async () => {
      await this.runCollection();
    });

    console.log('Scheduler started successfully');

    // Run immediately on start
    this.runCollection().catch((error) => {
      console.error('Initial collection failed:', error);
    });
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      console.log('Scheduler stopped');
    }
  }

  /**
   * Run collection manually
   */
  async runCollection(): Promise<void> {
    if (this.isRunning) {
      console.log('Collection already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log('\n=== Starting News Collection ===');
      console.log(`Time: ${new Date().toISOString()}`);

      const result = await this.service.collectAll();

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log('\n=== Collection Complete ===');
      console.log(`Duration: ${duration}s`);
      console.log(`Total collected: ${result.total}`);
      console.log(`Stored: ${result.stored}`);
      console.log(`Duplicates skipped: ${result.duplicates}`);
      console.log('\nPer-source statistics:');

      for (const stats of result.stats) {
        console.log(
          `  ${stats.source}: ${stats.itemsCollected} collected, ${stats.itemsStored} stored, ${stats.duplicatesSkipped} duplicates`
        );
      }

      console.log('===========================\n');
    } catch (error) {
      console.error('Collection failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Check if scheduler is running
   */
  isSchedulerRunning(): boolean {
    return this.task !== null;
  }

  /**
   * Get cron expression
   */
  getCronExpression(): string {
    return this.cronExpression;
  }
}
