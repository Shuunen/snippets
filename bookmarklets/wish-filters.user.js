// ==UserScript==
// @name         Wish.com - Filters & more
// @namespace    http://tampermonkey.net/
// @version      3.3
// @description  Filtering by min/max price, allow hidding free/nsfw products, see reviews
// @author       Shuunen
// @match        https://*.wish.com/*
// @grant        none
// ==/UserScript==

$(document).ready(function() {
  console.log('wish price filter : init');

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  function debounce(func, wait, immediate) {
    var timeout;
    return function() {
      var context = this;
      var args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(context, args);
    };
  }

  function fetchData(id, productEl, delay, noRecursion) {
    console.log('will get data for', id);
    return new Promise((resolve) => {
      setTimeout(() => {
        const url = 'https://www.wish.com/c/' + id;
        console.log('getting data for', id);
        fetch(url)
          .then((r) => r.text())
          .then((html) => {
            const dataMatches = html.match(/"aggregateRating" : ([\w\W\n]+"\n}),/gi);
            const dataStr = dataMatches[0];
            const data = JSON.parse('{' + dataStr.replace('},', '}').replace(/\n/g, '') + '}');
            const ratings = Math.round(data.aggregateRating.ratingValue * 100) / 100;
            const count = Math.round(data.aggregateRating.ratingCount);
            console.log(id, ': found a rating of', ratings, 'over', count, 'reviews :)');
            let roundedRatings = Math.round(ratings);
            let ratingsStr = '';
            while (roundedRatings--) {
              ratingsStr += '<img class="abw-star" src="https://cdn0.iconfinder.com/data/icons/small-n-flat/24/678064-star-20.png" />';
            }
            if (count > 0) {
              ratingsStr += '<hr> over ' + count + ' reviews';
            } else {
              ratingsStr = 'no reviews !';
            }
            productEl.find('.feed-details-row2').css('display', 'flex').css('align-items', 'center').html(ratingsStr);
            const shippingMatches = html.match(/"localized_shipping":\s{"localized_value":\s(\d)/i);
            const shippingFees = parseInt(shippingMatches[1]);
            console.log(id, ': shipping fees', shippingFees, '€');
            const priceMatches = productEl.find('.feed-actual-price').text().match(/\d+/);
            const price = parseInt(priceMatches && priceMatches.length ? priceMatches[0] : 0);
            console.log(id, ': base price', price, '€');
            const totalPrice = shippingFees + price + ' €';
            productEl.find('.feed-actual-price').html(totalPrice);
            const nsfwMatches = html.match(/sex|lingerie|crotch|masturbat|vibrator|bdsm|bondage|nipple/gi);
            if (nsfwMatches && nsfwMatches.length) {
              productEl.addClass('abw-nsfw');
            }
            showHideProductsDebounced(noRecursion);
            resolve({ id, ratings, count, shippingFees, price, totalPrice });
          })
          .catch((error) => {
            console.error('did not managed to found ratings for product "', id, '"', error);
          });
      }, delay);
    });
  }

  var loadedUrl = '//main.cdn.wish.com/fd9acde14ab5/img/ajax_loader_16.gif?v=13';

  function getData(element, noRecursion) {
    const productEl = $(element.tagName ? element : element.currentTarget);
    if (productEl.hasClass('abw-with-data')) {
      console.log('product has already data');
      return;
    }
    productEl.addClass('abw-with-data');
    const image = productEl.find('a.display-pic');
    var href = image.attr('href');
    if (!href) {
      console.error('did not found href on product', productEl);
      return;
    }
    const id = href.split('/').reverse()[0];
    const originalPicture = image[0].style.backgroundImage;
    image[0].style.backgroundImage = 'url(' + loadedUrl + ')';
    image[0].style.backgroundSize = '10%';
    fetchData(id, productEl, 200, noRecursion).then(() => {
      image[0].style.backgroundImage = originalPicture;
      image[0].style.backgroundSize = '100%';
    });
  }

  function getNextData() {
    const amount = 10;
    console.log('getting next', amount, 'items data');
    $('.feed-product-item:not(.abw-with-data):lt(' + amount + ')').each((index, element) => {
      setTimeout(() => getData(element, true), index * 300);
    });
  }
  // debounced version
  var getNextDataDebounced = debounce(getNextData, 2000);

  function showHideProducts(event) {
    // hide already rated products in order hsitory
    $('.edit-rating-button').parents('.transaction-expanded-row-item').hide();
    // hide products that can't be rated
    $('.late-box').parents('.transaction-expanded-row-item').hide();
    // delete useless marketing stuff
    $('.discount-banner, .urgency-inventory, .feed-crossed-price, .product-boost-rect, .header-hello, .badge-details, .faster-shipping-wrapper').remove();
    console.log('wish price filter : showHideProducts');
    if (event && event.type === 'scroll') {
      getNextData();
    }
    var minPrice = parseInt($('#wtc_min_price').val()) || 0;
    var maxPrice = parseInt($('#wtc_max_price').val()) || 1000;
    var minStars = parseInt($('#wtc_min_stars').val()) || 0;
    var hideFree = $('#wtc_hide_free').is(':checked');
    var hideNsfw = $('#wtc_hide_nsfw').is(':checked');
    localStorage.abwHideFree = hideFree;
    localStorage.abwHideNsfw = hideNsfw;
    localStorage.abwMinStars = minStars;
    // console.log('wish price filter : hide free items ?', hideFree);
    var items = $('.feed-actual-price');
    $.each(items, function() {
      var product = $(this).parent().parent().parent().parent();
      var price = $(this).text().replace(/\D/g, '');
      var nbStars = product.find('img.abw-star').size();
      var priceOk = price <= maxPrice;
      if (minPrice && minPrice > 0) {
        priceOk = priceOk && price >= minPrice;
      }
      if (priceOk && hideFree && this.textContent.includes('Free')) {
        priceOk = false;
      }
      if (minStars && minStars > 0 && product.hasClass('abw-with-data')) {
        priceOk = priceOk && nbStars >= minStars;
      }
      if (hideNsfw && product.hasClass('abw-nsfw')) {
        priceOk = false;
      }
      if (priceOk) {
        product.show('fast');
      } else {
        product.hide('fast');
      }
      // product.toggle(priceOk);
      if (priceOk && !product.hasClass('abw-on-hover')) {
        product.addClass('abw-on-hover');
        product.hover(getData);
      }
    });
  }

  // insert controllers
  if ($('#nav-search').length > 0) {
    $('#mobile-app-buttons').hide();
    $('#nav-search-input-wrapper').width(320);
    var html = '<div id="wish_tweaks_config" style="float:left;margin-top:10px;display:flex;justify-content:space-between;align-items:center;font-weight: bold;font-size: 13px;font-family: sans-serif;color: white;background-color: steelblue;padding:6px 12px;border-radius: 5px;">';
    html += 'Min / Max Price : <input id="wtc_min_price" type="text" style="width: 30px; text-align: center; margin-left: 5px;">&nbsp;/<input id="wtc_max_price" type="text" style="width: 30px; text-align: center; margin-left: 5px; margin-right: 10px;">';
    html += 'Min stars : <input id="wtc_min_stars" type="text" style="width: 20px; text-align: center; margin-left: 5px; margin-right: 10px;">&nbsp;';
    html += 'Hide free : <input id="wtc_hide_free" type="checkbox" checked style="margin: 0; height: 16px; width: 16px; margin-left: 5px;">';
    html += 'Hide nsfw : <input id="wtc_hide_nsfw" type="checkbox" checked style="margin: 0; height: 16px; width: 16px; margin-left: 5px;">';
    html += '</div>';
    $('#header-left').after(html);
  }

  // restore previous choices
  var hideFreeCheckbox = $('#wtc_hide_free');
  hideFreeCheckbox.attr('checked', localStorage.abwHideFree === 'true'); // only if at true
  var hideNsfwCheckbox = $('#wtc_hide_nsfw');
  hideNsfwCheckbox.attr('checked', localStorage.abwHideNsfw !== 'false'); // default true
  var minStars = $('#wtc_min_stars');
  minStars.val(parseInt(localStorage.abwMinStars) || 1);

  // prepare a debounced function
  var showHideProductsDebounced = debounce(showHideProducts, 1000);

  // start filtering by default
  setTimeout(() => {
    showHideProductsDebounced();
    getNextData();
  }, 1000);

  // when window is scrolled
  window.onscroll = showHideProductsDebounced;

  // when input value change
  $('#wtc_hide_free').change(showHideProductsDebounced);
  $('#wtc_min_price').keydown(showHideProductsDebounced);
  $('#wtc_max_price').keydown(showHideProductsDebounced);
  $('#wtc_min_stars').keydown(showHideProductsDebounced);
});
