'use strict';
// Request logging middleware: one line per request with method, URL, status and duration.
// Timing starts when the request arrives; the line is printed on `finish` (response fully
// handed to the OS) or `close` (client disconnected early), so the status code and duration
// are the real ones, not guesses made before the handler ran.
const requestLogger = (log = console.log) => (req, res, next) => {
  const start = process.hrtime.bigint();
  const timestamp = new Date().toISOString();
  let logged = false;

  const done = (aborted) => {
    if (logged) return;
    logged = true;
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    log(`[${timestamp}] ${req.method} ${req.originalUrl} ${res.statusCode}${aborted ? ' (aborted)' : ''} ${ms.toFixed(1)}ms`);
  };

  res.on('finish', () => done(false));
  res.on('close', () => done(!res.writableFinished));
  next();
};

module.exports = { requestLogger };
