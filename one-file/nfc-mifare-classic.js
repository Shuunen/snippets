/* c8 ignore start */
/* global ndef */
// @ts-ignore
import mifare from 'mifare-classic'

console.log('mifare-classic script starting')

mifare.read(function onRead (/** @type {any} */ error, /** @type {{ toJSON: () => any; }} */ data, /** @type {any} */ uid) {
  if (error) throw error
  console.log('The NFC tag UID is', uid)
  // @ts-ignore
  const message = ndef.decodeMessage(data.toJSON())
  // @ts-ignore
  console.log(ndef.stringify(message))
})
