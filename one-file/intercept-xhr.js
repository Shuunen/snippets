/* c8 ignore start */
/* eslint-disable no-magic-numbers */
/* eslint-disable import/unambiguous */
const lastRequest = { method: '', url: '' }

// @ts-ignore
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
// eslint-disable-next-line func-name-matching, sonar/class-prototype
OldXHR.prototype.open = function openProxy (/** @type {string} */ method, /** @type {string} */ url) {
  lastRequest.method = method
  lastRequest.url = url
  // @ts-ignore
  // eslint-disable-next-line prefer-rest-params
  return originalOpen.apply(this, Array.prototype.slice.call(arguments))
}

// @ts-ignore
window.XMLHttpRequest = XhrProxy

