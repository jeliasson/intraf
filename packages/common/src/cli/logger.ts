/**
 * Common logging utilities
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4,
}

const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: "DEBUG",
  [LogLevel.INFO]: "INFO",
  [LogLevel.WARN]: "WARN",
  [LogLevel.ERROR]: "ERROR",
  [LogLevel.CRITICAL]: "CRITICAL",
};

const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: "\x1b[36m", // Cyan
  [LogLevel.INFO]: "\x1b[32m", // Green
  [LogLevel.WARN]: "\x1b[33m", // Yellow
  [LogLevel.ERROR]: "\x1b[31m", // Red
  [LogLevel.CRITICAL]: "\x1b[35m", // Magenta
};

const RESET_COLOR = "\x1b[0m";
const DIM_COLOR = "\x1b[2m";

/**
 * Log hook callback type
 */
export type LogHook = (
  level: LogLevel,
  levelName: string,
  prefix: string,
  timestamp: string,
  message: string
) => void;

export class Logger {
  private currentLevel: LogLevel;
  private prefix: string;
  private static hooks: LogHook[] = [];

  constructor(prefix: string = "", level: LogLevel = LogLevel.INFO) {
    this.prefix = prefix;
    this.currentLevel = level;
  }

  /**
   * Register a global log hook
   */
  static addHook(hook: LogHook): void {
    Logger.hooks.push(hook);
  }

  /**
   * Remove a global log hook
   */
  static removeHook(hook: LogHook): void {
    const index = Logger.hooks.indexOf(hook);
    if (index > -1) {
      Logger.hooks.splice(index, 1);
    }
  }

  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  getLevel(): LogLevel {
    return this.currentLevel;
  }

  getLevelName(): string {
    return LOG_LEVEL_NAMES[this.currentLevel];
  }

  private formatTimestamp(): string {
    const now = new Date();
    return now.toISOString();
  }

  private log(level: LogLevel, ...args: unknown[]): void {
    if (level < this.currentLevel) {
      return;
    }

    const timestamp = this.formatTimestamp();
    const levelName = LOG_LEVEL_NAMES[level];
    const color = LOG_LEVEL_COLORS[level];
    
    const prefix = this.prefix ? `[${this.prefix}] ` : "";
    const formattedTimestamp = `${DIM_COLOR}${timestamp}${RESET_COLOR}`;
    const formattedLevel = `${color}${levelName.padEnd(8)}${RESET_COLOR}`;
    
    console.log(`${formattedTimestamp} ${formattedLevel} ${prefix}`, ...args);
    
    // Call hooks with formatted message
    if (Logger.hooks.length > 0) {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      Logger.hooks.forEach(hook => {
        try {
          hook(level, levelName, this.prefix, timestamp, message);
        } catch (error) {
          // Silently ignore hook errors to prevent logging recursion
        }
      });
    }
  }

  debug(...args: unknown[]): void {
    this.log(LogLevel.DEBUG, ...args);
  }

  info(...args: unknown[]): void {
    this.log(LogLevel.INFO, ...args);
  }

  warn(...args: unknown[]): void {
    this.log(LogLevel.WARN, ...args);
  }

  error(...args: unknown[]): void {
    this.log(LogLevel.ERROR, ...args);
  }

  critical(...args: unknown[]): void {
    this.log(LogLevel.CRITICAL, ...args);
  }
}

/**
 * Parse log level from string (case-insensitive)
 */
export function parseLogLevel(level: string): LogLevel {
  const normalized = level.toUpperCase();
  switch (normalized) {
    case "DEBUG":
      return LogLevel.DEBUG;
    case "INFO":
      return LogLevel.INFO;
    case "WARN":
    case "WARNING":
      return LogLevel.WARN;
    case "ERROR":
      return LogLevel.ERROR;
    case "CRITICAL":
      return LogLevel.CRITICAL;
    default:
      return LogLevel.INFO;
  }
}
