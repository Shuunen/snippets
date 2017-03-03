var Botkit = require('botkit');
var _ = require('underscore');
var Chance = require('chance');
var chance = new Chance();
var fs = require('fs');
var token = fs.readFileSync('./token.conf', 'utf8');

if(!token){
console.log('please set a slack token in a token.conf file');
return;
}

var controller = Botkit.slackbot({
  debug: false
  //include "log: false" to disable logging
  //or a "logLevel" integer from 0 to 7 to adjust logging verbosity
});

// connect the bot to a stream of messages
controller.spawn({
  token: token,
}).startRTM()

var pick = function(arr){
    return chance.pickone(arr);
};

var userIdToName = {
 'U0760C9CL': ['romain', 'rom1', 'rominou'],
 'U21PGPWE9': ['romain 1'],
 'U23HBPVB2': ['floris','fl0r1s'],
 'U1Y7HMH1Q': ['popo','pauline', 'p0l1ne' , 'popoPO','paulAYYine'],
 'U0EQPACE6': ['flo', 'gouy gouy', 'florian', 'fl0 le chaud'],
 'U0YCZU9MY': ['benJ', 'ben', 'benjam1','ben le ouf']
};

var userFromId = function(userId) {
 return pick(userIdToName[userId]);
};

var endToArr = ['bro','bro\'','broow', '', 'broo','broOo','br0', '', 'ma couille', 'soss\'', 'mon ami', 'la véritayy','zbraaa'];
var endPuncArr = ['!','\\o/','!', '', ''];
var endSmileyyArr = [':stuck_out_tongue:',':p',':)', ' ', ' ', ':smile:', ':sunglasses:' , ':grin:', ':clap:' ];
var end = function(){
    lastReply = timestamp();
    return ' ' + pick(endToArr) + ' ' + pick(endPuncArr) + ' ' + pick(endSmileyyArr);
}

var speakDude = ['lache ton flow _N_','aller on écoute _N_', 'attention _N_ va parleyy','', '_N_ la sainte parole', 'chut on écoute _N_ !', '_N_ est en train de tapayyy', '_N_ le grand frêre' , 'encore _N_ qui nous déballe sa vie', '3615 la vie de _N_', '_N_ est tro inspirayy'];
var goDude = ['allay', 'trop bon', 'haa-ha' , 'go' , 'fait pas ton timide', ' ', 'c\'mon dude !'];
var dudeWillSpeak = function(userId){
    return pick(speakDude).replace('_N_', userFromId(userId)) + ' ' + pick(goDude) + ' ' + pick(endSmileyyArr);
};
var timestamp = function(){
	return Math.round(Date.now() / 1000);
};


var quotes = ['mon gars posey po-posey mon gars hey hey', 'je rappe mieux qu\’tupac plus de buzz qu’obama', 'dis moi pourquoi mon rap est trop fraiy demande a’amnadine elle te dira pourquoi je suis trop beauw','Swaggy Doggy Dort il n’sait plus quoi faire car on est blinder d’or equipey tatouey de la tete jusqu’au piey mec', 'Tu bois trop de label 5 Mec on est dechirey mec on est montey en bentley','J\'ai des cadavres de culs, j\'ai les couilles déchargées','Avec ta gow, je suis posey, elle a le froc baissey; Elle fait que des avances, j\'crois bien qu\'elle a envie d\'baisey','Des fois j\'aimerais mettre mes mains dans mes poches, mais y\'a trop d\'billeys','Parlent de moi mais j\'baise leur fiancée comme un antillais; An-an-antillais, me dissout pas j\'reste entiey','Tellement d\'swag et d\'argent que ta grand-mère me suce sans dentiey','Dans ma Bentley ou ma Lambo\', suce mon kiki pendant qu\'t\'y es'];

var lastReply = timestamp();
var lastUserId = '';

// reply to any incoming message
controller.on('message_received', function(bot, msg) {
    console.log('entendu "'+ JSON.stringify(msg)+'"');
    var userId = msg.user;
    var content = msg.content;

    if(!content){
       if(msg.type === 'user_typing'){
	  if(_.has(userIdToName, userId) && (timestamp() - lastReply) > 5 && lastUserId != userId){
	     bot.reply(msg, dudeWillSpeak(userId));
	     lastReply = timestamp();
	     lastUserId = userId;
          }
       } else if (msg.type === 'file_shared') {
             bot.reply(msg, 'ta photo elle est tro stilayy' + end());
       }
       return;
    }	

    if (content.indexOf('billet') !== -1){
	bot.reply(msg, 'j\'kiff les billayy' + end());
    } else if (content.indexOf('posé')  !== -1) {
        bot.reply(msg,'j\'suis trop posayyy' + end());
    } else if (content.indexOf('tatoué')  !== -1) {
        bot.reply(msg,'d\'la tête aux pieyy' + end());
    } else if (content.indexOf('reposer')  !== -1) {
        bot.reply(msg,'pas besoin bro, j\'suis survoltayyy' + end());
    } else if (content.indexOf('pnl')  !== -1) {
        bot.reply(msg,'azy PNL cay day paydayy' + end());
    } else if (content.indexOf('citation')  !== -1) {
        bot.reply(msg, pick(quotes) + end());
    } else if (content.indexOf('azy')  !== -1) {
        bot.reply(msg, 'c\'toi le nazi' + end());
    }
    //bot.reply(message, 'T\'as dis quoi bro ?');
});

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

