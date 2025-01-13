import { readFileSync } from 'node:fs';
import https from 'node:https'
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const thisFilePath = fileURLToPath(import.meta.url)
const currentFolder = path.dirname(thisFilePath)
const httpsPort = 54_430;
const options = {
  cert: readFileSync(path.join(currentFolder, 'hue-progress.pem')),
  key: readFileSync(path.join(currentFolder, 'hue-progress-key.pem')),
}
const regex = /^\/set-progress\/(?<value>\d+)$/u;
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
 * @param {import('node:http').ServerResponse} response the response object
 * @param {number} percent the progress percentage
 * @returns {void} a promise that resolves when the hue color is emitted
 */
function setProgress (response, percent = 0) {
  console.log(`Setting progress to ${percent}%`);
  const request = {
    body: getHueColorBody(percent),
    headers: { 'Content-Type': 'application/json' },
    method: 'PUT',
  }
  fetch(hueEndpoint, request)
    .then(() => { console.log('emitted hue color successfully'); response.writeHead(200); response.end(`Progress set to ${percent}% :)`); })
    .catch((error) => { console.error('error emitting hue color', error); response.writeHead(500); response.end(`Error setting progress to ${percent}% :/`); })
}
/**
 * Handle the request.
 * @param {import('node:http').IncomingMessage} request The request object.
 * @param {import('node:http').ServerResponse} response The response object.
 */
function onRequest (request, response) {
  const { headers, socket, url = '' } = request;
  const { value } = regex.exec(url)?.groups ?? {};
  if (value === undefined) {
    response.writeHead(404);
    response.end('Not Found\n');
  } else {
    console.log(`Request received`, { ip: socket.remoteAddress, origin: headers.origin, url });
    setProgress(response, Number.parseInt(value, 10));
  }
}

https.createServer(options, (request, response) => { onRequest(request, response); }).listen(httpsPort);

console.log(`Server https listening on port ${httpsPort}`);
