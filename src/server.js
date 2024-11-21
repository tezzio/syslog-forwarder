const dgram = require('dgram');
const { Client } = require('pg');
const axios = require('axios');

const server = dgram.createSocket('udp4');

const client = new Client({
  host: process.env.POSTGRES_HOST || 'syslog-db',
  database: process.env.POSTGRES_DB || 'syslog',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'your_password',
});

client.connect();

const createTable = `
  CREATE TABLE IF NOT EXISTS logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL,
    ip_address TEXT NOT NULL,
    hostname TEXT,
    severity INTEGER NOT NULL,
    message TEXT NOT NULL,
    source_host TEXT
  );
`;

client.query(createTable, (err, res) => {
  if (err) {
    console.error('Error creating table:', err);
  } else {
    console.log('Logs table is ready');
  }
});

const SPLUNK_ENABLED = process.env.SPLUNK_ENABLED || false;
const SPLUNK_URL = process.env.SPLUNK_URL || 'http://splunk-instance:8088/services/collector/event';
const SPLUNK_TOKEN = process.env.SPLUNK_TOKEN || 'your_splunk_token';

const convertTimestamp = (timestamp) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const parts = timestamp.split(' ');
  const month = months.indexOf(parts[0]) + 1;
  const day = parts[1];
  const time = parts[2];
  const currentYear = new Date().getFullYear();

  return `${currentYear}-${month.toString().padStart(2, '0')}-${day.padStart(2, '0')} ${time}`;
};

const syslogParser = (msg, ip_address) => {
  const pattern = /^<(\d+)>([A-Za-z]{3} \d{1,2} \d{2}:\d{2}:\d{2}) (\S+) (.*)$/;
  const messages = msg.split(/(?=<\d+>)/);

  const parsedMessages = messages.map((message) => {
    const match = message.match(pattern);
    if (match) {
      const priority = match[1];
      const timestamp = convertTimestamp(match[2]);
      const hostname = match[3];
      const messageContent = match[4];

      const severity = priority % 8;
      const facility = Math.floor(priority / 8);

      return { timestamp, hostname, severity, facility, message: messageContent, ip_address: ip_address };
    }
    return null;
  }).filter(Boolean);

  return parsedMessages;
};

server.on('message', (msg, rinfo) => {
  console.log(`[DEBUG] Received syslog message from ${rinfo.address}:${rinfo.port}`);
  console.log(`[DEBUG] Raw Message: ${msg.toString()}`);

  const logData = syslogParser(msg.toString(), rinfo.address);

  if (logData) {
    console.log('[DEBUG] Parsed syslog message:', logData);

    logData.forEach(async (log) => {
      try {
        const query = `
          INSERT INTO logs (timestamp, hostname, ip_address, severity, message, source_host)
          VALUES ($1, $2, $3, $4, $5, $6)
        `;
        const values = [log.timestamp, log.hostname, log.ip_address, log.severity, log.message, log.source_host];

        await client.query(query, values);

        console.log('[DEBUG] Log inserted into PostgreSQL');

	if (SPLUNK_ENABLED === true) {
	  await forwardLogToSplunk(logData);
	}
      } catch (error) {
        console.error('[ERROR] Failed to insert log into PostgreSQL:', error);
      }
    });
  } else {
    console.log('[DEBUG] Failed to parse syslog message');
  }
});

const forwardLogToSplunk = async (logData) => {
  try {
    console.log('[DEBUG] Forwarding log to Splunk');
    const response = await axios.post(SPLUNK_URL, {
      event: JSON.stringify(logData),
      index: 'main',
      sourcetype: 'syslog',
    }, {
      headers: {
        'Authorization': `Splunk ${SPLUNK_TOKEN}`,
        'Content-Type': 'application/json',
      }
    });
    console.log('[DEBUG] Log forwarded to Splunk with status:', response.status);
  } catch (error) {
    console.error('[ERROR] Error forwarding log to Splunk:', error);
  }
};

server.bind(514, () => {
  console.log('Syslog server listening on port 514');
});
