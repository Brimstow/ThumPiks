import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

interface LogContext {
  userId?: string;
  requestId?: string;
  url?: string;
  method?: string;
  [key: string]: any;
}

// Create logs directory path
const logsDir = path.join(process.cwd(), 'logs');

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
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Application logs
    new DailyRotateFile({
      filename: path.join(logsDir, 'app-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d'
    }),
    // Error logs
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error'
    }),
    // Security logs
    new DailyRotateFile({
      filename: path.join(logsDir, 'security-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '90d',
      level: 'warn'
    })
  ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  winstonLogger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

class Logger {
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = this.getTimestamp();
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
  }

  private logToWinston(level: string, message: string, context?: LogContext, error?: Error) {
    if (process.env.NODE_ENV === 'production') {
      const logData = {
        message,
        ...context,
        ...(error && { error: { message: error.message, stack: error.stack } })
      };
      winstonLogger.log(level, message, logData);
    }
  }

  info(message: string, context?: LogContext): void {
    console.log(this.formatMessage('info', message, context));
    this.logToWinston('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('warn', message, context));
    this.logToWinston('warn', message, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const errorInfo = error ? {
      message: error.message,
      stack: error.stack,
      ...context
    } : context;
    
    console.error(this.formatMessage('error', message, errorInfo));
    this.logToWinston('error', message, context, error);
  }

  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatMessage('debug', message, context));
    }
    this.logToWinston('debug', message, context);
  }

  // Security-specific logging methods
  security(level: 'info' | 'warn' | 'error', event: string, context?: LogContext): void {
    const securityContext = {
      ...context,
      category: 'security',
      timestamp: this.getTimestamp()
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
      timestamp: this.getTimestamp()
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