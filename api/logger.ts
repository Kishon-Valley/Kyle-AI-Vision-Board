import { createLogger, format, transports } from 'winston';
import { fileURLToPath } from 'url';
import path from 'path';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a timestamp format
const timestampFormat = format.timestamp({
  format: 'YYYY-MM-DD HH:mm:ss.SSS'
});

// Create a log format
const logFormat = format.printf(({ timestamp, level, message, ...meta }) => {
  return `${timestamp} [${level.toUpperCase()}] ${message} ${Object.keys(meta).length > 0 ? JSON.stringify(meta) : ''}`;
});

// Create the logger
const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: format.combine(
    timestampFormat,
    format.json(),
    logFormat
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    }),
    new transports.File({
      filename: path.join(__dirname, '../logs/error.log'),
      level: 'error'
    }),
    new transports.File({
      filename: path.join(__dirname, '../logs/combined.log')
    })
  ]
});

// Add error handling
logger.exceptions.handle(
  new transports.File({ filename: path.join(__dirname, '../logs/exceptions.log') })
);

logger.on('error', (err) => {
  console.error('Logger error:', err);
});

// Create a factory function to create named loggers
export function createNamedLogger(name: string) {
  return logger.child({ name });
}

// Export the logger
export default logger;
