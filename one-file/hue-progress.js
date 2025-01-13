/* c8 ignore start */
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, no-bitwise, @typescript-eslint/naming-convention, max-statements, max-lines-per-function, @typescript-eslint/no-magic-numbers */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';

const thisFilePath = fileURLToPath(import.meta.url)
const currentFolder = path.dirname(thisFilePath)
const wsPort = 54_430;
const regex = /^set-progress (?<value>\d+)$/u;
const hueEndpoint = readFileSync(path.join(currentFolder, 'hue-progress.endpoint'), 'utf8').trim();

// Disable SSL certificate validation
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

/**
 * Returns a hue color based on the progress percentage, from red to green
 * @param percent the progress percentage
 * @returns the hue color between 0 (red) and 20000 (green)
 */
function getHueColor (percent = 0) {
  return Math.round(percent * 20_000 / 100)
}

/**
 * Returns the body to emit a hue color based on the progress percentage
 * @param {number} percent the progress percentage
 * @returns the body to emit a hue color based on the progress percentage
 */
function getHueColorBody (percent = 0) {
  const isEveryThingDone = percent === 100
  const body = { bri: 255, hue: getHueColor(percent), on: !isEveryThingDone, sat: 255 }
  console.log(`with a ${percent}% progress will emit hue color`, body)
  return JSON.stringify(body)
}

/**
 * Emit a hue color based on the progress percentage
 * @param {number} percent the progress percentage
 * @returns {void} a promise that resolves when the hue color is emitted
 */
function setProgress (percent = 0) {
  console.log(`Setting progress to ${percent}%`);
  const request = {
    body: getHueColorBody(percent),
    headers: { 'Content-Type': 'application/json' },
    method: 'PUT',
  }
  fetch(hueEndpoint, request)
    .then(() => { console.log('emitted hue color successfully'); })
    .catch((error) => { console.error('error emitting hue color', error); })
}

const sockets = new Set();

const server = createServer((_request, response) => {
  response.writeHead(404);
  response.end();
});

server.on('upgrade', (request, socket) => {
  if (request.headers.upgrade !== 'websocket') {
    socket.end('HTTP/1.1 400 Bad Request');
    return;
  }

  socket.on('error', (error) => {
    console.log('Socket error:', error.message);
    sockets.delete(socket);
  });

  const key = request.headers['sec-websocket-key'];
  const acceptKey = createHash('sha1')
    .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
    .digest('base64');

  const headers = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${acceptKey}`,
    '',
    '',
  ];

  socket.write(headers.join('\r\n'));

  sockets.add(socket);

  socket.on('data', (buffer) => {
    try {
      const masked = (buffer[1] & 0x80) === 0x80;
      let length = buffer[1] & 0x7F;
      let maskStart = 2;

      if (length === 126) {
        length = buffer.readUInt16BE(2);
        maskStart = 4;
      } else if (length === 127) {
        length = buffer.readBigUInt64BE(2);
        maskStart = 10;
      }

      const data = Buffer.alloc(length);
      if (masked) {
        const maskKey = buffer.slice(maskStart, maskStart + 4);
        const payload = buffer.slice(maskStart + 4, maskStart + 4 + length);
        for (let index = 0; index < length; index += 1)data[index] = payload[index] ^ maskKey[index % 4];
      }

      const text = data.toString();
      const { value } = regex.exec(text)?.groups ?? {};

      if (value === undefined) console.error('Invalid message:', text);
      else setProgress(Number(value));
      console.log('Received:', text);
      const response = Buffer.from(`Server received: ${text}`);
      const responseFrame = Buffer.alloc(2 + response.length);
      responseFrame[0] = 0x81;
      responseFrame[1] = response.length;
      response.copy(responseFrame, 2);
      socket.write(responseFrame);
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  socket.on('end', () => {
    console.log('Client disconnected');
    sockets.delete(socket);
  });

  socket.on('close', () => {
    console.log('Connection closed');
    sockets.delete(socket);
  });
});

process.on('SIGINT', () => {
  console.log('\nGracefully shutting down...');
  for (const socket of sockets) socket.end();
  server.close(() => {
    console.log('Server shut down complete');
    process.exit(0);
  });
});

process.on('uncaughtException', (error) => {
  // Keep the server running despite uncaught exceptions
  console.error('Uncaught Exception:', error);
});

server.listen(wsPort, () => {
  console.log(`WebSocket server started on ws://localhost:${wsPort}`);
});
