import { gray, green } from 'colorette'

const input = '<h1 style="color: red">Super top !</h1>'
let index = -1
const stats = {
  total: input.length,
  textContent: 0,
  attr: 0,
  tags: 0,
  stylesInline: 0,
  stylesBlock: 0,
}
const states = {
  lookingForATag: 'lookingForATag',
  onTagName: 'onTagName',
  onTagAttr: 'onTagAttr',
}
let state = ''
const setState = (newState) => {
  const context = `${input[index - 2] ? gray(input[index - 2]) : ' '}${input[index - 1] ? gray(input[index - 1]) : ' '}${input[index] ? green(input[index]) : ' '}${input[index + 1] ? gray(input[index + 1]) : ' '}${input[index + 2] ? gray(input[index + 2]) : ' '}`
  console.log(`${index.toString().padEnd(3)} ${context} ${state} => ${newState}`)
  state = newState
}
setState(states.lookingForATag)
const chars = [...input]
chars.forEach(char => {
  index++
  if (state === states.onTagName && char === ' ') setState(states.onTagAttr)
  if (state === states.onTagName) return stats.tags++
  if (state === states.onTagAttr && char !== '>') return stats.attr++
  if (state === states.lookingForATag && char !== '<') return stats.textContent++
  if (char === '<') {
    stats.tags++
    return setState(states.onTagName)
  }
  if (char === '>') {
    stats.tags++
    return setState(states.lookingForATag)
  }
})

console.assert((stats.tags + stats.attr + stats.textContent) === stats.total, 'sub-stats does not adds up as total')
console.log(stats)
