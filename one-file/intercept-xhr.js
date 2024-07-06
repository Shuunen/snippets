/* c8 ignore start */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable jsdoc/require-jsdoc */
const lastRequest = { method: '', url: '' }

// @ts-ignore
// eslint-disable-next-line @typescript-eslint/naming-convention
const OldXHR = window.XMLHttpRequest

function XhrProxy () {
  // @ts-ignore
  const instance = new OldXHR()
  instance.addEventListener('readystatechange', () => {
    if (instance.readyState === 4 && instance.status !== 200) console.log(`HTTP Error ${instance.status} on ${lastRequest.method} ${lastRequest.url}`)
  }, false)
  return instance
}

const originalOpen = OldXHR.prototype.open
// eslint-disable-next-line func-name-matching
OldXHR.prototype.open = function openProxy (/** @type {string} */ method, /** @type {string} */ url) {
  lastRequest.method = method
  lastRequest.url = url
  // @ts-ignore
  // eslint-disable-next-line prefer-rest-params, @typescript-eslint/no-confusing-void-expression
  return originalOpen.apply(this, Array.prototype.slice.call(arguments))
}

// @ts-ignore
window.XMLHttpRequest = XhrProxy

