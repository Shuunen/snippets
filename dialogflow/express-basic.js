const port = process.env.PORT || 8080
const express = require('express')
const bodyParser = require('body-parser')
const morgan = require('morgan')
const app = express()

app.use(morgan('combined'))
app.use(bodyParser.urlencoded({ extended: 'true' }))
app.use(bodyParser.json())

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})

const fill = (tpl, data) => {
  let str = '' + tpl
  for (const [key, value] of data) {
    const regex = new RegExp('{+\\s?' + key + '\\s?}+', 'ig')
    str = str.replace(regex, value)
  }
  return str
}

const dfResponse = (text, source) => {
  return {
    fulfillmentText: text,
    fulfillmentMessages: [
      {
        text: {
          text: [text]
        }
      }
    ],
    payload: {
      google: {
        expectUserResponse: false,
        richResponse: {
          items: [
            {
              simpleResponse: {
                textToSpeech: text
              }
            }
          ]
        }
      }
    },
    source: source || 'default-source'
  }
}

app.post('/webhook', (req, res) => {
  const query = req.body.queryResult

  if (!query) {
    const message = 'not a DialogFlow request'
    console.log(message)
    return res.send(message)
  }

  // log all df query
  // console.log('query:', JSON.stringify(query, null, 2))

  const data = new Map().set('box', 'B').set('drawer', '2')
  const tpl = 'you\'re looking for drawer { drawer } in box n°{ box }'
  res.json(dfResponse(fill(tpl, data)))
})

app.listen(port, () => {
  console.log('server running on port', port)
})
