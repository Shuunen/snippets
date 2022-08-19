const lastRequest = { url: '', method: '' }

const OldXHR = window.XMLHttpRequest

function newXHR () {
  const instance = new OldXHR()
  instance.addEventListener('readystatechange', () => {
    if (instance.readyState === 4 && instance.status !== 200) console.log(`HTTP Error ${instance.status} on ${lastRequest.method} ${lastRequest.url}`)
  }, false)
  return instance
}

const originalOpen = OldXHR.prototype.open
OldXHR.prototype.open = function open (/** @type {string} */ method, /** @type {string} */ url) {
  lastRequest.method = method
  lastRequest.url = url
  // @ts-ignore
  return originalOpen.apply(this, Array.prototype.slice.call(arguments))
}

// @ts-ignore
window.XMLHttpRequest = newXHR

