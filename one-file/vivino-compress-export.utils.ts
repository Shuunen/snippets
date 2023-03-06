function readable (input = ''): string {
  return input
    .replace(/\([^(]+\)/gu, ' ') // remove parenthesis content(s)
    .replace(/['’-]/gu, ' ').normalize('NFD').replace(/[^\d\sa-z]/giu, '').toLowerCase() // from shuutils sanitize
    .replace(/ {2,}/gu, ' ')
}

export function compressCsv (input: string): string {
  return input
    .replace(/"[^"]*"/gu, '') // remove double quotes content(s)
    .split('\n')
    .slice(1)
    .map((line) => {
      // eslint-disable-next-line @typescript-eslint/naming-convention, no-underscore-dangle
      const [name, domain, _year, _region, _country, , _avgRating, _scanDate, _location, rating = ''] = line.split(',')
      const wine = `${readable(name)} ${readable(domain)}`.trim()
      return rating ? [wine, rating].join(',') : ''
    })
    .filter((line) => line.length > 1)
    .join('\n')
}
