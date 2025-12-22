/**
 * ============================================
 * LOGGER UTILITY
 * ============================================
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  timestamp: string;
  message: string;
  data?: Record<string, any> | undefined;
}

class Logger {
  private isDev = process.env.NODE_ENV !== 'production';

  private format(level: LogLevel, message: string, data?: Record<string, any>): LogEntry {
    return {
      level,
      timestamp: new Date().toISOString(),
      message,
      ...(data && { data }),
    };
  }

  private output(entry: LogEntry) {
    const prefix = `[${entry.level.toUpperCase()}] ${entry.timestamp}`;
    const message = entry.message;
    const dataStr = entry.data ? JSON.stringify(entry.data, null, 2) : '';

    if (this.isDev) {
      // Development: colorful console output
      switch (entry.level) {
        case 'debug':
          console.debug(`\x1b[36m${prefix}\x1b[0m ${message}`, entry.data || '');
          break;
        case 'info':
          console.info(`\x1b[32m${prefix}\x1b[0m ${message}`, entry.data || '');
          break;
        case 'warn':
          console.warn(`\x1b[33m${prefix}\x1b[0m ${message}`, entry.data || '');
          break;
        case 'error':
          console.error(`\x1b[31m${prefix}\x1b[0m ${message}`, entry.data || '');
          break;
      }
    } else {
      // Production: JSON format
      console.log(JSON.stringify(entry));
    }
  }

  debug(message: string, data?: Record<string, any>) {
    const entry = this.format('debug', message, data);
    this.output(entry);
  }

  info(message: string, data?: Record<string, any>) {
    const entry = this.format('info', message, data);
    this.output(entry);
  }

  warn(message: string, data?: Record<string, any>) {
    const entry = this.format('warn', message, data);
    this.output(entry);
  }

  error(message: string, data?: Record<string, any>) {
    const entry = this.format('error', message, data);
    this.output(entry);
  }
}

export const logger = new Logger();
