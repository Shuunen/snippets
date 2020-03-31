const BroidSlack = require('broid-slack')

const slack = new BroidSlack({
  token: 'MY-TOKEN',
})

slack.connect().subscribe({
  next: data => console.log(data),
  error: err => console.error(`Something went wrong: ${err.message}`),
  complete: () => console.log('complete'),
})
