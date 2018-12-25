class Shuutils {
  constructor (app) {
    if (app) {
      this.app = app
    }
  }

  log (...stuff) {
    stuff.unshift(this.app.id + ' :')
    console.log.apply(console, stuff)
  }

  warn (...stuff) {
    stuff.unshift(this.app.id + ' :')
    console.warn.apply(console, stuff)
  }

  error (...stuff) {
    stuff.unshift(this.app.id + ' :')
    console.error.apply(console, stuff)
  }

  debounce (func, wait, immediate) {
    var timeout
    return function () {
      var context = this
      var args = arguments
      var later = function later () {
        timeout = null
        if (!immediate) {
          func.apply(context, args)
        }
      }
      var callNow = immediate && !timeout
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
      if (callNow) {
        func.apply(context, args)
      }
    }
  }

  findOne (selector, context, dontYell) {
    context = context || document
    var item = context.querySelector(selector)
    if (item && this.app.debug) {
      this.log('found element matching "' + selector + '"')
    } else if (!item && !dontYell) {
      this.warn('found no element for selector "' + selector + '"')
    }
    return item
  }

  findFirst (selector, context, dontYell) {
    return this.findAll(selector, context, dontYell)[0]
  }

  findAll (selector, context, dontYell) {
    if (!selector || !selector.length || selector.length === 1) {
      this.error('incorrect selector : ', selector)
    }
    context = context || document
    var items = Array.prototype.slice.call(context.querySelectorAll(selector))
    if (items.length && this.app.debug) {
      this.log('found', items.length, 'elements matching "' + selector + '"')
    } else if (!items.length && !dontYell) {
      this.warn('found no elements for selector "' + selector + '"')
    }
    return items
  }
}

window.Shuutils = Shuutils
