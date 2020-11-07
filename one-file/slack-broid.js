const BroidSlack = require('broid-slack')

const slack = new BroidSlack({
  token: 'MY-TOKEN',
})

slack.connect().subscribe({
  next: data => console.log(data),
  error: error => console.error(`Something went wrong: ${error.message}`),
  complete: () => console.log('complete'),
})
