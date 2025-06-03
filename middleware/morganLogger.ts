import morgan from 'morgan';

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