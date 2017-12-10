
const dash_button = require('node-dash-button')

const buttons = [
    {
        name: 'signal',
        mac: 'fc:a6:67:8f:42:7c'
    }
]

buttons.forEach(button => {
    console.log(`listening to button "${button.name}" with mac ${button.mac}`)
    button.instance = dash_button(button.mac, null, null, 'arp')
    button.instance.on('detected', onClick(button))
})

function onClick(button) {
    console.log(`"${button.name}" has been clicked`)
}
