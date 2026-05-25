/**
 * @param input the text to clean
 * @returns {string} the readable string
 */
function readable(input = '') {
  return input
    .replaceAll(/\([^(]+\)/gu, ' ') // remove parenthesis content(s)
    .replaceAll(/['’-]/gu, ' ')
    .normalize('NFD')
    .replaceAll(/[^\d\sa-z]/giu, '')
    .toLowerCase() // from shuutils sanitize
    .replaceAll(/ {2,}/gu, ' ')
}

/**
 * @param input the csv string
 * @returns {string} the compressed csv
 */
export function compressCsv(input: string) {
  return input
    .replaceAll(/"[^"]*"/gu, '') // remove double quotes content(s)
    .split('\n')
    .slice(1)
    .map(line => {
      const [name, domain, _year, _region, _country, , _avgRating, _scanDate, _location, rating = ''] = line.split(',')
      const wine = `${readable(name)} ${readable(domain)}`.trim()
      return rating ? [wine, rating].join(',') : ''
    })
    .filter(line => line.length > 1)
    .join('\n')
}
