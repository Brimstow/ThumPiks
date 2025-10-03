import fs from 'fs/promises';
import path from 'path';
import { AppEvent } from './event-types';

/**
 * Simple Event Persistence System
 * 
 * Features:
 * - File-based event storage for reliability
 * - Event replay capability for recovery
 * - Lightweight without external dependencies
 * - Automatic cleanup of old events
 * - JSON format for easy debugging
 */
export class EventPersistence {
  private eventsDir: string;
  private maxFileSize = 10 * 1024 * 1024; // 10MB
  
  // TODO: Restore when implementing automatic file cleanup functionality
  // private maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

  private currentFile: string;
  private currentFileSize = 0;

  constructor(baseDir = './events-store') {
    this.eventsDir = path.resolve(baseDir);
    this.currentFile = this.generateFileName();
    this.ensureDirectoryExists();
  }

  /**
   * Persist an event to storage
   */
  async persistEvent(event: AppEvent): Promise<void> {
    const { userId, type } = event;

    if (!userId || !type) {
      console.warn('Missing required fields for event persistence');
      return;
    }

    // Simply persist the event as-is
    await this.writeEvent(event);
  }

  /**
   * Replay events from a specific time period
   */
  async replayEvents(
    fromDate?: Date, 
    toDate?: Date,
    eventTypes?: string[]
  ): Promise<AppEvent[]> {
    try {
      const files = await this.getEventFiles();
      const events: AppEvent[] = [];

      for (const file of files) {
        const filePath = path.join(this.eventsDir, file);
        const content = await fs.readFile(filePath, 'utf8');
        const lines = content.trim().split('\n').filter(line => line);

        for (const line of lines) {
          try {
            const event = JSON.parse(line);
            const eventDate = new Date(event.timestamp);

            // Apply filters
            if (fromDate && eventDate < fromDate) continue;
            if (toDate && eventDate > toDate) continue;
            if (eventTypes && !eventTypes.includes(event.type)) continue;

            events.push(event);
          } catch (parseError) {
            console.warn('⚠️  Skipping invalid event line:', line);
          }
        }
      }

      return events.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    } catch (error) {
      console.error('❌ Error replaying events:', error);
      return [];
    }
  }

  /**
   * Get events by user ID
   */
  async getEventsByUser(userId: string, limit = 100): Promise<AppEvent[]> {
    try {
      const allEvents = await this.replayEvents();
      return allEvents
        .filter(event => event.userId === userId)
        .slice(-limit);
    } catch (error) {
      console.error('❌ Error getting events by user:', error);
      return [];
    }
  }

  /**
   * Get events by type
   */
  async getEventsByType(eventType: string, limit = 100): Promise<AppEvent[]> {
    try {
      const allEvents = await this.replayEvents(undefined, undefined, [eventType]);
      return allEvents.slice(-limit);
    } catch (error) {
      console.error('❌ Error getting events by type:', error);
      return [];
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    oldestEvent: Date | null;
    newestEvent: Date | null;
    totalEvents: number;
  }> {
    try {
      const files = await this.getEventFiles();
      let totalSize = 0;
      let totalEvents = 0;
      let oldestEvent: Date | null = null;
      let newestEvent: Date | null = null;

      for (const file of files) {
        const filePath = path.join(this.eventsDir, file);
        const stats = await fs.stat(filePath);
        totalSize += stats.size;

        const content = await fs.readFile(filePath, 'utf8');
        const lines = content.trim().split('\n').filter(line => line);
        totalEvents += lines.length;

        // Get first and last event timestamps
        if (lines.length > 0) {
          try {
            if (lines[0] && lines[lines.length - 1]) {
              const firstEvent = JSON.parse(lines[0]);
              const lastLine = lines[lines.length - 1];
              if (lastLine) {
                const lastEvent = JSON.parse(lastLine);
                
                const firstDate = new Date(firstEvent.timestamp);
                const lastDate = new Date(lastEvent.timestamp);

                if (!oldestEvent || firstDate < oldestEvent) {
                  oldestEvent = firstDate;
                }
                if (!newestEvent || lastDate > newestEvent) {
                  newestEvent = lastDate;
                }
              }
            }
          } catch (parseError) {
            // Skip parsing errors
          }
        }
      }

      return {
        totalFiles: files.length,
        totalSize,
        totalEvents,
        oldestEvent,
        newestEvent
      };
    } catch (error) {
      console.error('❌ Error getting storage stats:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        totalEvents: 0,
        oldestEvent: null,
        newestEvent: null
      };
    }
  }

  /**
   * Export events to JSON file
   */
  async exportEvents(
    outputPath: string,
    fromDate?: Date,
    toDate?: Date
  ): Promise<void> {
    try {
      const events = await this.replayEvents(fromDate, toDate);
      const exportData = {
        exportedAt: new Date().toISOString(),
        eventCount: events.length,
        fromDate: fromDate?.toISOString(),
        toDate: toDate?.toISOString(),
        events
      };

      await fs.writeFile(outputPath, JSON.stringify(exportData, null, 2));
      console.log(`📦 Exported ${events.length} events to ${outputPath}`);
    } catch (error) {
      console.error('❌ Error exporting events:', error);
      throw error;
    }
  }

  /**
   * Import events from JSON file
   */
  async importEvents(inputPath: string): Promise<number> {
    try {
      const content = await fs.readFile(inputPath, 'utf8');
      const importData = JSON.parse(content);
      
      if (!importData.events || !Array.isArray(importData.events)) {
        throw new Error('Invalid import file format');
      }

      for (const event of importData.events) {
        await this.persistEvent(event);
      }

      console.log(`📥 Imported ${importData.events.length} events from ${inputPath}`);
      return importData.events.length;
    } catch (error) {
      console.error('❌ Error importing events:', error);
      throw error;
    }
  }

  /**
   * Clear all events (use with caution)
   */
  async clearAllEvents(): Promise<void> {
    try {
      const files = await fs.readdir(this.eventsDir);
      
      for (const file of files) {
        if (file.endsWith('.jsonl')) {
          await fs.unlink(path.join(this.eventsDir, file));
        }
      }
      
      this.currentFile = this.generateFileName();
      this.currentFileSize = 0;
      
      console.log('🧹 All events cleared');
    } catch (error) {
      console.error('❌ Error clearing events:', error);
      throw error;
    }
  }

  private async writeEvent(event: AppEvent): Promise<void> {
    const filePath = path.join(this.eventsDir, this.currentFile);

    await fs.appendFile(filePath, JSON.stringify(event) + '\n');

    this.currentFileSize += event.toString().length + 1;

    if (this.currentFileSize >= this.maxFileSize) {
      await this.rotateFile();
    }
  }

  private async ensureDirectoryExists(): Promise<void> {
    try {
      await fs.mkdir(this.eventsDir, { recursive: true });
    } catch (error) {
      console.error('❌ Error creating events directory:', error);
    }
  }

  private generateFileName(): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const random = Math.random().toString(36).substring(2, 8);
    return `events-${timestamp}-${random}.jsonl`;
  }

  private async rotateFile(): Promise<void> {
    this.currentFile = this.generateFileName();
    this.currentFileSize = 0;
    console.log(`📄 Rotated to new event file: ${this.currentFile}`);
  }

  private async getEventFiles(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.eventsDir);
      return files
        .filter(file => file.endsWith('.jsonl'))
        .sort();
    } catch (error) {
      console.error('❌ Error reading event files:', error);
      return [];
    }
  }


}

// TODO: Restore when implementing automatic cleanup functionality
// private async cleanupOldFiles(): Promise<void> {
//   try {
//     const files = await this.getEventFiles();
//     const cutoffDate = new Date(Date.now() - this.maxAge);
//
//     for (const file of files) {
//       const filePath = path.join(this.eventsDir, file);
//       const stats = await fs.stat(filePath);
//       
//       if (stats.mtime < cutoffDate) {
//         await fs.unlink(filePath);
//         console.log(`🧹 Cleaned up old event file: ${file}`);
//       }
//     }
//   } catch (error) {
//     console.error('❌ Error cleaning up old files:', error);
//   }
// }

// Export singleton
export const eventPersistence = new EventPersistence();