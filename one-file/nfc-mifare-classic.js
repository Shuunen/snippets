/* global ndef */

import mifare from './node_modules/mifare-classic'

console.log('mifare-classic script starting')

mifare.read(function (err, data, uid) {
  if (err) throw err
  console.log('The NFC tag UID is', uid)
  var message = ndef.decodeMessage(data.toJSON())
  console.log(ndef.stringify(message))
})
