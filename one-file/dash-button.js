import dashBtn from 'node-dash-button'

const buttons = [
  {
    name: 'white',
    mac: 'fc:a6:67:8f:42:7c',
  },
  {
    name: 'red',
    mac: '34:d2:70:18:10:cc',
  },
]

buttons.forEach(button => {
  console.log(`listening to button "${button.name}" with mac ${button.mac}`)
  button.instance = dashBtn(button.mac, undefined, undefined, 'arp')
  button.instance.on('detected', () => console.log(`"${button.name}" has been clicked`))
})
