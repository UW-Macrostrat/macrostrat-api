import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import { tokenToString } from 'typescript';

// Ensure logs directory exists
const logDirectory = path.join(__dirname, './logs');
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}

// Create a write stream for the log file
const accessLogStream = fs.createWriteStream(path.join(logDirectory, 'access.log'), { flags: 'a' });

// Setup morgan logger
const morganLogger = morgan(function (tokens, req, res) {
    console.log('Logging request:', req.query);
  return [
    new Date().toISOString(),
    `lat=${req.query.lat}`,
    `lng=${req.query.lng}`,
  ].join(' ')
},
  { 
    stream: accessLogStream,
    skip: (req: Request, res: Response) => {
        return !req.originalUrl.startsWith('/v2/mobile/dashboard') || !req.query.lat || !req.query.lng;
    },
 }
);

export default morganLogger;
