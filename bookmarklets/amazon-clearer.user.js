// ==UserScript==
// @name         Amazon - Cleaner
// @namespace    https://github.com/Shuunen
// @version      1.0.0
// @description  Un-clutter Amazon website
// @author       Romain Racamier-Lafon
// @match        https://www.amazon.fr/*
// @require      https://raw.githubusercontent.com/Shuunen/snippets/master/bookmarklets/utils.js
// @grant        none
// ==/UserScript==

(function () {
  /* global Shuutils */
  'use strict'

  var app = {
    id: 'amz-clr',
    debug: false
  }

  var selectors = {
    productLine: '.s-item-container'
  }

  var uselessSelectors = {
    oldPrice: '.a-text-strike',
    badges: '.a-badge-label',
    ads: '.nav-swmslot'
  }

  var utils = new Shuutils(app)

  function deleteUseless () {
    Object.keys(uselessSelectors).forEach(key => {
      utils.findAll(uselessSelectors[key]).forEach(node => {
        // node.style = 'background-color: red !important;color: white !important;'
        node.remove()
      })
    })
  }

  function cosmeticChanges () {
    utils.findAll(selectors.productLine).forEach(node => (node.classList = []))
  }

  function process () {
    utils.log('processing')
    deleteUseless()
    cosmeticChanges()
  }

  process()

  var processDebounced = utils.debounce(process, 500)
  document.addEventListener('scroll', processDebounced)
})()
