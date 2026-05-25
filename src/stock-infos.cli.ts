import { blue, Logger, nbThird } from 'shuutils'

// cd into the folder and use me like :
// bun ~/Projects/github/snippets/src/stock-infos.cli.ts GOOG

export const logger = new Logger({ willOutputToMemory: true })

function getStockInfos(stock: string) {
  logger.info(`Getting stock infos for ${blue(stock)}`)
}

/**
 * Start the process
 * @param {string[]} args - command line arguments
 * @returns {void}
 */
export function start(args = process.argv) {
  logger.info('Stock infos check started')
  const stock = args[nbThird]
  if (!stock) {
    logger.error('No stock provided. Please provide a stock as an argument, for example : bun stock-infos.cli.ts GOOG')
    return
  }
  getStockInfos(stock)
  logger.success('Stock infos is done')
}

/* v8 ignore next 2 */
// avoid running this script if it's imported for testing
if (process.argv[1]?.includes('stock-infos.cli.ts')) start()
