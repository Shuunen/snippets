/* v8 ignore start */
// number of lines the last tracked draw() call printed, so it can be wiped without nuking the
// terminal's scrollback (and any useful log lines printed before/between draws)
let lastRenderLineCount = 0

/**
 * Erase the panel drawn by the last withLineCounting() call, if any, without touching anything
 * printed before it (unlike console.clear(), which wipes the whole screen and scrollback)
 */
export function clearLastRender() {
  if (lastRenderLineCount === 0) return
  process.stdout.write(`[${lastRenderLineCount}A[0J`)
  lastRenderLineCount = 0
}

/**
 * Run a function while counting the lines it prints through console.log (which logger.info also
 * goes through), so the next clearLastRender() call knows exactly how much to erase. Patching
 * console.log itself (rather than process.stdout.write) is required under Bun, whose console
 * implementation writes to the terminal without going through process.stdout.write
 * @param draw the function drawing the panel
 */
export function withLineCounting(draw: () => void) {
  const originalLog = console.log.bind(console)
  let lineCount = 0
  console.log = (...args: unknown[]) => {
    lineCount += 1
    originalLog(...args)
  }
  try {
    draw()
  } finally {
    console.log = originalLog
  }
  lastRenderLineCount = lineCount
}
