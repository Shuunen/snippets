/**
 * A small tool to keep an eye on a webpage
 */

const url = 'https://www.facebook.com/MoovTime/'
const selector = 'div._4-u8 > div._2pi9._2pi2 > div._ikh > div._4bl9'
const everySeconds = 20
const osmosis = require('osmosis')
const notifier = require('node-notifier')

/* Custom */
let lastNb = 0

function check () {
  osmosis
    .get(url)
    .set({ info: selector })
    .data(function onData (data) {
      /* Custom */
      const nb = data.info.split(' ')[0]
      if (lastNb !== nb) {
        notifier.notify({
          title: 'New like',
          message: 'Total : ' + nb + ' likes',
        })
        console.log('Total : ' + nb + ' likes')
      }
      lastNb = nb
    })
    .error(console.log)
    // .log(console.log)
    // .debug(console.log)
}

function init () {
  setInterval(check, everySeconds * 1000)
}

init()
