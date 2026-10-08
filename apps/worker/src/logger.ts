/**
 * Structured logger for the worker process.
 * Outputs JSON lines in production, pretty-prints in development.
 */

const isProd = process.env.NODE_ENV === 'production';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const entry = {
    ts:      new Date().toISOString(),
    level,
    service: 'worker',
    message,
    ...meta,
  };

  if (isProd) {
    process.stdout.write(JSON.stringify(entry) + '\n');
  } else {
    const colors: Record<LogLevel, string> = {
      info:  '\x1b[36m',   // cyan
      warn:  '\x1b[33m',   // yellow
      error: '\x1b[31m',   // red
      debug: '\x1b[90m',   // grey
    };
    const reset = '\x1b[0m';
    const prefix = `${colors[level]}[${level.toUpperCase()}]${reset}`;
    const metaStr = meta ? ' ' + JSON.stringify(meta) : '';
    console.log(`${prefix} ${entry.ts} ${message}${metaStr}`);
  }
}

export const logger = {
  info:  (msg: string, meta?: Record<string, unknown>) => log('info',  msg, meta),
  warn:  (msg: string, meta?: Record<string, unknown>) => log('warn',  msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log('error', msg, meta),
  debug: (msg: string, meta?: Record<string, unknown>) => log('debug', msg, meta),
};
