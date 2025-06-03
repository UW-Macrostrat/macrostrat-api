import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import { isPropertyAccessChain } from 'typescript';


// Ensure logs directory exists
const logDirectory = path.join(__dirname, './logs');
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}

// read log file
function readLogFile() {
    fs.readFile(path.join(logDirectory, 'access.log'), 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading log file:', err);
            return;
        }

        const lines = data.split('\n').filter(line => line.trim() !== '');

        if (lines.length > 0) {
            lines.forEach((line) => {
                const lineArr = line.split(' '); // Remove the timestamp
                const timestamp = lineArr[0];
                const lat = lineArr[1].split('=')[1];
                const lng = lineArr[2].split('=')[1];

                
                // console.log(`Timestamp: ${timestamp}, Latitude: ${lat}, Longitude: ${lng}`);
            });
        }
    });
}

// Read the log file immediately when the server starts and every x seconds
const seconds = 5
readLogFile();
setInterval(readLogFile, seconds * 1000);

// Create a write stream for the log file
const accessLogStream = fs.createWriteStream(path.join(logDirectory, 'access.log'), { flags: 'a' });

// Setup morgan logger
const morganLogger = morgan(function (tokens, req, res) {
  return [
    new Date().toISOString(),
    `lat=${req.query.lat}`,
    `lng=${req.query.lng}`,
  ].join(' ')
},
  { 
    stream: process.stdout,
    skip: (req: Request, res: Response) => {
        return !req.originalUrl.startsWith('/v2/mobile/dashboard') || !req.query.lat || !req.query.lng;
    },
 }
);

export default morganLogger;