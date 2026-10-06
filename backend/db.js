require('dotenv').config();
const mysql = require('mysql2/promise');

// One shared pool for the whole process: connections are reused across requests
// instead of paying the TCP + auth handshake on every call.
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10,
});

module.exports = pool;
