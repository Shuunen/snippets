/* c8 ignore start */
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* global ndef */
// @ts-expect-error missing types
import mifare from 'mifare-classic'

console.log('mifare-classic script starting')

mifare.read((/** @type {any} */ error, /** @type {{ toJSON: () => any; }} */ data, /** @type {any} */ uid) => {
  if (error) throw error
  console.log('The NFC tag UID is', uid)
  // @ts-expect-error ndef not defined
  const message = ndef.decodeMessage(data.toJSON())
  // @ts-expect-error ndef not defined
  console.log(ndef.stringify(message))
})
