// ==UserScript==
// @name         Google Photos - Easy Delete
// @namespace    https://github.com/Shuunen
// @version      1.0.1
// @description  Delete a photo by pressing ! (bang)
// @author       Romain Racamier-Lafon
// @match        https://photos.google.com/photo/*
// @require      https://raw.githubusercontent.com/Shuunen/snippets/master/bookmarklets/utils.js
// @grant        none
// ==/UserScript==

(function () {
  /* global Shuutils */
  'use strict'

  var app = {
    id: 'gp-ed'
  }

  var selectors = {
    trash: '[data-delete-origin] button',
    confirmBtn: 'button[autofocus]'
  }

  var utils = new Shuutils(app)

  function deleteCurrentPhoto () {
    utils.log('deleting currently displayed photo...')
    utils.findOne(selectors.trash).click()
    setTimeout(function () {
      utils.findOne(selectors.confirmBtn).click()
    }, 200)
  }

  function onKeyPress (event) {
    if (event.key === '!') {
      deleteCurrentPhoto()
    }
  }

  function init () {
    utils.log('init !')
    document.body.addEventListener('keypress', onKeyPress)
  }

  init()
})()
