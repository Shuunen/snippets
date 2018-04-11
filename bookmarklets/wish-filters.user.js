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

  var minPrice = 0;
  var maxPrice = 1000;
  var minStars = 1;
  var hideFree = false;
  var hideNsfw = true;

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

  function fetchData(id, productEl, originalPicture) {
    console.log('will get data for', id);
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
        // console.log(id, ': found a rating of', ratings, 'over', count, 'reviews :)');
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
        // console.log(id, ': shipping fees', shippingFees, '€');
        const priceMatches = productEl.find('.feed-actual-price').text().match(/\d+/);
        const price = parseInt(priceMatches && priceMatches.length ? priceMatches[0] : 0);
        // console.log(id, ': base price', price, '€');
        const totalPrice = shippingFees + price + ' €';
        productEl.find('.feed-actual-price').html(totalPrice);
        const nsfwMatches = html.match(/sex|lingerie|crotch|masturbat|vibrator|bdsm|bondage|nipple/gi);
        if (nsfwMatches && nsfwMatches.length) {
          productEl.addClass('abw-nsfw');
        }
        showHideProduct(productEl, originalPicture);
      })
      .catch((error) => {
        console.error('did not managed to found ratings for product "', id, '"', error);
      });
  }

  var loadedUrl = '//main.cdn.wish.com/fd9acde14ab5/img/ajax_loader_16.gif?v=13';

  function getData(element) {
    const productEl = $(element.tagName ? element : element.currentTarget);
    if (productEl.hasClass('abw-with-data')) {
      // console.log('product has already data');
      return;
    }
    productEl.addClass('abw-with-data');
    const image = productEl.find('a.display-pic');
    if (!image || !image[0]) {
      console.error('did not found image on product', productEl);
      return;
    }
    var href = image.attr('href');
    if (!href) {
      console.error('did not found href on product', productEl);
      return;
    }
    const id = href.split('/').reverse()[0];
    const originalPicture = image[0].style.backgroundImage;
    image[0].style.backgroundImage = 'url(' + loadedUrl + ')';
    image[0].style.backgroundSize = '10%';
    fetchData(id, productEl, originalPicture);
  }

  function getNextData() {
    const amount = 10;
    console.log('getting next', amount, 'items data');
    $('.feed-product-item:visible:not(.abw-with-data):lt(' + amount + ')').each((index, element) => {
      setTimeout(() => getData(element), index * 300);
    });
  }

  function showHideProduct(element, originalPicture) {
    const productEl = $(element);
    const priceEl = productEl.find('.feed-actual-price');
    var price = priceEl.text().replace(/\D/g, '');
    var nbStars = productEl.find('img.abw-star').size();
    var priceOk = price <= maxPrice;
    if (minPrice && minPrice > 0) {
      priceOk = priceOk && price >= minPrice;
    }
    if (priceOk && hideFree && priceEl[0].textContent.includes('Free')) {
      priceOk = false;
    }
    if (priceOk && minStars && minStars > 0 && productEl.hasClass('abw-with-data')) {
      priceOk = nbStars >= minStars;
    }
    if (priceOk && hideNsfw && productEl.hasClass('abw-nsfw')) {
      priceOk = false;
    }
    if (priceOk) {
      productEl.show('fast');
      if (originalPicture) {
        const image = productEl.find('a.display-pic');
        if (!image || !image[0]) {
          console.error('did not found image on product', productEl);
          return;
        }
        image[0].style.backgroundImage = originalPicture;
        image[0].style.backgroundSize = '100%';
      }
      if (!productEl.hasClass('abw-on-hover')) {
        productEl.addClass('abw-on-hover');
        productEl.hover(getData);
      }
    } else {
      productEl.hide('fast');
    }
  }

  function showHideProducts(event) {
    console.log('wish price filter : showHideProducts');
    setTimeout(hideUseless, 100);
    setTimeout(getNextData, 100);
    $('.feed-product-item').each((index, element) => {
      showHideProduct(element);
    });
  }

  // prepare a debounced function
  var showHideProductsDebounced = debounce(showHideProducts, 1000);

  // activate when window is scrolled
  window.onscroll = showHideProductsDebounced;

  function hideUseless() {
    // hide already rated products in order hsitory
    $('.edit-rating-button').parents('.transaction-expanded-row-item').hide();
    // hide products that can't be rated
    $('.late-box').parents('.transaction-expanded-row-item').hide();
    // delete useless marketing stuff
    $('.discount-banner, .urgency-inventory, .feed-crossed-price, .product-boost-rect, .header-hello, .badge-details, .faster-shipping-wrapper').remove();
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

  // get elements
  var hideFreeCheckbox = $('#wtc_hide_free');
  var hideNsfwCheckbox = $('#wtc_hide_nsfw');
  var minStarsInput = $('#wtc_min_stars');
  var minPriceInput = $('#wtc_min_price');
  var maxPriceInput = $('#wtc_max_price');

  // restore previous choices
  hideFreeCheckbox.attr('checked', localStorage.abwHideFree === 'true'); // only if at true
  hideNsfwCheckbox.attr('checked', localStorage.abwHideNsfw !== 'false'); // default true
  minStarsInput.val(parseInt(localStorage.abwMinStars) || 1);

  // start filtering by default
  setTimeout(() => {
    showHideProductsDebounced();
    getNextData();
  }, 1000);

  // when input value change
  hideFreeCheckbox.change((event) => {
    hideFree = event.currentTarget.checked;
    localStorage.abwHideFree = hideFree;
    // console.log('hideFree is now', hideFree);
    showHideProductsDebounced();
  });
  hideNsfwCheckbox.change((event) => {
    hideNsfw = event.currentTarget.checked;
    localStorage.abwHideNsfw = hideNsfw;
    // console.log('hideNsfw is now', hideNsfw);
    showHideProductsDebounced();
  });
  minPriceInput.change((event) => {
    minPrice = parseInt(event.currentTarget.value) || 0;
    // console.log('minPrice is now', minPrice);
    showHideProductsDebounced();
  });
  maxPriceInput.change((event) => {
    maxPrice = parseInt(event.currentTarget.value) || 1000;
    // console.log('maxPrice is now', maxPrice);
    showHideProductsDebounced();
  });
  minStarsInput.change((event) => {
    minStars = parseInt(event.currentTarget.value);
    localStorage.abwMinStars = minStars;
    // console.log('minStars is now', minStars);
    showHideProductsDebounced();
  });
});
