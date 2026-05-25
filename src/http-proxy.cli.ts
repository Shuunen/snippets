import cors from 'cors'
import express, { type Request, type Response } from 'express'
import { Logger, nbSpacesIndent, Result } from 'shuutils'

export const app = express()
const logger = new Logger({ willLogTime: true, willOutputToConsole: process.env.NODE_ENV !== 'test' })
const httpBadRequest = 400
const httpServerError = 500
const port = 3001

app.use(cors())
app.use(express.json())

export function validateUrl(url: string): boolean {
  const result = Result.trySafe(() => new URL(url))
  const { error } = Result.unwrap(result)
  return !error
}

export async function makeProxyRequest(targetUrl: string, body: unknown) {
  const response = await fetch(targetUrl, {
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })
  let data: unknown = undefined
  const contentType = response.headers.get('content-type')
  const parseResult = contentType?.includes('application/json') ? await Result.trySafe(response.json()) : await Result.trySafe(response.text())
  const { value, error } = Result.unwrap(parseResult)
  /* v8 ignore if */
  if (!error) data = value
  return { data, response }
}

export async function handleProxyResponse(targetUrl: string, body: unknown, res: Response) {
  logger.info(`Proxying POST request to: ${targetUrl}`)
  logger.info(`Payload:`, JSON.stringify(body, undefined, nbSpacesIndent))
  const { data, response } = await makeProxyRequest(targetUrl, body)
  logger.success(`Response (${response.status}):`, data)
  res.status(response.status).json({
    data,
    status: response.status,
    statusText: response.statusText,
  })
}

export async function webhookHandler(req: Request, res: Response) {
  const targetUrl = req.query.url
  if (typeof targetUrl !== 'string') {
    res.status(httpBadRequest).json({ error: 'Target URL is required as query parameter: ?url=...' })
    return
  }
  if (!targetUrl) {
    res.status(httpBadRequest).json({ error: 'Target URL is required as query parameter: ?url=...' })
    return
  }
  if (!validateUrl(targetUrl)) {
    res.status(httpBadRequest).json({ error: 'Invalid URL provided' })
    return
  }
  await handleProxyResponse(targetUrl, req.body, res).catch((error: unknown) => handleWebhookError(error, res))
}

export function handleWebhookError(error: unknown, res: Response) {
  logger.error('Webhook proxy error:', error)
  res.status(httpServerError).json({ error: error instanceof Error ? error.message : 'Unknown error' })
}

export function webhookRoute(req: Request, res: Response) {
  void webhookHandler(req, res)
}

app.post('/webhook', webhookRoute)

export function startServer() {
  app.listen(port, () => {
    logger.info(`Proxy running on http://localhost:${port}`)
    logger.info(`Usage for webhooks : POST http://localhost:${port}/webhook?url=TARGET_URL`)
  })
}

// Only start server if not in test environment
/* v8 ignore next */
if (process.env.NODE_ENV !== 'test') startServer()
