/* c8 ignore start */
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// @ts-expect-error missing types
import notifier from 'node-notifier'
// @ts-expect-error missing types
import osmosis from 'osmosis'

const url = 'https://www.facebook.com/some-page/'
const info = 'div._4-u8 > div._2pi9._2pi2 > div._ikh > div._4bl9'
const everySeconds = 20
let lastNb = 0

/**
 *
 */
function check () {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  osmosis
    .get(url)
    .set({ info })
    .data((/** @type {{ info: string; }} */ data) => {
      const nb = Number.parseInt(data.info.split(' ')[0] ?? '0', 10)
      if (lastNb !== nb) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        notifier.notify({
          message: `Total : ${nb} likes`,
          title: 'New like',
        })
        console.log(`Total : ${nb} likes`)
      }
      lastNb = nb
    })
    .error(console.log)
}

// eslint-disable-next-line @typescript-eslint/no-magic-numbers
setInterval(check, everySeconds * 1000)

