/* c8 ignore start */
/* global ndef */
// @ts-expect-error missing types
// biome-ignore lint/correctness/noUndeclaredDependencies: <explanation>
import mifare from 'mifare-classic'

console.log('mifare-classic script starting')

mifare.read((/** @type {any} */ error, /** @type {{ toJSON: () => any; }} */ data, /** @type {any} */ uid) => {
  if (error) throw error
  console.log('The NFC tag UID is', uid)
  // @ts-expect-error ndef not defined
  // biome-ignore lint/correctness/noUndeclaredVariables: <explanation>
  const message = ndef.decodeMessage(data.toJSON())
  // @ts-expect-error ndef not defined
  // biome-ignore lint/correctness/noUndeclaredVariables: <explanation>
  console.log(ndef.stringify(message))
})
