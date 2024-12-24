/**
* Purpose: Logger configuration file for handling application-wide logging
* Input: Uses environment variables and system paths for configuration
* Output: Configured logger instance with multiple transports and error handling
*/

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';

/**
* Purpose: Ensures that the logging directory exists, creating it if necessary
* Input: Directory path as string
* Output: Creates directory if it doesn't exist or throws error on failure
*/
const ensureDirectoryExists = (dirPath) => {
 try {
   if (!fs.existsSync(dirPath)) {
     fs.mkdirSync(dirPath, { recursive: true });
     console.log(`Created directory: ${dirPath}`);
   }
 } catch (error) {
   console.error(`Error creating directory ${dirPath}:`, error);
   
   try {
     fs.promises.mkdir(dirPath, { recursive: true });
   } catch (fallbackError) {
     console.error(`Fallback directory creation failed: ${fallbackError}`);
     throw new Error(`Cannot create log directory: ${dirPath}`);
   }
 }
};

// Define log directory path
const logDir = path.join(process.cwd(), 'logs');

// Create log directory
ensureDirectoryExists(logDir);

/**
* Purpose: Defines the format for JSON log files with timestamps and error stacks
* Input: None - uses winston's built-in formatters
* Output: Combined winston format for file logging
*/
const logFormat = winston.format.combine(
 winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
 winston.format.errors({ stack: true }),
 winston.format.splat(),
 winston.format.json()
);

/**
* Purpose: Defines the format for console output with colors and custom formatting
* Input: None - uses winston's built-in formatters
* Output: Combined winston format for console logging
*/
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, stack, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message} `;
    
    if (Object.keys(metadata).length > 0) {
      msg += JSON.stringify(metadata);
    }
    
    if (stack) {
      msg += `\n${stack}`;
    }
    
    return msg;
  })
);

/**
* Purpose: Creates and configures the main logger instance with multiple transports
* Input: Environment variables for log level configuration
* Output: Configured winston logger instance
*/
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'email-campaign-service' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat,
      level: 'debug'
    }),

    // Error logs
    new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d'
    }),

    // Combined logs
    new DailyRotateFile({
      filename: path.join(logDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'info',
      maxSize: '20m',
      maxFiles: '14d'
    })
  ],

  // Exception and rejection handling
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logDir, 'exceptions.log'),
      maxsize: '20m'
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logDir, 'rejections.log'),
      maxsize: '20m'
    })
  ]
});

/**
* Purpose: Adds stream capability for integration with other logging systems
* Input: Message to be logged
* Output: Logs message at info level after trimming
*/
logger.stream = {
  write: function(message) {
    logger.info(message.trim());
  }
 };
 
 /**
 * Purpose: Allows dynamic setting of log levels
 * Input: Object containing custom log levels
 * Output: Updates logger with new log levels
 */
 logger.setLevels = (levels) => {
  winston.addColors(levels);
  logger.levels = levels;
 };
 

/**
* Purpose: Provides contextual logging capability
* Input: Log level, message, and optional context object
* Output: Logs message with context at specified level
*/
logger.contextLog = (level, message, context = {}) => {
  logger.log({
    level,
    message,
    ...context
  });
};

export default logger;