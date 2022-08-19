// @ts-ignore
import notifier from 'node-notifier'
// @ts-ignore
import osmosis from 'osmosis'

const url = 'https://www.facebook.com/some-page/'
const selector = 'div._4-u8 > div._2pi9._2pi2 > div._ikh > div._4bl9'
const everySeconds = 20
let lastNb = 0

function check () {
  osmosis
    .get(url)
    .set({ info: selector })
    .data(function onData (/** @type {{ info: string; }} */ data) {
      const nb = Number.parseInt(data.info.split(' ')[0] ?? '0', 10)
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
}

setInterval(check, everySeconds * 1000)
