/* c8 ignore start */
// @ts-ignore
// biome-ignore lint/correctness/noUndeclaredDependencies: that's ok
import dashBtn from 'node-dash-button'

const buttons = [
  {
    mac: 'fc:a6:67:8f:42:7c',
    name: 'white',
  },
  {
    mac: '34:d2:70:18:10:cc',
    name: 'red',
  },
]

for (const button of buttons) {
  console.log(`listening to button "${button.name}" with mac ${button.mac}`)
  // @ts-ignore
  button.instance = dashBtn(button.mac, undefined, undefined, 'arp')
  // @ts-ignore
  button.instance.on('detected', () => {
    console.log(`"${button.name}" has been clicked`)
  })
}
