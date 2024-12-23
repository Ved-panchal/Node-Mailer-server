import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';

// Utility function to ensure directory exists
const ensureDirectoryExists = (dirPath) => {
  try {
    // Check if directory exists, if not create it
    if (!fs.existsSync(dirPath)) {
      // recursive: true ensures parent directories are created if they don't exist
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`Created directory: ${dirPath}`);
    }
  } catch (error) {
    console.error(`Error creating directory ${dirPath}:`, error);
    
    // Fallback error handling
    try {
      // Attempt to create directory with fs.promises if sync method fails
      fs.promises.mkdir(dirPath, { recursive: true });
    } catch (fallbackError) {
      console.error(`Fallback directory creation failed: ${fallbackError}`);
      
      // If both methods fail, throw an error
      throw new Error(`Cannot create log directory: ${dirPath}`);
    }
  }
};

// Determine log directory path
const logDir = path.join(process.cwd(), 'logs');


// Ensure log directory exists before creating logger
ensureDirectoryExists(logDir);

// Rest of the logger configuration remains the same as in the previous example
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

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

logger.stream = {
  write: function(message) {
    logger.info(message.trim());
  }
};

logger.setLevels = (levels) => {
  winston.addColors(levels);
  logger.levels = levels;
};

logger.contextLog = (level, message, context = {}) => {
  logger.log({
    level,
    message,
    ...context
  });
};

export default logger;