import { createLogger, format, transports } from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOGS_DIR = path.resolve(__dirname, '../../../logs');

// Ensure logs directory exists at startup
if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
}

const isDevelopment = process.env.NODE_ENV !== 'production';

const consoleFormat = format.combine(
    format.colorize(),
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ timestamp, level, message, ...meta }) => {
        const filtered = Object.fromEntries(
            Object.entries(meta).filter(([k]) => k !== 'service')
        );
        const metaStr = Object.keys(filtered).length
            ? ` ${JSON.stringify(filtered)}`
            : '';
        return `${timestamp} [${level}]: ${message}${metaStr}`;
    })
);

const jsonFormat = format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.json()
);

const logger = createLogger({
    level: isDevelopment ? 'debug' : 'info',
    format: jsonFormat,
    defaultMeta: { service: 'licencias-backend' },
    transports: [
        new transports.Console({
            format: isDevelopment ? consoleFormat : jsonFormat,
            silent: process.env.VITEST === 'true'
        }),
        new transports.File({
            filename: path.join(LOGS_DIR, 'server.log'),
            maxsize: 5 * 1024 * 1024, // 5 MB
            maxFiles: 3
        })
    ]
});

export default logger;
