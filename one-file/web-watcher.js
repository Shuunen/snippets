const url = 'https://www.facebook.com/some-page/'
const selector = 'div._4-u8 > div._2pi9._2pi2 > div._ikh > div._4bl9'
const everySeconds = 20
import notifier from 'node-notifier'
import osmosis from 'osmosis'

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
}

setInterval(check, everySeconds * 1000)
