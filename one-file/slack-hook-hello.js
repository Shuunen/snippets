/* global XMLHttpRequest */

const request = new XMLHttpRequest()
request.open('POST', 'https://hooks.slack.com/services/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', true)
request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8')
request.send('payload={"text": "hello sweetie ! "}')
