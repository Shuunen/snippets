/* v8 ignore start */
// oxlint-disable no-bitwise, no-magic-numbers, max-lines-per-function
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import path from 'node:path'
import { Logger, nbPercentMax, Result } from 'shuutils'

const currentFolder = import.meta.dirname
const wsPort = 54_430
const maxPhilipsHue = 20_000
const regex = /^set-progress (?<value>\d+)$/u
const hueEndpoint = readFileSync(path.join(currentFolder, 'hue-progress.endpoint'), 'utf8').trim()
const logger = new Logger()

// Disable SSL certificate validation
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

/**
 * Returns a hue color based on the progress percentage, from red to green
 * @param percent the progress percentage
 * @returns the hue color between 0 (red) and 20000 (green)
 */
function getHueColor(percent = 0) {
  return Math.round((percent * maxPhilipsHue) / nbPercentMax)
}

/**
 * Returns the body to emit a hue color based on the progress percentage
 * @param {number} percent the progress percentage
 * @returns the body to emit a hue color based on the progress percentage
 */
function getHueColorBody(percent = 0) {
  const isEveryThingDone = percent === nbPercentMax
  const body = { bri: 255, hue: getHueColor(percent), on: !isEveryThingDone, sat: 255 }
  logger.info(`with a ${percent}% progress will emit hue color`, body)
  return JSON.stringify(body)
}

/**
 * Emit a hue color based on the progress percentage
 * @param {number} percent the progress percentage
 * @returns {Promise<void>} a promise that resolves when the hue color is emitted
 */
async function setProgress(percent = 0) {
  logger.info(`Setting progress to ${percent}%`)
  const request = {
    body: getHueColorBody(percent),
    headers: { 'Content-Type': 'application/json' },
    method: 'PUT',
  }
  const result = await Result.trySafe(fetch(hueEndpoint, request))
  if (result.ok) logger.info('emitted hue color successfully')
  else logger.error('error emitting hue color', result.error)
}

const sockets = new Set()

const server = createServer((_request, response) => {
  response.writeHead(404)
  response.end()
})

server.on('upgrade', (request, socket) => {
  if (request.headers.upgrade !== 'websocket') {
    socket.end('HTTP/1.1 400 Bad Request')
    return
  }

  socket.on('error', error => {
    logger.info('Socket error:', error.message)
    sockets.delete(socket)
  })

  const key = request.headers['sec-websocket-key']
  const acceptKey = createHash('sha1').update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest('base64')

  const headers = ['HTTP/1.1 101 Switching Protocols', 'Upgrade: websocket', 'Connection: Upgrade', `Sec-WebSocket-Accept: ${acceptKey}`, '', '']

  socket.write(headers.join('\r\n'))

  sockets.add(socket)

  // oxlint-disable-next-line max-statements
  socket.on('data', buffer => {
    try {
      const masked = (buffer[1] & 0x80) === 0x80
      let length = buffer[1] & 0x7f
      let maskStart = 2

      if (length === 126) {
        length = buffer.readUInt16BE(2)
        maskStart = 4
      } else if (length === 127) {
        length = buffer.readBigUInt64BE(2)
        maskStart = 10
      }

      const data = Buffer.alloc(length)
      if (masked) {
        const maskKey = buffer.slice(maskStart, maskStart + 4)
        const payload = buffer.slice(maskStart + 4, maskStart + 4 + length)
        for (let index = 0; index < length; index += 1) data[index] = payload[index] ^ maskKey[index % 4]
      }

      const text = data.toString()
      const { value } = regex.exec(text)?.groups ?? {}

      if (value === undefined) logger.error('Invalid message:', text)
      else setProgress(Number(value))
      logger.info('Received:', text)
      const response = Buffer.from(`Server received: ${text}`)
      const responseFrame = Buffer.alloc(2 + response.length)
      responseFrame[0] = 0x81
      responseFrame[1] = response.length
      response.copy(responseFrame, 2)
      socket.write(responseFrame)
    } catch (error) {
      logger.error('Error processing message:', error)
    }
  })

  socket.on('end', () => {
    logger.info('Client disconnected')
    sockets.delete(socket)
  })

  socket.on('close', () => {
    logger.info('Connection closed')
    sockets.delete(socket)
  })
})

process.on('SIGINT', () => {
  logger.info('\nGracefully shutting down...')
  for (const socket of sockets) socket.end()
  server.close(() => {
    logger.info('Server shut down complete')
    process.exit(0)
  })
})

process.on('uncaughtException', error => {
  // Keep the server running despite uncaught exceptions
  logger.error('Uncaught Exception:', error)
})

server.listen(wsPort, () => {
  logger.info(`WebSocket server started on ws://localhost:${wsPort}`)
})
