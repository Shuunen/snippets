/* v8 ignore start */
import mifare from 'mifare-classic'
// oxlint-disable no-undef
// @ts-expect-error missing types
import { Logger } from 'shuutils'

const logger = new Logger()

logger.info('mifare-classic script starting')

// oxlint-disable-next-line promise/prefer-await-to-callbacks
mifare.read((/** @type {any} */ error, /** @type {{ toJSON: () => any; }} */ data, /** @type {any} */ uid) => {
  if (error) throw error
  logger.info('The NFC tag UID is', uid)
  // @ts-expect-error ndef not defined
  const message = ndef.decodeMessage(data.toJSON())
  // @ts-expect-error ndef not defined
  logger.info(ndef.stringify(message))
})
