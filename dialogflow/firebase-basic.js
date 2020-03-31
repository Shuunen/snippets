// https://github.com/dialogflow/dialogflow-fulfillment-nodejs
'use strict'

const functions = require('firebase-functions')
const { WebhookClient } = require('dialogflow-fulfillment')
const { Card, Suggestion } = require('dialogflow-fulfillment')

const fill = (tpl, data) => {
  let str = '' + tpl
  for (const [key, value] of data) {
    const regex = new RegExp('{+\\s?' + key + '\\s?}+', 'ig')
    str = str.replace(regex, value)
  }
  return str
}

process.env.DEBUG = 'dialogflow:debug' // enables lib debugging statements

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response })

  function lookingHandler (agent) {
    const data = new Map().set('box', 'B').set('drawer', '2')
    const title = '{{ box }}{{ drawer }}'
    const text = request.body.queryResult.fulfillmentText
    agent.add(fill(text, data))
    agent.add(new Card({
      title: fill(title, data),
      imageUrl: 'https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/120/google/146/card-file-box_1f5c3.png',
      text: 'est-ce correct ?',
    }),
    )
    // Suggestion title must be under 25 chars
    agent.add(new Suggestion('😲 non pas trouvé'))
    agent.add(new Suggestion('👍 oui je l\'ai trouvé !'))
  }

  const intentMap = new Map()
  intentMap.set('looking-for-an-object', lookingHandler)
  agent.handleRequest(intentMap)
})
