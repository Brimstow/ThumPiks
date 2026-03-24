import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { getRequestId } from './request-context';
import { isProductionLike, isDevelopmentEnv } from './env';

interface LogContext {
  userId?: string;
  requestId?: string;
  url?: string;
  method?: string;
  [key: string]: any;
}

const isTestEnv = (): boolean =>
  process.env.NODE_ENV === 'test' || Boolean(process.env.JEST_WORKER_ID);

// Create logs directory path
const logsDir = path.join(process.cwd(), 'logs');

const transports: winston.transport[] = [];

if (!isTestEnv()) {
  transports.push(
    // Application logs
    new DailyRotateFile({
      filename: path.join(logsDir, 'app-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
    }),
    // Error logs
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error',
    }),
    // Security logs
    new DailyRotateFile({
      filename: path.join(logsDir, 'security-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '90d',
      level: 'warn',
    })
  );
}

// Winston logger setup for production
const winstonLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'thumbnail-maker-studio',
    environment: process.env.NODE_ENV || 'development',
  },
  transports,
});

// Add console transport for development
if (!isTestEnv() && isDevelopmentEnv()) {
  winstonLogger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

// Production-like: JSON console transport for Railway stdout capture
if (!isTestEnv() && isProductionLike()) {
  winstonLogger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    })
  );
}

// Axiom: centralized log aggregation (when configured)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let axiomTransport: any = null;

if (!isTestEnv() && process.env.AXIOM_TOKEN) {
  try {
    // Dynamic require for graceful degradation if package is not installed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { WinstonTransport: AxiomTransport } = require('@axiomhq/winston');
    axiomTransport = new AxiomTransport({
      dataset: process.env.AXIOM_DATASET || 'thumbnail-maker',
      token: process.env.AXIOM_TOKEN,
      orgId: process.env.AXIOM_ORG_ID || undefined,
      onError: (err: Error) =>
        console.warn('Axiom transport error:', err.message),
    });
    winstonLogger.add(axiomTransport);
    winstonLogger.exceptions.handle(axiomTransport);
    winstonLogger.rejections.handle(axiomTransport);
  } catch (err) {
    console.warn(
      'Axiom transport failed to initialize:',
      err instanceof Error ? err.message : err
    );
  }
}

class Logger {
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  /** Merge the requestId from AsyncLocalStorage into the log context (if available). */
  private enrichContext(context?: LogContext): LogContext | undefined {
    const requestId = getRequestId();
    if (!requestId && !context) return context;
    if (!requestId) return context;
    // Only set requestId if the caller didn't provide one explicitly
    if (context?.requestId) return context;
    return { ...context, requestId };
  }

  private formatMessage(
    level: string,
    message: string,
    context?: LogContext
  ): string {
    const timestamp = this.getTimestamp();
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
  }

  private logToWinston(
    level: string,
    message: string,
    context?: LogContext,
    error?: Error
  ) {
    if (isProductionLike() || process.env.AXIOM_TOKEN) {
      const logData = {
        message,
        ...context,
        ...(error && { error: { message: error.message, stack: error.stack } }),
      };
      winstonLogger.log(level, message, logData);
    }
  }

  info(message: string, context?: LogContext): void {
    const enriched = this.enrichContext(context);
    console.log(this.formatMessage('info', message, enriched));
    this.logToWinston('info', message, enriched);
  }

  warn(message: string, context?: LogContext): void {
    const enriched = this.enrichContext(context);
    console.warn(this.formatMessage('warn', message, enriched));
    this.logToWinston('warn', message, enriched);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const enriched = this.enrichContext(context);
    const errorInfo = error
      ? {
          message: error.message,
          stack: error.stack,
          ...enriched,
        }
      : enriched;

    console.error(this.formatMessage('error', message, errorInfo));
    this.logToWinston('error', message, enriched, error);
  }

  debug(message: string, context?: LogContext): void {
    const enriched = this.enrichContext(context);
    if (isDevelopmentEnv()) {
      console.debug(this.formatMessage('debug', message, enriched));
    }
    this.logToWinston('debug', message, enriched);
  }

  // Security-specific logging methods
  security(
    level: 'info' | 'warn' | 'error',
    event: string,
    context?: LogContext
  ): void {
    const securityContext = {
      ...context,
      category: 'security',
      timestamp: this.getTimestamp(),
    };

    const message = `[SECURITY] ${event}`;

    switch (level) {
      case 'info':
        this.info(message, securityContext);
        break;
      case 'warn':
        this.warn(message, securityContext);
        break;
      case 'error':
        this.error(message, undefined, securityContext);
        break;
    }
  }

  // Performance logging
  performance(operation: string, duration: number, context?: LogContext): void {
    const performanceContext = {
      ...context,
      category: 'performance',
      operation,
      duration,
      timestamp: this.getTimestamp(),
    };

    const level = duration > 1000 ? 'warn' : 'info';
    const message = `Performance: ${operation} took ${duration}ms`;

    if (level === 'warn') {
      this.warn(message, performanceContext);
    } else {
      this.info(message, performanceContext);
    }
  }
}

export const logger = new Logger();
export type { LogContext };

/** Flush all Winston transports (call before process exit). */
export async function flushLogger(): Promise<void> {
  // Explicitly flush Axiom's internal batch buffer (it doesn't implement Winston's close hook)
  if (axiomTransport && typeof axiomTransport.flush === 'function') {
    await new Promise<void>(resolve => {
      axiomTransport.flush((err: Error | null) => {
        if (err) console.warn('Axiom flush error:', err.message);
        resolve();
      });
    });
  }
  // Then close Winston transports (flushes file transports)
  return new Promise(resolve => {
    winstonLogger.on('finish', resolve);
    winstonLogger.end();
  });
}
