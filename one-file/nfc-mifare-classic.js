/* global ndef */

import mifare from './node_modules/mifare-classic'

console.log('mifare-classic script starting')

mifare.read(function onRead (error, data, uid) {
  if (error) throw error
  console.log('The NFC tag UID is', uid)
  const message = ndef.decodeMessage(data.toJSON())
  console.log(ndef.stringify(message))
})
