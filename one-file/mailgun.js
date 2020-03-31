var mailgun = require('mailgun-js')({
  apiKey: 'key-abcd',
  domain: 'sandboxeabcd.mailgun.org',
})

var date = new Date()
var hour = date.getHours() + 'h' + (date.getMinutes().length === 1 ? '0' : '') + date.getMinutes()

var data = {
  from: 'My Software <romain.racamier@gmail.com>',
  to: 'Romain Racamier-Lafon <romain.racamier@gmail.com>',
  subject: 'Another mail for me',
  text: 'Cool ;) Time is ' + hour,
}

mailgun.messages().send(data, function onSend (error, body) {
  if (error) {
    console.log('got an error: ', error)
  } else {
    console.log(body)
  }
})
