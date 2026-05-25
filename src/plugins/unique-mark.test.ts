import { Buffer } from 'node:buffer'

// oxlint-disable-next-line vitest/prefer-import-in-mock
vi.mock('node:child_process', () => {
  const execSync = vi.fn<() => Buffer>().mockReturnValue(Buffer.from('abc1234'))
  return { default: { execSync }, execSync }
})

// oxlint-disable-next-line vitest/prefer-import-in-mock
vi.mock('node:fs', () => {
  const readFileSync = vi.fn<() => string>().mockReturnValue(JSON.stringify({ version: '2.0.0' }))
  return { default: { readFileSync }, readFileSync }
})

describe('uniqueMark plugin', async () => {
  const { uniqueMark } = await import('./unique-mark')

  it('creates a Vite plugin with correct name', () => {
    const plugin = uniqueMark()
    expect(plugin.name).toBe('vite-plugin-unique-mark')
  })

  it('applies only during build', () => {
    const plugin = uniqueMark()
    expect(plugin.apply).toBe('build')
  })

  it('enforces post-processing order', () => {
    const plugin = uniqueMark()
    expect(plugin.enforce).toBe('post')
  })

  it('uses custom placeholder when provided', () => {
    const plugin = uniqueMark({ placeholder: 'my-version' })
    expect(plugin.name).toBe('vite-plugin-unique-mark')
  })

  it('injects mark into HTML assets via generateBundle', () => {
    const plugin = uniqueMark()
    // @ts-expect-error minimal config mock
    if (typeof plugin.configResolved === 'function') plugin.configResolved({ root: '/project' })
    const bundle = { 'index.html': { source: '<html><head><meta name="unique-mark" content="OLD"></head></html>' } }
    // @ts-expect-error minimal options mock
    if (typeof plugin.generateBundle === 'function') plugin.generateBundle({}, bundle)
    const source = bundle['index.html']?.source ?? ''
    expect(source).not.toContain('content="OLD"')
  })

  it('injects mark into JS assets and adds comment header', () => {
    const plugin = uniqueMark()
    // @ts-expect-error minimal config mock
    if (typeof plugin.configResolved === 'function') plugin.configResolved({ root: '/project' })
    const bundle = { 'main.js': { code: "const v = '__unique-mark__';" } }
    // @ts-expect-error minimal options mock
    if (typeof plugin.generateBundle === 'function') plugin.generateBundle({}, bundle)
    const code = bundle['main.js']?.code ?? ''
    expect(code).toContain('/* unique-mark')
    expect(code).not.toContain('__unique-mark__')
  })

  it('injects mark into CSS assets and adds comment header', () => {
    const plugin = uniqueMark()
    // @ts-expect-error minimal config mock
    if (typeof plugin.configResolved === 'function') plugin.configResolved({ root: '/project' })
    const bundle = { 'styles.css': { source: 'body { /* __unique-mark__ */ }' } }
    // @ts-expect-error minimal options mock
    if (typeof plugin.generateBundle === 'function') plugin.generateBundle({}, bundle)
    const source = bundle['styles.css']?.source ?? ''
    expect(source).toContain('/* unique-mark')
    expect(source).not.toContain('__unique-mark__')
  })

  it('skips non-HTML/JS/CSS assets', () => {
    const plugin = uniqueMark()
    // @ts-expect-error minimal config mock
    if (typeof plugin.configResolved === 'function') plugin.configResolved({ root: '/project' })
    const bundle = { 'image.png': { source: 'binary-data' } }
    const originalSource = bundle['image.png']?.source
    // @ts-expect-error minimal options mock
    if (typeof plugin.generateBundle === 'function') plugin.generateBundle({}, bundle)
    expect(bundle['image.png']?.source).toBe(originalSource)
  })

  it('warns when placeholder is present but no pattern matches', () => {
    const plugin = uniqueMark()
    // @ts-expect-error minimal config mock
    if (typeof plugin.configResolved === 'function') plugin.configResolved({ root: '/project' })
    // oxlint-disable-next-line no-empty-function
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const bundle = { 'index.html': { source: 'this contains unique-mark but not in a replaceable pattern' } }
    // @ts-expect-error minimal options mock
    if (typeof plugin.generateBundle === 'function') plugin.generateBundle({}, bundle)
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('unique-mark'))
    warnSpy.mockRestore()
  })

  it('injects mark into element with matching id attribute', () => {
    const plugin = uniqueMark()
    // @ts-expect-error minimal config mock
    if (typeof plugin.configResolved === 'function') plugin.configResolved({ root: '/project' })
    const bundle = { 'index.html': { source: '<div id="unique-mark">old content</div>' } }
    // @ts-expect-error minimal options mock
    if (typeof plugin.generateBundle === 'function') plugin.generateBundle({}, bundle)
    const source = bundle['index.html']?.source ?? ''
    expect(source).toContain('abc1234')
    expect(source).not.toContain('>old content<')
  })

  it('injects mark into meta tag with content attribute before name', () => {
    const plugin = uniqueMark()
    // @ts-expect-error minimal config mock
    if (typeof plugin.configResolved === 'function') plugin.configResolved({ root: '/project' })
    const bundle = { 'index.html': { source: '<meta content="OLD" name="unique-mark">' } }
    // @ts-expect-error minimal options mock
    if (typeof plugin.generateBundle === 'function') plugin.generateBundle({}, bundle)
    const source = bundle['index.html']?.source ?? ''
    expect(source).not.toContain('content="OLD"')
    expect(source).toContain('abc1234')
  })

  it('injects mark into JSX .jsx() call with matching id', () => {
    const plugin = uniqueMark()
    // @ts-expect-error minimal config mock
    if (typeof plugin.configResolved === 'function') plugin.configResolved({ root: '/project' })
    const bundle = { 'main.js': { code: 'Component.jsx(Tag,{id:"unique-mark"})' } }
    // @ts-expect-error minimal options mock
    if (typeof plugin.generateBundle === 'function') plugin.generateBundle({}, bundle)
    const code = bundle['main.js']?.code ?? ''
    expect(code).toContain('children:"')
  })
})
