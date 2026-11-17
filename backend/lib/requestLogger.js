'use strict';
// Request logging middleware: one line per request with method, URL, status and duration.
// Timing starts when the request arrives; the line is printed on `finish` (response fully
// handed to the OS) or `close` (client disconnected early), so the status code and duration
// are the real ones, not guesses made before the handler ran.
//
// Week 9: the duration is always in milliseconds with one decimal (e.g. `12.3ms`), requests
// slower than `slowMs` get a trailing `SLOW` marker so they are easy to grep for, and the same
// value is sent to the client as an `X-Response-Time` header.
const DEFAULT_SLOW_MS = Number(process.env.SLOW_REQUEST_MS) || 500;

const requestLogger = (log = console.log, { slowMs = DEFAULT_SLOW_MS } = {}) => (req, res, next) => {
  const start = process.hrtime.bigint();
  const timestamp = new Date().toISOString();
  const elapsedMs = () => Number(process.hrtime.bigint() - start) / 1e6;
  let logged = false;

  // Headers can only be set until the first byte is written, so hook writeHead, which Node
  // calls right before they are sent (it is also what res.json / res.send end up calling).
  const writeHead = res.writeHead;
  if (typeof writeHead === 'function' && typeof res.setHeader === 'function') {
    res.writeHead = function patchedWriteHead(...args) {
      if (!res.headersSent) res.setHeader('X-Response-Time', `${elapsedMs().toFixed(1)}ms`);
      return writeHead.apply(this, args);
    };
  }

  const done = (aborted) => {
    if (logged) return;
    logged = true;
    const ms = elapsedMs();
    log(`[${timestamp}] ${req.method} ${req.originalUrl} ${res.statusCode}${aborted ? ' (aborted)' : ''} ${ms.toFixed(1)}ms${ms >= slowMs ? ' SLOW' : ''}`);
  };

  res.on('finish', () => done(false));
  res.on('close', () => done(!res.writableFinished));
  next();
};

module.exports = { requestLogger, DEFAULT_SLOW_MS };
