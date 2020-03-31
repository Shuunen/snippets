// This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
// Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
// session persistence, api calls, and more.
const Alexa = require('ask-sdk-core')
const utils = require('./utils')
const data = require('./data')

const answer = (handler, text, waitForResponse) => {
  console.log('answer :', text)
  if (waitForResponse) {
    return handler.responseBuilder.speak(text).reprompt(text).getResponse()
  }
  text += '. A bientôt !'
  return handler.responseBuilder.speak(text).getResponse()
}

const LaunchRequestHandler = {
  canHandle (handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest'
  },
  handle (handlerInput) {
    const speechText = 'Bonjour, comment puis-je vous aider aujourd\'hui ?'
    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .getResponse()
  },
}

const HelloWorldIntentHandler = {
  canHandle (handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
            handlerInput.requestEnvelope.request.intent.name === 'HelloWorldIntent'
  },
  handle (handlerInput) {
    const speechText = 'Salut toi ! Que puis-je faire ?'
    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .getResponse()
  },
}

const LookingForIntentHandler = {
  canHandle (handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
            handlerInput.requestEnvelope.request.intent.name === 'LookingForAnObject'
  },
  async handle (handler) {
    const request = handler.requestEnvelope.request
    const object = request.intent.slots.object.value
    if (!object) {
      return answer(handler, 'Quel objet ?', true)
    }
    console.log(`user is looking for object "${object}"`)
    const record = await data.findBoxContaining(object)
    if (!record) {
      return answer(handler, `Désolé mais je n'ai pas réussi à trouver "${object}", souhaitez-vous autre chose ?`, true)
    }
    const answerTpl = `${record.name}, dans la boite {{ box }} {{ drawer }}`
    const text = utils.fill(answerTpl, record)
    return answer(handler, text)
  },
}

const SortingIntentHandler = {
  canHandle (handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
            handlerInput.requestEnvelope.request.intent.name === 'SortingAnObject'
  },
  async handle (handler) {
    const request = handler.requestEnvelope.request
    console.log('got request.intent.slots', request.intent.slots)
    const object = request.intent.slots.object.value
    if (!object) {
      return answer(handler, 'Quel objet ?', true)
    }
    let box = request.intent.slots.box.value
    if (!box) {
      return answer(handler, 'Je n\'ai pas compris dans quelle boite, souhaitez-vous autre chose ?', true)
    }
    let drawer = request.intent.slots.drawer.value
    if (!drawer) {
      return answer(handler, 'Je n\'ai pas compris dans quel tiroir, souhaitez-vous autre chose ?', true)
    }
    box = ('' + box).trim()[0].toUpperCase()
    if (!(/^[A-Z]$/.test(box))) {
      return answer(handler, `Je n'ai pas compris la boite "${box}", souhaitez-vous autre chose ?`, true)
    }
    drawer = ('' + drawer).trim()[0].trim()
    if (!(/^\d$/.test(drawer))) {
      return answer(handler, `Je n'ai pas compris le tiroir "${drawer}", souhaitez-vous autre chose ?`, true)
    }
    const location = box + drawer
    console.log(`user wants to set object "${object}" in location "${location}"`)
    const record = await data.setObjectIn(object, '', box, drawer)
    if (!record) {
      return answer(handler, `Désolé mais je n'ai pas réussi à ranger "${object}" dans "${location}", souhaitez-vous autre chose ?`, true)
    }
    const answerTpl = `${record.name} est désormais dans la boite {{ box }} {{ drawer }}, autre chose ?`
    const text = utils.fill(answerTpl, record)
    return answer(handler, text, true)
  },
}

const HelpIntentHandler = {
  canHandle (handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
            handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent'
  },
  handle (handler) {
    return answer(handler, 'Dites-moi je cherche x ou j\'ai rangé y dans z par exemple')
  },
}

const CancelAndStopIntentHandler = {
  canHandle (handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
            (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent' ||
                handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent')
  },
  handle (handlerInput) {
    const speechText = 'Goodbye!'
    return handlerInput.responseBuilder
      .speak(speechText)
      .getResponse()
  },
}
const SessionEndedRequestHandler = {
  canHandle (handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest'
  },
  handle (handlerInput) {
    // Any cleanup logic goes here.
    return handlerInput.responseBuilder.getResponse()
  },
}

// The intent reflector is used for interaction model testing and debugging.
// It will simply repeat the intent the user said. You can create custom handlers
// for your intents by defining them above, then also adding them to the request
// handler chain below.
const IntentReflectorHandler = {
  canHandle (handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
  },
  handle (handlerInput) {
    const intentName = handlerInput.requestEnvelope.request.intent.name
    const speechText = `You just triggered ${intentName}`

    return handlerInput.responseBuilder
      .speak(speechText)
    // .reprompt('add a reprompt if you want to keep the session open for the user to respond')
      .getResponse()
  },
}

// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
const ErrorHandler = {
  canHandle () {
    return true
  },
  handle (handlerInput, error) {
    console.log(`~~~~ Error handled: ${error.message}`)
    const speechText = 'Sorry, I couldn\'t understand what you said. Please try again.'

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .getResponse()
  },
}

// This handler acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    HelloWorldIntentHandler,
    LookingForIntentHandler,
    HelpIntentHandler,
    SortingIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler,
    IntentReflectorHandler,
  ) // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
  .addErrorHandlers(ErrorHandler)
  .lambda()
