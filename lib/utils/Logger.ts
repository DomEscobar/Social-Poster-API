export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export class Logger {
  private logLevel: LogLevel;

  constructor(logLevel: LogLevel = LogLevel.INFO) {
    this.logLevel = logLevel;
  }

  private formatMessage(level: string, message: string, ...args: unknown[]): string {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.length > 0 ? ' ' + args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ') : '';
    
    return `[${timestamp}] [${level}] ${message}${formattedArgs}`;
  }

  public error(message: string, ...args: unknown[]): void {
    if (this.logLevel >= LogLevel.ERROR) {
      console.error(this.formatMessage('ERROR', message, ...args));
    }
  }

  public warn(message: string, ...args: unknown[]): void {
    if (this.logLevel >= LogLevel.WARN) {
      console.warn(this.formatMessage('WARN', message, ...args));
    }
  }

  public info(message: string, ...args: unknown[]): void {
    if (this.logLevel >= LogLevel.INFO) {
      console.info(this.formatMessage('INFO', message, ...args));
    }
  }

  public debug(message: string, ...args: unknown[]): void {
    if (this.logLevel >= LogLevel.DEBUG) {
      console.debug(this.formatMessage('DEBUG', message, ...args));
    }
  }

  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  public getLogLevel(): LogLevel {
    return this.logLevel;
  }
}
