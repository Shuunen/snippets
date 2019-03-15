// ==UserScript==
// @name         Amazon - Hide products by keyword
// @namespace    https://github.com/Shuunen
// @version      1.1.2
// @description  Easily hide products from your searches by specifying a block list
// @author       Romain Racamier-Lafon
// @match        https://www.amazon.fr/s*
// @require      https://raw.githubusercontent.com/Shuunen/snippets/master/bookmarklets/utils.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/autosize.js/4.0.2/autosize.min.js
// @grant        none
// ==/UserScript==

(function () {
  /* global Shuutils, autosize */
  'use strict'

  var app = {
    id: 'amz-xd',
    debug: false,
    filter: '',
    excluders: [],
    suggestions: {},
    minLengthSuggestion: 2,
    maxSuggestions: 7
  }

  app.excluders = (window.localStorage[app.id + '.filter'] || 'my-keyword, other-keyword').split(',')

  var cls = {
    base: app.id,
    title: app.id + '-title',
    handled: app.id + '-handled',
    first: app.id + '-first',
    plus: app.id + '-plus',
    suggestion: app.id + '-suggestion',
    suggestions: app.id + '-suggestions',
    filter: app.id + '-filter'
  }

  var selectors = {
    container: ['#search > .sg-row > div:first-child > .sg-col-inner', '#leftNavContainer'].join(', '),
    productTitle: 'a.s-access-detail-page > h2.s-access-title'
  }

  var utils = new Shuutils(app)

  function clearSuggestions () {
    utils.log('cleared suggestions !')
    app.suggestions = {}
    utils.findOne('.' + cls.suggestions).innerHTML = ''
  }

  function showSuggestions () {
    Object.keys(app.suggestions).forEach(word => {
      if (app.excluders.indexOf(word) !== -1) {
        // if already excluded, no need to suggest it again
        delete app.suggestions[word]
      }
    })
    // add .map(key => `${key} (${app.suggestions[key]})`)
    // to see ["steellwingsf (23)", "silicone (5)", "decoration (4)", "support (4)", "cheveux (3)",
    // instead of ["steellwingsf", "silicone", "decoration", "support", "cheveux",
    var suggestions = Object.keys(app.suggestions).sort((a, b) => (app.suggestions[b] - app.suggestions[a]))
    // limit displayed suggestions
    suggestions = suggestions.splice(0, app.maxSuggestions)
    // build html
    utils.log('showing suggestions', suggestions)
    var html = suggestions.map(suggestion => `<div class="${cls.suggestion}" title="apparaît ${app.suggestions[suggestion]} fois"><span class="${cls.plus}">+</span>${suggestion}</div>`).join('')
    utils.findOne('.' + cls.suggestions).innerHTML = html
  }

  var showSuggestionsDebounced = utils.debounce(showSuggestions, 500)

  function onSuggestionClick (event) {
    var suggestion = event.target.textContent.replace(/\W/gi, '') // regex avoid caching the plus sign
    utils.log('user wants to add suggestion', suggestion)
    app.excluders.push(suggestion)
    onExcludersUpdate()
  }

  function addTitleToSuggestions (title) {
    title.split(' ').filter(word => word.length > app.minLengthSuggestion).forEach(word => {
      // add the word if needed & count the occurence
      if (!app.suggestions.hasOwnProperty(word)) {
        app.suggestions[word] = 0
      }
      app.suggestions[word]++
    })
    showSuggestionsDebounced()
  }

  function checkProduct (titleStr, titleEl) {
    var found = false
    var remainings = app.excluders.length
    while (!found && remainings) {
      found = titleStr.indexOf(app.excluders[remainings - 1]) >= 0
      remainings--
    }
    if (found) {
      utils.log('"' + titleStr.substr(0, 40) + '..."', 'should be excluded')
    } else {
      addTitleToSuggestions(titleStr)
    }
    var product = titleEl.parentElement.parentElement.parentElement.parentElement.parentElement
    product.style.display = found ? 'none' : 'inline-block'
  }

  function checkProducts () {
    utils.log('checking displayed products...')
    clearSuggestions()
    var products = utils.findAll(selectors.productTitle)
    products.forEach(function (titleEl) {
      titleEl.textContent = utils.readableString(titleEl.textContent)
      var titleStr = titleEl.textContent.toLowerCase()
      checkProduct(titleStr, titleEl)
    })
  }

  function onExcludersUpdate (fromFilter) {
    app.excluders = app.excluders
      .map(entry => entry.trim().toLowerCase())
      .filter(entry => entry.length)
    if (!app.excluders.length) {
      return
    }
    utils.log('new excluders :', app.excluders)
    app.filter = app.excluders.join(', ')
    window.localStorage[app.id + '.filter'] = app.filter
    if (!fromFilter) {
      var filter = utils.findOne('.' + cls.filter)
      filter.value = app.filter
      autosize.update(filter)
    }
    checkProducts()
  }

  function onFilterChange (event) {
    utils.log('filter changed')
    app.excluders = event.target.value.split(',')
    onExcludersUpdate(true)
  }

  var onFilterChangeDebounced = utils.debounce(onFilterChange, 500)

  function insertFilter () {
    var container = utils.findFirst(selectors.container)
    var html = `
    <style>
    .${cls.suggestions} {
      display: flex;
      flex-direction: column;
    }
    .${cls.suggestion} {
      display: flex;
      align-items: baseline;
      margin-top: 2px;
      padding: 2px 4px;
      color: lightcoral;
      transition: background-color .3s, color .3s;
    }
    .${cls.suggestion}:hover {
      color: white;
      background-color: darkred;
      cursor: pointer;
    }
    .${cls.plus} {
      border: 1px solid lightgray;
      border-radius: 50%;
      width: 14px;
      height: 14px;
      line-height: 14px;
      text-align: center;
      margin-right: 6px;
    }
    .${cls.suggestion}:hover .${cls.plus} {
      border: 1px solid currentColor;
    }
    </style>
    <h3 class="${cls.title} a-size-medium a-spacing-base a-spacing-top-small a-color-tertiary a-text-normal">Exclure les résultats contenant :</h3>
    <textarea class="${cls.filter}">${app.filter}</textarea>
    <div class="${cls.suggestions}"></div>
    `
    container.innerHTML = html += container.innerHTML
    var filter = utils.findOne('.' + cls.filter)
    autosize(filter)
    filter.addEventListener('keyup', onFilterChangeDebounced)
    var suggestions = utils.findOne('.' + cls.suggestions)
    suggestions.addEventListener('click', onSuggestionClick)
  }

  function cleanPrevious () {
    utils.findAll('[class^="' + cls.base + '"]', document, true).forEach(node => node.remove())
  }

  function onNewPage () {
    utils.log('new page detected')
    onExcludersUpdate()
  }

  function detectNewPage () {
    var firstProduct = utils.findFirst(selectors.productTitle)
    if (firstProduct.classList.contains(cls.first)) {
      utils.log('same page')
    } else {
      firstProduct.classList.add(cls.first)
      onNewPage()
    }
  }

  function process () {
    detectNewPage()
  }

  function init () {
    utils.log('init !')
    cleanPrevious()
    insertFilter()
    onExcludersUpdate()
  }

  init()

  var processDebounced = utils.debounce(process, 500)
  document.addEventListener('scroll', processDebounced)
})()
