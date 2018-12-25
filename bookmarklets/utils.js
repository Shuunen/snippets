/* eslint-disable-next-line no-unused-vars */
class Shuutils {
  constructor (app) {
    app = app || {
      id: 'shu-app',
      debug: true
    }
    this.app = app
    this.accentsIn = 'ÀÁÂÃÄÅĄàáâãäåąßÒÓÔÕÕÖØÓòóôõöøóÈÉÊËĘèéêëęðÇĆçćÐÌÍÎÏìíîïÙÚÛÜùúûüÑŃñńŠŚšśŸÿýŽŻŹžżź'
    this.accentsOut = 'AAAAAAAaaaaaaaBOOOOOOOOoooooooEEEEEeeeeeeCCccDIIIIiiiiUUUUuuuuNNnnSSssYyyZZZzzz'
  }

  log (...stuff) {
    if (!this.app.debug) {
      return
    }
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

  readableString (str) {
    return str.split('').map(letter => {
      var i = this.accentsIn.indexOf(letter)
      return i !== -1 ? this.accentsOut[i] : letter
    }).join('').replace(/(\W|-)/gi, ' ').replace(/\s+/, ' ')
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
