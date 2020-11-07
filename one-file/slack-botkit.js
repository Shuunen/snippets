const Botkit = require('botkit')
const _ = require('underscore')
const shuffle = require('shuffle-array')
const fs = require('fs')
let token = fs.readFileSync('./token.conf', 'utf8')

if (!token) {
  console.log('please set a slack token in a token.conf file')
  // eslint-disable-next-line unicorn/no-process-exit
  process.exit(1)
}

token = token.replace('\n', '')

const controller = Botkit.slackbot({
  debug: false,
  // include "log: false" to disable logging
  // or a "logLevel" integer from 0 to 7 to adjust logging verbosity
})

// connect the bot to a stream of messages
controller.spawn({
  token: token,
}).startRTM()

const pick = (array) => shuffle(array)[0]

const userIdToName = {
  U0760C9CL: ['romain', 'rom1', 'rominou'],
  U21PGPWE9: ['romain 1'],
  U0YBJJB0B: ['léo', 'lé0', 'lEyyO'],
  U0AMSTYCB: ['bertrand', 'bertr@nd', 'b€rtraN'],
  U23HBPVB2: ['floris', 'fl0r1s'],
  U1Y7HMH1Q: ['popo', 'pauline', 'p0l1ne', 'popoPO', 'paulAYYine'],
  U0EQPACE6: ['flo', 'gouy gouy', 'florian', 'fl0 le chaud'],
  U0YCZU9MY: ['benJ', 'ben', 'benjam1', 'ben le ouf'],
}

const userFromId = (userId) => {
  return _.has(userIdToName, userId) ? pick(userIdToName[userId]) : undefined
}

const endToArray = ['bro', 'bro\'', 'broow', '', 'broo', 'broOo', 'br0', '', 'ma couille', 'soss\'', 'mon ami', 'la véritayy', 'zbraaa']
const endPuncArray = ['!', '\\o/', '!', '', '']
const endSmileyyArray = [':stuck_out_tongue:', ':p', ':)', ' ', ' ', ':smile:', ':sunglasses:', ':grin:', ':clap:']
const end = () => {
  lastReply = timestamp()
  return ' ' + pick(endToArray) + ' ' + pick(endPuncArray) + ' ' + pick(endSmileyyArray)
}

/*
var speakDude = ['lache ton flow _N_', 'aller on écoute _N_', 'attention _N_ va parleyy', '', '_N_ la sainte parole', 'chut on écoute _N_ !', '_N_ est en train de tapayyy', '_N_ le grand frêre', 'encore _N_ qui nous déballe sa vie', '3615 la vie de _N_', '_N_ est tro inspirayy']
var goDude = ['allay', 'trop bon', 'haa-ha', 'go', 'fait pas ton timide', ' ', 'c\'mon dude !']
var dudeWillSpeak = function (userName) {
  return pick(speakDude).replace('_N_', userName) + ' ' + pick(goDude) + ' ' + pick(endSmileyyArr)
}
*/
const timestamp = () => Math.round(Date.now() / 1000)

const quotes = ['mon gars posey po-posey mon gars hey hey', 'je rappe mieux qu’tupac plus de buzz qu’obama', 'dis moi pourquoi mon rap est trop fraiy demande a’amnadine elle te dira pourquoi je suis trop beauw', 'Swaggy Doggy Dort il n’sait plus quoi faire car on est blinder d’or equipey tatouey de la tete jusqu’au piey mec', 'Tu bois trop de label 5 Mec on est dechirey mec on est montey en bentley', 'J\'ai des cadavres de culs, j\'ai les couilles déchargées', 'Avec ta gow, je suis posey, elle a le froc baissey; Elle fait que des avances, j\'crois bien qu\'elle a envie d\'baisey', 'Des fois j\'aimerais mettre mes mains dans mes poches, mais y\'a trop d\'billeys', 'Parlent de moi mais j\'baise leur fiancée comme un antillais; An-an-antillais, me dissout pas j\'reste entiey', 'Tellement d\'swag et d\'argent que ta grand-mère me suce sans dentiey', 'Dans ma Bentley ou ma Lambo\', suce mon kiki pendant qu\'t\'y es']

let lastReply = timestamp()
// var lastUserId = ''
let validUserName

const firstCap = (string) => string.charAt(0).toUpperCase() + string.slice(1)

const onMessageReceived = (bot, message) => {
  if (['presence_change', 'reconnect_url', 'hello'].includes(message.type)) {
    return
  } else {
    console.log('entendu "' + JSON.stringify(message) + '"')
  }

  const userId = message.user
  const userName = userFromId(userId)
  const content = message.content

  console.log('AZY userId "' + userId + '"')
  console.log('AZY validUserName "' + validUserName + '"')

  if (!userName) {
    if (userId !== 'undefined' && userId !== undefined) {
      console.log('AZY je connais pas "' + userId + '" encore !')
    }
    // validUserName = null; // we need to avoid reseting it
  } else {
    validUserName = userName
  }

  if (!content) {
    return // to avoid annoying ppl :p
    /*
    console.log('AZY pas de content et type "' + msg.type + '"')
    if (msg.type === 'user_typing') {
      console.log('AZY dans user_typing')
      if (validUserName && (timestamp() - lastReply) > 5 && lastUserId != userId) {
        bot.reply(msg, dudeWillSpeak(validUserName))
        lastReply = timestamp()
        lastUserId = userId
      }
    } else if (msg.type === 'file_shared') {
      console.log('AZY dans file_shared')
      bot.reply(msg, 'ta photo elle est tro stilayy' + end())
    } else if (msg.type === 'reaction_added') {
      console.log('AZY dans reaction_added')
      bot.reply(msg, 'ahh j\'kiff tes smilayyy' + end())
    }
    */
  }
  console.log('AZY avec content et validUserName "' + validUserName + '"')

  if (content.includes('billet')) {
    bot.reply(message, 'j\'kiff les billayy' + end())
  } else if (content.includes('posé')) {
    bot.reply(message, 'j\'suis trop posayyy' + end())
  } else if (content.includes('tatoué')) {
    bot.reply(message, 'd\'la tête aux pieyy' + end())
  } else if (content.includes('reposer')) {
    bot.reply(message, 'pas besoin bro, j\'suis survoltayyy' + end())
  } else if (content.includes('pnl')) {
    bot.reply(message, 'azy PNL cay day paydayy' + end())
  } else if (content.includes('citation')) {
    bot.reply(message, pick(quotes) + end())
  } else if (content.includes('azy')) {
    bot.reply(message, 'c\'toi le nazi' + end())
  } else if (content.includes('yo')) {
    bot.reply(message, 'yo' + end())
  } else if (content.includes('ça va')) {
    bot.reply(message, 'ca roule et toi' + end())
  } else if (content.includes('préféré')) {
    let m = 'c\'est toi ma couille !'
    if (validUserName) {
      m += ' _N_ + Swaggy Boy = :cupid:'
      m = m.replace('_N_', firstCap(validUserName))
    } else {
      console.log('AZY !!! je connais pas "' + userId + '" MON PREFEREYY !')
    }
    m += end()
    bot.reply(message, m)
  } else if (content.includes('te revoir')) {
    const secs = Math.round(timestamp() - lastReply) + ' secondes'
    bot.reply(message, 'cay clair! c\'étaay les ' + secs + ' les plus longues de ma life' + end())
  } else if (content.includes('longue')) {
    bot.reply(message, 'comme ma trompe' + end())
  } else if (content.includes('manges où')) {
    const placeToEat = pick(['au stéréo lux', 'dans ma Bentleyy'])
    bot.reply(message, placeToEat + end())
  } else if (content.includes('quelle heure')) {
    const hour = pick(['de sortir les billaayy', 'd\'allay mangeayy', 'd\'allay se posayy'])
    bot.reply(message, 'l\'heure ' + hour + end())
  } else if (content.includes('où')) {
    const location = pick(['dans ma villa de luxe', 'à un congrayy', 'au KFCayyy'])
    bot.reply(message, location + end())
  } else if (content.includes('on va')) {
    const ok = pick(['yes', 'carreyment', 'nan jammayy'])
    bot.reply(message, ok + end())
  } else {
    const p = pick(['yes', 'ça dépend des fois', 'carreyment', 'nan jammayy', 'seulement le dimanche', 'ouais t\'as cru quoi', 'plutôw ouayy', 'pas troww'])
    bot.reply(message, p + end())
  }
}

// reply to any incoming message
controller.on('message_received', onMessageReceived)

/*
// reply to a direct mention - @bot hello
controller.on('direct_mention',function(bot,message) {
  // reply to _message_ by using the _bot_ object
  bot.reply(message,'Wesh broow !');
});
*/

// give the bot something to listen for.
/*
controller.hears('ça va ?',['direct_message','direct_mention','mention'],function(bot,message) {
  bot.reply(message,'Ouayy ! j\'suis trop posayyy brow ! :D');
});
*/
