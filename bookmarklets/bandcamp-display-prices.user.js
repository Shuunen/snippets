// ==UserScript==
// @name         Bandcamp - Display Prices on Wishlist
// @namespace    https://github.com/Shuunen
// @version      1.0.2
// @description  Simply display a price tag on each item in the wishlist
// @author       Romain Racamier-Lafon
// @match        https://bandcamp.com/*/wishlist
// @require      https://raw.githubusercontent.com/Shuunen/snippets/master/bookmarklets/utils.js
// @grant        none
// ==/UserScript==

(function () {
  /* global Shuutils */
  'use strict'

  var app = {
    id: 'bcp-dp',
    debug: false
  }

  var cls = {
    price: app.id + '-price',
    handled: app.id + '-handled'
  }

  var selectors = {
    product: 'li[data-trackid]:not(.' + cls.handled + ')'
  }

  var utils = new Shuutils(app)

  function cleanPrevious () {
    utils.findAll('[class^="' + cls.price + '"]', document, true).forEach(function (node) {
      return node.remove()
    })
  }

  function displayPrice (product, price) {
    var tag = document.createElement('div')
    tag.innerHTML = price.value + ' <small>' + price.currency + '</small>'
    tag.style = 'position: absolute; top: 0; right: 0; background-color: green; color: white;'
    tag.classList.add(cls.price, 'col-edit-box')
    product.appendChild(tag)
    if (price.value > 2) {
      product.style.filter = 'grayscale(1) opacity(.5)'
    }
    product.classList.add(cls.handled)
  }

  function displayPrices () {
    utils.findAll(selectors.product, document, true).forEach(function (product) {
      var trackid = parseInt(product.getAttribute('data-trackid'))
      if (trackid) {
        utils.log('adding price for', trackid)
        if (!app.tracks.hasOwnProperty(trackid)) {
          throw new Error('failed at gettting track price')
        }
        var price = app.tracks[trackid]
        displayPrice(product, price)
      }
    })
  }

  function setTracksFromList (list) {
    if (!app.tracks) {
      app.tracks = {}
    }
    var added = 0
    list.map(function (track) {
      var trackid = track.track_id
      if (!app.tracks.hasOwnProperty(trackid)) {
        app.tracks[trackid] = {
          value: Math.round(track.price),
          currency: track.currency
        }
        added++
      }
    })
    utils.log('added', added, 'tracks to local db :D')
  }

  function getDataFromApi () {
    window.fetch('https://bandcamp.com/api/fancollection/1/wishlist_items', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fan_id: app.userid,
        older_than_token: app.token
      })
    }).then(function (json) {
      return json.json()
    }).then(function (data) {
      app.token = data.last_token
      setTracksFromList(data.track_list)
      if (data.more_available) {
        getDataFromApi()
      }
    })
  }

  function getDataFromPage () {
    var dataEl = utils.findOne('#pagedata')
    var data = JSON.parse(dataEl.getAttribute('data-blob'))
    setTracksFromList(data.track_list)
    app.token = data.wishlist_data.last_token
    app.userid = data.fan_data.fan_id
  }

  function process () {
    displayPrices()
  }

  function init () {
    utils.log('init !')
    cleanPrevious()
    getDataFromPage()
    getDataFromApi()
    process()
  }

  init()

  var processDebounced = utils.debounce(process, 500)
  document.addEventListener('scroll', processDebounced)
})()
