#!/usr/bin/env bun
import { cac } from 'cac'
import { blue, createInMemoryDriver, Logger } from 'shuutils'

// cd into the folder and use me like :
// bun ~/Projects/github/snippets/src/stock-infos.cli.ts GOOG

export const logger = new Logger({ storage: createInMemoryDriver() })

function getStockInfos(stock: string) {
  logger.info(`Getting stock infos for ${blue(stock)}`)
}

/**
 * Start the process
 * @param {string[]} args - command line arguments, the process ones by default
 * @returns {void}
 */
export function start(args?: string[]) {
  const cli = cac('stock-infos')
  cli.usage('<stock>').help()
  const { args: positionals, options } = cli.parse(args)
  if (options.help === true) return
  logger.info('Stock infos check started')
  const stock = positionals.at(0)
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
