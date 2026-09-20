/* v8 ignore start */
// number of lines the last tracked draw() call printed, so it can be wiped without nuking the
// terminal's scrollback (and any useful log lines printed before/between draws)
let lastRenderLineCount = 0

/**
 * Erase the panel drawn by the last draw() call, if any, without touching anything printed before
 * it (unlike console.clear(), which wipes the whole screen and scrollback)
 */
export function clearLastRender() {
  if (lastRenderLineCount === 0) return
  process.stdout.write(`[${lastRenderLineCount}A[0J`)
  lastRenderLineCount = 0
}

/**
 * Draw a whole panel in a single write, remembering its height so the next clearLastRender() call
 * knows exactly how much to erase. One write rather than one per row also means the panel never
 * appears half-drawn, and the height comes from the frame itself instead of from counting
 * console.log calls — which used to require patching console.log globally, since Bun's console
 * doesn't go through process.stdout.write
 * @param lines the frame's rows, top to bottom
 */
export function draw(lines: string[]) {
  process.stdout.write(`${lines.join('\n')}\n`)
  lastRenderLineCount = lines.length
}
