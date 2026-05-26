/* v8 ignore start */
// @ts-expect-error missing types
import dashBtn from 'node-dash-button'
import { Logger } from 'shuutils'

const logger = new Logger()
/** @type {{ mac: string, name: string, instance?: any }[]} */
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
  logger.info(`listening to button "${button.name}" with mac ${button.mac}`)
  button.instance = dashBtn(button.mac, undefined, undefined, 'arp')
  button.instance.on('detected', () => {
    logger.info(`"${button.name}" has been clicked`)
  })
}
