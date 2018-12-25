// ==UserScript==
// @name         Amazon - Price per weight
// @namespace    https://github.com/Shuunen
// @version      1.0.1
// @description  Display price per weight & sort ascending
// @author       Romain Racamier-Lafon
// @match        https://*.amazon.fr/*
// @require      https://raw.githubusercontent.com/Shuunen/snippets/master/bookmarklets/utils.js
// @grant        none
// ==/UserScript==

(function () {
  /* global Shuutils */
  'use strict'

  var app = {
    id: 'amz-kg',
    processOne: false,
    processOnce: false,
    hideStuff: false,
    showDebug: false,
    injectRealPrice: true,
    sortProducts: true
  }

  app.debug = app.processOne

  var cls = {
    handled: app.id + '-handled',
    avoided: app.id + '-avoided',
    debug: app.id + '-debug',
    pricePer: app.id + '-price-per'
  }

  var selectors = {
    list: 'ul.s-result-list',
    item: '.s-result-item:not(.aok-hidden):not(.' + cls.handled + '):not(.' + cls.avoided + ')',
    itemTitle: '.s-access-title',
    otherPrice: '.a-size-base.a-color-price.s-price.a-text-bold',
    pricePer: '.a-size-base.a-color-price:not(.s-price):not(.a-text-bold),' + '.' + cls.pricePer,
    debugContainer: '.a-fixed-left-grid-col.a-col-right .a-row:not(.a-spacing-small) .a-column.a-span7',
    debug: '.' + cls.debug,
    pantry: 'img.sprPantry',
    stuffToHide: '.s-result-item .a-column.a-span7 .a-row:not(.' + cls.debug + ')'
  }

  selectors.price = selectors.debugContainer + ' div:first-child .a-link-normal'

  var regex = {
    price: /EUR (\d+,\d\d)/i,
    weight: /(\d+)\s?(g|-)/i,
    bulk: /Lot de (\d+)/i,
    pricePer: /EUR (\d+,\d\d)\/(\w+)(\s\w+)?/i
  }

  var templates = {
    debug: '<div class="a-row ' + cls.debug + '"><div class="a-column a-span12">\n    <p class="a-spacing-micro">Price  : {{price}} \u20AC</p>\n    <p class="a-spacing-micro">Weight : {{weight}} {{unit}}</p>    \n    <p class="a-spacing-small">Bulk   : {{bulk}}</p>\n    <p class="a-spacing-micro a-size-base a-color-price s-price a-text-bold">P/Kg  : {{pricePerKilo}} \u20AC/kg</p>\n    </div></div>',
    price: '<span class="s-price a-text-bold">EUR {{price}}</span>',
    pricePerKilo: '<span class="a-color-price s-price a-text-bold ' + cls.pricePer + '">EUR {{pricePerKilo}}/kg</span>'
  }

  var utils = new Shuutils(app)

  var products = []

  function shadeBadProducts () {
    utils.findAll(selectors.pantry).forEach(function (el) {
      var item =
        el.parentElement.parentElement.parentElement.parentElement.parentElement
          .parentElement.parentElement.parentElement
      item.style.filter = 'grayscale(100%)'
      item.style.opacity = 0.5
      item.style.order = 1000
      item.classList.add(cls.avoided)
      utils.log('shaded item', item)
    })
  }

  function priceStrToFloat (str) {
    var price = str.replace(',', '.')
    price = parseFloat(price)
    return price
  }

  function priceFloatToStr (num) {
    var price = num.toFixed(1)
    price = price.replace('.', ',') + '0'
    return price
  }

  function getPrice (text) {
    var matches = text.match(regex.price)
    utils.log('found price matches :', matches)
    var price = matches && matches.length === 2 ? matches[1] : '0'
    price = priceStrToFloat(price)
    utils.log('found price', price)
    return price
  }

  function getWeightAndUnit (text) {
    var matches = text.match(regex.weight)
    // utils.log('found weight matches & unit :', matches)
    var data = {
      weight: 0,
      unit: ''
    }
    if (matches && matches.length === 3) {
      data.weight = matches[1]
      data.unit = matches[2]
    }
    if (data.unit === '-') {
      data.unit = 'g'
    }
    // utils.log('found weight & unit :', data)
    return data
  }

  function getBulk (text) {
    var matches = text.match(regex.bulk)
    // utils.log('found bulk matches :', matches)
    var bulk = matches && matches.length === 2 ? matches[1] : '1'
    bulk = parseInt(bulk)
    // utils.log('found bulk', bulk)
    return bulk
  }

  function getProductDataViaPricePer (text) {
    var matches = text.match(regex.pricePer)
    // utils.log('found pricePer matches :', matches)
    var data = {
      price: 0,
      weight: 0,
      unit: '',
      bulk: 1
    }
    if (matches && matches.length === 4) {
      data.price = priceStrToFloat(matches[1])
      if (matches[3]) {
        data.weight = matches[2]
        data.unit = matches[3].trim()
      } else {
        data.weight = 1
        data.unit = matches[2]
      }
    }
    utils.log('found pricePer :', data)
    return data
  }

  function getTitle (text) {
    return text
      .split(' ')
      .slice(0, 5)
      .join(' ')
  }

  function getProductData (item, data) {
    var text = item.textContent
    var weightAndUnit = getWeightAndUnit(text)
    data = data || {}
    data.price = getPrice(text)
    data.weight = weightAndUnit.weight
    data.unit = weightAndUnit.unit
    data.bulk = getBulk(text)
    data.title = getTitle(text)
    return data
  }

  function fill (template, data) {
    var tpl = template + ''
    Object.keys(data).forEach(function (key) {
      var str = '{{' + key + '}}'
      var val = data[key]
      if (key.indexOf('price') > -1 && val > 0) {
        val = priceFloatToStr(val)
      }
      // utils.log('looking for', str)
      tpl = tpl.replace(new RegExp(str, 'gi'), val)
    })
    return tpl
  }

  function showDebugData (item, data) {
    var debug = utils.findOne(selectors.debug, item, true)
    if (!app.showDebug) {
      if (debug) {
        // if existing debug zone found
        debug.style.display = 'none'
      }
      return
    }
    var html = fill(templates.debug, data)
    // utils.log('debug html', html)
    if (debug) {
      // if existing debug zone found
      debug.style.display = 'inherit'
      debug.outerHTML = html
      return
    }
    debug = document.createElement('div')
    debug.innerHTML = html
    var container = utils.findOne(selectors.debugContainer, item)
    if (container) {
      container.append(debug)
    } else {
      utils.error(data.title, ': failed at finding debug container', item)
    }
  }

  function getPricePerKilo (data) {
    data.pricePerKilo = 0
    if (data.weight === 0) {
      return data
    }
    var w = data.weight * data.bulk
    if (data.unit === 'g') {
      data.pricePerKilo = (1000 / w) * data.price
    } else if (data.unit === 'kg') {
      data.pricePerKilo = w * data.price
    } else {
      utils.error(data.title, ': unit not handled :', data.unit)
    }
    if (data.pricePerKilo >= 0) {
      data.pricePerKilo = priceStrToFloat(data.pricePerKilo.toFixed(1))
    }
    utils.log('found pricePerKilo :', data)
    return data
  }

  function injectRealPrice (item, data) {
    if (!app.injectRealPrice) {
      return
    }
    utils.log('injecting real price :', data)
    var price = utils.findOne(selectors.price, item)
    var text = ''
    if (data.pricePerKilo > 0) {
      text = fill(templates.pricePerKilo, data)
    } else if (data.price > 0) {
      text = fill(templates.price, data)
    }
    var pricePer = utils.findOne(selectors.pricePer, item, true)
    if (pricePer) {
      pricePer.style.display = 'none'
    }
    price.innerHTML = text
    var otherPrice = utils.findOne(selectors.otherPrice, item, true)
    if (otherPrice) {
      otherPrice.classList.remove('a-color-price', 'a-text-bold')
    }
  }

  function avoidProduct (item) {
    var nbAttr = item.getAttributeNames().length
    if (nbAttr === 5) {
      utils.warn('detected ad product', item)
      return true
    }
    // all good
    return false
  }

  function augmentProducts () {
    utils.findAll(selectors.item).forEach(function (item) {
      return augmentProduct(item)
    })
  }

  function augmentProduct (item) {
    if (avoidProduct(item)) {
      return
    }
    var pricePer = utils.findOne(selectors.pricePer, item, true)
    var data = {}
    if (pricePer) {
      pricePer.style.display = 'inherit'
      data = getProductDataViaPricePer(pricePer.textContent)
    } else {
      data = getProductData(item)
    }
    data = getPricePerKilo(data)
    if (pricePer) {
      data = getProductData(item, data)
    }
    showDebugData(item, data)
    injectRealPrice(item, data)
    if (app.processOnce) {
      item.classList.add(cls.handled)
    }
    data.el = item
    products.push(data)
  }

  function hideStuff () {
    utils.findAll(selectors.stuffToHide).forEach(function (el) {
      return (el.style.display = app.hideStuff ? 'none' : 'inherit')
    })
  }

  function sortProducts () {
    var list = utils.findOne(selectors.list)
    if (!list) {
      return utils.error('cannot sort without list')
    }
    list.style.display = 'flex'
    list.style.flexDirection = 'column'
    // trick to have products without pricePerKilo at bottom
    products.map(function (p) {
      return (p.pricePerKilo = p.pricePerKilo || p.price + 1000)
    })
    // sort by pricePerKilo
    products = products.sort(function (a, b) {
      return a.pricePerKilo - b.pricePerKilo
    })
    products.forEach(function (p, i) {
      return (p.el.style.order = i)
    })
  }

  function init () {
    utils.log('is starting...')
    shadeBadProducts()
    if (app.processOne) {
      augmentProduct(utils.findFirst(selectors.item))
    } else {
      augmentProducts()
      sortProducts()
    }
    hideStuff()
    utils.log('processed', products.length, 'products')
  }

  init()
})()
