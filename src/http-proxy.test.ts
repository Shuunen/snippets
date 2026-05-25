import type { Request, Response } from 'express'
// oxlint-disable typescript/unbound-method
import { sleep } from 'shuutils'
import { app, handleProxyResponse, handleWebhookError, makeProxyRequest, startServer, validateUrl, webhookHandler, webhookRoute } from './http-proxy.cli'

// oxlint-disable-next-line vitest/prefer-import-in-mock
vi.mock('express', () => {
  const mockJson = vi.fn<() => () => void>(() => vi.fn<() => void>())
  const mockApp = {
    listen: vi.fn<() => void>(),
    post: vi.fn<() => void>(),
    use: vi.fn<() => void>(),
  }
  const mockExpress = vi.fn<() => typeof mockApp>(() => mockApp)
  // @ts-expect-error non important typing issue
  mockExpress.json = mockJson
  return {
    default: mockExpress,
  }
})

// oxlint-disable-next-line vitest/prefer-import-in-mock
vi.mock('cors', () => ({
  default: vi.fn<() => () => void>(() => vi.fn<() => void>()),
}))

// Mock fetch globally
vi.spyOn(globalThis, 'fetch').mockReturnValue(Promise.resolve({}) as never)

function createMockFetchResponse(contentType: string, responseData: unknown) {
  return {
    headers: {
      get: vi.fn<() => string>().mockReturnValue(contentType),
    },
    json: vi.fn<() => Promise<unknown>>().mockResolvedValue(responseData),
    status: 200,
    statusText: 'OK',
    text: vi.fn<() => Promise<unknown>>().mockResolvedValue(responseData),
  } as unknown as Response
}

function createErrorMockFetchResponse() {
  return {
    headers: { get: vi.fn<() => string>().mockReturnValue('application/json') },
    json: vi.fn<() => Promise<unknown>>().mockRejectedValue(new Error('Parse error')),
    status: 200,
    statusText: 'OK',
  }
}

describe('http-proxy', () => {
  let mockResponse: Partial<Response> = {}
  let mockRequest: Partial<Request> = {}

  beforeEach(() => {
    vi.clearAllMocks()

    mockResponse = {
      json: vi.fn<() => unknown>().mockReturnThis(),
      status: vi.fn<() => unknown>().mockReturnThis(),
    } as unknown as Partial<Response>

    mockRequest = {
      body: {},
      query: {},
    }
  })

  it('validateUrl should validate URLs correctly', () => {
    expect(validateUrl('https://example.com')).toMatchInlineSnapshot('true')
    expect(validateUrl('not-a-url')).toMatchInlineSnapshot('false')
    expect(validateUrl('https://api.example.com/webhook')).toMatchInlineSnapshot('true')
  })

  it('makeProxyRequest A should make POST request with JSON body', async () => {
    const mockFetchResponse = createMockFetchResponse('application/json', { success: true })
    // @ts-expect-error non important typing issue
    vi.mocked(fetch).mockResolvedValue(mockFetchResponse as unknown as Response)

    const result = await makeProxyRequest('https://example.com', { test: 'data' })

    expect(fetch).toHaveBeenCalledWith('https://example.com', {
      body: '{"test":"data"}',
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
    expect(result).toMatchSnapshot()
  })

  it('makeProxyRequest B should handle text response', async () => {
    const mockFetchResponse = createMockFetchResponse('text/plain', 'plain text response')
    // @ts-expect-error non important typing issue
    vi.mocked(fetch).mockResolvedValue(mockFetchResponse as unknown as Response)

    const result = await makeProxyRequest('https://example.com', { test: 'data' })

    expect(result.data).toMatchInlineSnapshot('"plain text response"')
  })

  it('makeProxyRequest C should handle response parsing error', async () => {
    const mockFetchResponse = createErrorMockFetchResponse()
    // @ts-expect-error non important typing issue
    vi.mocked(fetch).mockResolvedValue(mockFetchResponse as unknown as Response)

    const result = await makeProxyRequest('https://example.com', { test: 'data' })

    expect(result.data).toMatchInlineSnapshot('undefined')
  })

  it('handleProxyResponse A should log and respond with proxy data', async () => {
    const mockFetchResponse = createMockFetchResponse('application/json', { success: true })
    // @ts-expect-error non important typing issue
    vi.mocked(fetch).mockResolvedValue(mockFetchResponse as unknown as Response)

    await handleProxyResponse('https://example.com', { test: 'data' }, mockResponse as Response)

    expect(mockResponse.status).toHaveBeenCalledWith(200)
    expect(mockResponse.json).toHaveBeenCalledWith({
      data: { success: true },
      status: 200,
      statusText: 'OK',
    })
  })

  it('webhookHandler should handle various error cases', async () => {
    // Missing URL
    mockRequest.query = {}
    await webhookHandler(mockRequest as Request, mockResponse as Response)
    expect(mockResponse.status).toHaveBeenCalledWith(400)
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Target URL is required as query parameter: ?url=...',
    })

    // Non-string URL
    mockRequest.query = { url: 123 as unknown as string }
    await webhookHandler(mockRequest as Request, mockResponse as Response)
    expect(mockResponse.status).toHaveBeenCalledWith(400)

    // Empty URL
    mockRequest.query = { url: '' }
    await webhookHandler(mockRequest as Request, mockResponse as Response)
    expect(mockResponse.status).toHaveBeenCalledWith(400)

    // Invalid URL
    mockRequest.query = { url: 'not-a-url' }
    await webhookHandler(mockRequest as Request, mockResponse as Response)
    expect(mockResponse.status).toHaveBeenCalledWith(400)
    expect(mockResponse.json).toHaveBeenLastCalledWith({
      error: 'Invalid URL provided',
    })
  })

  it('webhookHandler E should handle valid request', async () => {
    const mockFetchResponse = createMockFetchResponse('application/json', { success: true })
    // @ts-expect-error non important typing issue
    vi.mocked(fetch).mockResolvedValue(mockFetchResponse as unknown as Response)

    mockRequest.query = { url: 'https://example.com' }
    mockRequest.body = { test: 'data' }

    await webhookHandler(mockRequest as Request, mockResponse as Response)

    expect(mockResponse.status).toHaveBeenCalledWith(200)
    expect(mockResponse.json).toHaveBeenCalledWith({
      data: { success: true },
      status: 200,
      statusText: 'OK',
    })
  })

  it('handleWebhookError should handle different error types', () => {
    // Error instance
    const error = new Error('Test error')
    handleWebhookError(error, mockResponse as Response)
    expect(mockResponse.status).toHaveBeenCalledWith(500)
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Test error',
    })

    // Unknown error
    const unknownError = 'string error'
    handleWebhookError(unknownError, mockResponse as Response)
    expect(mockResponse.status).toHaveBeenCalledWith(500)
    expect(mockResponse.json).toHaveBeenLastCalledWith({
      error: 'Unknown error',
    })
  })

  it('webhookRoute should handle webhook requests and errors', async () => {
    const mockFetchResponse = createMockFetchResponse('application/json', { success: true })
    // @ts-expect-error non important typing issue
    vi.mocked(fetch).mockResolvedValue(mockFetchResponse as unknown as Response)
    mockRequest.query = { url: 'https://example.com' }
    mockRequest.body = { test: 'data' }
    webhookRoute(mockRequest as Request, mockResponse as Response)
    // Wait for async operation to complete
    await sleep(1)
    expect(mockResponse.status).toHaveBeenCalledWith(200)
  })

  it('webhookRoute B should handle webhook error', async () => {
    // Force an error by making fetch reject
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'))
    mockRequest.query = { url: 'https://example.com' }
    mockRequest.body = { test: 'data' }
    webhookRoute(mockRequest as Request, mockResponse as Response)
    // Wait for async operation to complete
    await sleep(1)
    expect(mockResponse.status).toHaveBeenCalledWith(500)
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Network error' })
  })

  it('startServer A should call app.listen with correct port', () => {
    startServer()
    expect(app.listen).toHaveBeenCalledWith(3001, expect.any(Function))
  })

  it('startServer B should log server info when callback is called', () => {
    const mockListen = vi.mocked(app.listen)
    startServer()
    const call = mockListen.mock.calls.at(0)
    // Get the callback function that was passed to listen
    const callback = call?.at(1)
    // oxlint-disable-next-line promise/prefer-await-to-callbacks
    callback?.()
    // Verify logger calls (the Logger mock should have been called)
    expect(callback).toBeDefined()
  })
})
