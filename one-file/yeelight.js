const light = require('yeelight2')('yeelight://192.168.31.170:55443')

let brightness = 30

console.log('opening connection...')

const getName = () => light.get_prop('name')
  .then((response) => console.log('bulb name is : ' + response.name))
  .catch(() => console.log('failed at getting name :('))

const getBrightness = () => light.get_prop('bright')
  .then((response) => console.log('brightness is : ' + response.bright + '%'))
  .catch(() => console.log('failed at getting brightness :('))

const setBrightness = () => light.set_bright(brightness)
  .then(() => {
    console.log('set brightness to ' + brightness + '% succeed :)')
  })
  .catch(() => console.log('failed at setting brightness to ' + brightness + '% :('))

const increaseBrightness = () => setBrightness(brightness = brightness + 30)

// const decreaseBrightness = () => setBrightness(brightness = brightness - 30)

const delay = (time) => {
  time = time || 2000
  return new Promise((resolve) => setTimeout(resolve, time))
}

const shortDelay = () => delay(1000)

const longDelay = () => delay(4000)

const toggle = () => light.toggle()
  .then(() => console.log('toggle succeed :)'))
  .catch(() => console.log('failed at toggling light :('))

const close = () => {
  console.log('closing connection...')
  light.exit()
}

getName()
  .then(setBrightness)
  .then(longDelay)
  .then(getBrightness)
  .then(increaseBrightness)
  .then(delay)
  .then(getBrightness)
  .then(toggle)
  .then(shortDelay)
  .then(toggle)
  .then(close)
