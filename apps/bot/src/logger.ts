export interface LogFn {
  (obj: Record<string, any>, msg?: string): void;
  (msg: string, ...args: any[]): void;
}

export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private format(level: string, first: any, second?: string): void {
    const timestamp = new Date().toISOString();
    let message = '';
    let metaStr = '';

    if (typeof first === 'string') {
      message = first;
      if (second) {
        metaStr = ` | ${second}`;
      }
    } else if (typeof first === 'object' && first !== null) {
      message = second || '';
      try {
        metaStr = ` | ${JSON.stringify(first)}`;
      } catch {
        metaStr = ' | [Unserializable Object]';
      }
    } else {
      message = String(first);
    }

    const output = `[${timestamp}] [${level.toUpperCase()}] [SMCore:${this.context}]: ${message}${metaStr}`;
    if (level === 'error') {
      console.error(output);
    } else if (level === 'warn') {
      console.warn(output);
    } else {
      console.log(output);
    }
  }

  public info: LogFn = (first: any, second?: string) => {
    this.format('info', first, second);
  };

  public warn: LogFn = (first: any, second?: string) => {
    this.format('warn', first, second);
  };

  public error: LogFn = (first: any, second?: string) => {
    this.format('error', first, second);
  };
}

export const logger = new Logger('SMCoreBot');
