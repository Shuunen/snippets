// ==UserScript==
// @name         Amazon - Cleaner
// @namespace    https://github.com/Shuunen
// @version      1.0.3
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
    oldPrice: '.a-text-strike, #priceblock_saleprice_lbl, #vatMessage',
    badges: '.a-badge-label, #acBadge_feature_div, #zeitgeistBadge_feature_div, .dotdBadge, .a-row.DEAL_OF_THE_DAY',
    ads: '.nav-swmslot, .GB-M-COMMON.GB-SHOVELER, #pdagSparkleAdFeedback, #detail-ilm_div, #quickPromoBucketContent, #sp_detail, #hqpWrapper, #productAlert_feature_div, #navSwmHoliday, #quickPromoDivId',
    recommandations: '#raw-sitewide-rhf, #rhf',
    instantBuy: '#buyNow_feature_div, #oneClick_feature_div',
    dashButtons: '#digitalDashHighProminence_feature_div',
    sharing: '#tellAFriendBox_feature_div',
    buyPack: '#sims-fbt',
    comparison: '#HLCXComparisonWidget_feature_div'
  }

  var utils = new Shuutils(app)

  function deleteUseless () {
    Object.keys(uselessSelectors).forEach(key => {
      utils.findAll(uselessSelectors[key], document, true).forEach(node => {
        // node.style = 'background-color: red !important;color: white !important;'
        node.remove()
      })
    })
  }

  function cosmeticChanges () {
    utils.findAll(selectors.productLine, document, true).forEach(node => (node.classList = []))
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
