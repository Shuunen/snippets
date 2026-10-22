const regex = {
  quality: /\b(?<height>2160|1080|720|576|480|360)p\b/iu,
  quality4k: /\b(?:4K|UHD)\b/iu,
}
const uhd = 2160
const fullHd = 1080
const hd = 720
const pal = 576
const ntsc = 480
const uhdMinWidth = 3000
const fullHdMinWidth = 1800
const hdMinWidth = 1200
const palMinHeight = 500

/**
 * Detect the resolution written in a file name
 * @param name the file name
 * @returns the height like 1080, or undefined if not written
 */
export function qualityFromName(name: string) {
  const height = regex.quality.exec(name)?.groups?.height
  if (height) return Number(height)
  return regex.quality4k.test(name) ? uhd : undefined
}

/**
 * Convert the real size of a video to a standard resolution
 * @param width the video width in pixels
 * @param height the video height in pixels
 * @returns the closest standard height like 1080
 */
export function qualityFromSize(width: number, height: number) {
  if (width >= uhdMinWidth) return uhd
  if (width >= fullHdMinWidth) return fullHd
  if (width >= hdMinWidth) return hd
  return height >= palMinHeight ? pal : ntsc
}

/**
 * @param output the stdout of ffprobe with csv=p=0 output
 * @returns the width and height, or undefined if the output is not readable
 */
export function parseProbe(output: string) {
  const [width, height] = output.trim().split('\n')[0].split(',').map(Number)
  if (!width || !height) return undefined
  return { height, width }
}

/**
 * @param qualities the resolutions found
 * @returns the resolutions sorted from the best, without duplicates
 */
export function sortQualities(qualities: number[]) {
  return [...new Set(qualities)].toSorted((qualityA, qualityB) => qualityB - qualityA)
}

/**
 * @param qualities the resolutions found
 * @returns the text to display
 * @example formatQualities([720, 1080, 720]) // '1080p · 720p'
 */
export function formatQualities(qualities: number[]) {
  return sortQualities(qualities)
    .map(quality => `${quality}p`)
    .join(' · ')
}
