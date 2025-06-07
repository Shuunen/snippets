/* c8 ignore start */
const lastRequest = { method: '', url: '' }

// @ts-ignore
const OldXHR = globalThis.XMLHttpRequest

function XhrProxy() {
  // @ts-ignore
  const instance = new OldXHR()
  instance.addEventListener(
    'readystatechange',
    () => {
      if (instance.readyState === 4 && instance.status !== 200) console.log(`HTTP Error ${instance.status} on ${lastRequest.method} ${lastRequest.url}`)
    },
    false,
  )
  return instance
}

const originalOpen = OldXHR.prototype.open
OldXHR.prototype.open = function openProxy(/** @type {string} */ method, /** @type {string} */ url) {
  lastRequest.method = method
  lastRequest.url = url
  // @ts-ignore
  // biome-ignore lint/style/noArguments: <explanation>
  return originalOpen.apply(this, Array.prototype.slice.call(arguments))
}

// @ts-ignore
globalThis.XMLHttpRequest = XhrProxy
