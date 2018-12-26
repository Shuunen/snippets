// ==UserScript==
// @name         Amazon - Hide products by keyword
// @namespace    https://github.com/Shuunen
// @version      1.0.4
// @description  Easily hide products from your searches by specifying a block list
// @author       Romain Racamier-Lafon
// @match        https://www.amazon.fr/s*
// @require      https://raw.githubusercontent.com/Shuunen/snippets/master/bookmarklets/utils.js
// @grant        none
// ==/UserScript==

(function () {
  /* global Shuutils, Event */
  'use strict'

  var app = {
    id: 'amz-xd',
    debug: false
  }

  app.filter = window.localStorage[app.id + '.filter'] || 'my-keyword'

  var cls = {
    base: app.id,
    title: app.id + '-title',
    handled: app.id + '-handled',
    filter: app.id + '-filter'
  }

  var selectors = {
    productTitle: 'a.s-access-detail-page > h2.s-access-title'
  }

  var utils = new Shuutils(app)

  function hideMatchingProducts () {
    utils.log('hidding...')
    var excluders = app.filter.split(', ')
    utils.findAll(selectors.productTitle).forEach(function (title) {
      title.textContent = utils.readableString(title.textContent)
      var titleStr = title.textContent.toLowerCase()
      var found = false
      var remainings = excluders.length
      while (!found && remainings) {
        found = titleStr.indexOf(excluders[remainings - 1]) >= 0
        remainings--
      }
      if (found) {
        utils.log('"' + titleStr.substr(0, 40) + '..."', 'should be excluded')
      }
      var product = title.parentElement.parentElement.parentElement.parentElement.parentElement
      product.style.display = found ? 'none' : 'inline-block'
    })
  }

  function onFilterChange (event) {
    var excluders = event.target.value.split(',')
      .map(entry => entry.trim().toLowerCase())
      .filter(entry => entry.length)
    if (!excluders.length) {
      return
    }
    utils.log('excluders :', excluders)
    app.filter = excluders.join(', ')
    window.localStorage[app.id + '.filter'] = app.filter
    hideMatchingProducts()
  }

  function insertFilter () {
    var container = utils.findOne('#leftNavContainer')
    var html = '<h3 class="' + cls.title + ' a-size-medium a-spacing-base a-spacing-top-small a-color-tertiary a-text-normal">'
    html += 'Exclure les résultats contenant :</h3>'
    html += '<textarea class="' + cls.filter + '">' + app.filter + '</textarea>'
    container.innerHTML = html += container.innerHTML
    var filter = utils.findOne('.' + cls.filter)
    var onFilterChangeDebounced = utils.debounce(onFilterChange, 500)
    filter.addEventListener('keyup', onFilterChangeDebounced)
    filter.dispatchEvent(new Event('keyup'))
  }

  function cleanPrevious () {
    utils.findAll('[class^="' + cls.base + '"]', document, true).forEach(node => node.remove())
  }

  function process () {
    hideMatchingProducts()
  }

  function init () {
    utils.log('init !')
    cleanPrevious()
    insertFilter()
  }

  init()

  var processDebounced = utils.debounce(process, 500)
  document.addEventListener('scroll', processDebounced)
})()
