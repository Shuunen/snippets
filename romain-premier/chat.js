/* jshint devel:true */
/* global TheaterJS, store */

/*
Init with 
Chat({
	input: document.getElementById('visitor-input')
});
*/

Array.prototype.pick = function () {
    return this[Math.floor(Math.random() * this.length)];
};

var Chat = function (options) {

    var roadmap = [
        "send ip and real date in mongo",
        "show available commands",
        "handle click on typer-link to populate input field",
        "style home a bit",
        "add an help icon",
        "handle wait/break in speak",
        "show roadmap on demand",
        "speak/invite after visitor inactivity",
        "show me/visitor profile on demand",
        "show a real website on demand",
        "let user leave suggestions",
        "handle chitchat like ok,cool,..."
    ];

    /* Persons */
    var me = {
        name: "Romain",
        firstname: "Romain",
        lastname: "Racamier Lafon",
        age: 26,
        version: '0.4',
        creator: ['the physical me', 'the one that coded me, me :)'],
        boss: ['Niji, near Rennes, France'],
        visitor: false,
        me: true
    };
    var visitor = {
        name: "Visitor",
        creator: 'your parents... you should know that :)',
        visitor: true,
        me: false
    };

    /* Topics */
    var topicsAboutHumans = ['religion', 'god', 'war', 'sex'];
    var topicsAboutUs = ['name', 'firstname', 'lastname', 'age', 'version', 'creator'];

    /* Words */
    var wordsToWelcome = ["hey", "hello", "hi"];
    var wordsToAsk = ['what', 'why', 'who', 'how'];
    var wordsToContinue = ['ok', 'cool', 'good', 'sure', 'yes', 'nice', 'yep', 'yup'];
    var wordsToStop = ['no', 'nope'];
    var wordsToContinueAndStop = wordsToContinue.concat(wordsToStop);

    /* Expressions */
    var expressionsAsYouWish = ['ok, as you wish', 'sure, as you want'];
    var expressionsTypeOkToContinue = [' -- type _ok_ to continue'];
    var expressionsDidntGetYou = ['I didn\'t get you...', 'I was not expecting that', 'Oops I did not get you'];
    var expressionsAreYouSure = ['are you sure you want to {{command}} ?', 'I will {{command}}, do you validate ?'];
    var expressionsCommandExecutedWell = ['command {{command}} has been executed with success'];
    var expressionsYouShould = ["hey, you should", "if you want to, you can", "you should"];
    var expressionsSeeYouBack = ['glad to see you again', 'glad to see you back', 'welcome back', "it's been a while"];
    var expressionsThatsWhatYouTold = ["that's what you told me", '', ", as you told me", '', '... as you said', ":) see ? I didn't forgot !"];
    var expressionsGotIt = ["ok :) thanks for sharing", "cool, I will save it", "thanks for sharing"];
    var expressionsDontKnow = ["I don't have the answer", "I don't have all the answers... yet :)", "I don't know", "sorry but I don't know"];

    /* Emoticons */
    var emoticonsHappy = [' :)', ' :]'];
    var emoticonsSad = [' :(', ' :s', ' :\'('];

    /* Actions */
    var actions = {
        welcomeVisitor: {
            intro: ["welcome to my portfolio" + expressionsTypeOkToContinue.pick(), "welcome ! this is my portfolio" + expressionsTypeOkToContinue.pick()],
            outro: ["these links are here just shortcuts to help you speaking with me without typing"],
            need: 'boolean'
        },
        getVisitorName: {
            intro: ["what's your name ?", "what is your name ?", "would you tell me your name ?"],
            outro: ["cool, I can call you {{answer}} now", "thanks {{answer}}"],
            need: 'string'
        },
        presentMyself: {
            intro: ["my name is Romain Racamier Lafon and I designed this chatter-bot to present me and my work"]
        },
        presentCommands: {
            intro: ["if you want to know more about me or my work, you'll find some commands below"]
        }
    };

    /* Commands */
    var commands = {
        reset: function () {
            console.info(level + 'commands : reset : clear local storage and restart');
            storage.clear();
            document.location.href = document.location.href;
        }
    };
    var commandExamples = [
        "_what's your name ?_",
        "_who's your creator ?_",
        "_what's your age ?_",
        "_reset our dialog please"
    ];

    var keywordedAnswers = [
        {
            words: wordsToWelcome,
            answers: emoticonsHappy
        }, {
            words: wordsToContinue,
            answers: emoticonsHappy
        }, {
            words: ["fuck", "suck"],
            answers: ["now ?", "oh", "you know what I like", "you would like something else ?"]
        }, {
            words: ["reset"],
            answers: expressionsAreYouSure,
            need: 'boolean',
            command: true
        }, {
            words: topicsAboutHumans,
            answers: ["you should ask this to a human"]
        }
    ];

    var level = '';


    var currentDiscussion = {};
    var lastDiscussion = {};


    var invite = function () {

        level += '|-- ';

        var actionToDo = '';

        for (var actionName in actions) {
            if (actions.hasOwnProperty(actionName) && !actions[actionName].done) {
                actionToDo = actionName;
                break;
            }
        }

        if (actionToDo) {
            console.log(level + 'invite : action "' + actionToDo + '" -> say');
            say(actions[actionToDo].intro.pick() + ' ' + emoticonsHappy.pick(), true);
            if (!actions[actionToDo].outro) {
                actions[actionToDo].done = true;
                storage.set('actions', actions);
            } else {
                currentDiscussion.question = true;
                currentDiscussion.action = actionToDo;
            }
        } else {
            console.log(level + 'invite : random command -> say');
            var commandExample = commandExamples.pick();
            say(expressionsYouShould.pick() + ' ask me "' + commandExample + '"', true);
            currentDiscussion.question = true;
            currentDiscussion.commandExample = commandExample;
            currentDiscussion.need = 'boolean';
        }
    };

    var understand = function (sentence, bFromMe) {

        level += '|-- ';

        currentDiscussion = {};

        currentDiscussion.sentence = sentence.toLowerCase();

        console.log(level + 'understand : try understanding sentence : "' + sentence + '"');

        for (var i = 0; i < wordsToAsk.length; i++) {
            var wordToAsk = wordsToAsk[i];
            if (sentence.indexOf(wordToAsk) !== -1) {
                currentDiscussion.interrogator = wordToAsk;
                currentDiscussion.type = "string";
                currentDiscussion.question = true;
                break;
            }
        }

        if (!currentDiscussion.question && sentence.indexOf('?') !== -1) {
            currentDiscussion.question = true;
        }

        currentDiscussion.topicAboutUs = sentence.contains(topicsAboutUs);
        if (!currentDiscussion.topicAboutUs) {
            // keep currentDiscussion object simple and clean
            delete currentDiscussion.topicAboutUs;
        }

        if (sentence.indexOf('your') !== -1 || sentence.indexOf('you are') !== -1 || sentence.indexOf("you're") !== -1) {
            currentDiscussion.target = bFromMe ? visitor : me;
            currentDiscussion.origin = bFromMe ? me : visitor;
            currentDiscussion.subject = currentDiscussion.target;
        }
        else if (sentence.indexOf('my') !== -1 || sentence.indexOf("i'm") !== -1 || sentence.indexOf('i am') !== -1) {
            currentDiscussion.target = bFromMe ? visitor : me;
            currentDiscussion.origin = bFromMe ? me : visitor;
            currentDiscussion.subject = currentDiscussion.origin;
        }

        if (currentDiscussion.subject) {
            var match = sentence.match(/(?:is|are|'s)([\s\w]*)/);
            if (match && match[1]) {
                currentDiscussion.answer = match[1].trim();
            }
        }

        // if no well formatted answer given, consider all sentence was answer
        if (!currentDiscussion.answer) {
            currentDiscussion.answer = currentDiscussion.sentence;
        }
    };

    var inject = function (sentence) {

        var pattern;

        if (currentDiscussion.answer) {
            pattern = /{\{answer}}/g;
            sentence = sentence.replace(pattern, currentDiscussion.answer);
        }

        if (currentDiscussion.command) {
            pattern = /{\{command}}/g;
            sentence = sentence.replace(pattern, currentDiscussion.command);
        }

        // handle command typer links
        pattern = /_([^_]*)_/g;
        sentence = sentence.replace(pattern, '<a href="#" class="command-typer">$1</a>');

        return sentence;
    };

    var say = function (sentences, bCanBeAQuestion) {
        level += '|-- ';
        sentences = sentences.split(' -- ');
        for (var i = 0; i < sentences.length; i++) {
            var sentence = sentences[i];
            sentence = inject(sentence);
            scene.theater.write("Romain:" + sentence, 100).write(500);
        }
        if (bCanBeAQuestion) {
            console.log(level + 'say : can be a question -> understand');
            understand(sentence, true);
        }
    };

    var reply = function () {
        level += '|-- ';
        console.log(level + 'reply : to lastDiscussion', lastDiscussion);
        console.log(level + 'reply : to currentDiscussion', currentDiscussion);

        var output = '';

        if (!output.length) {
            if (lastDiscussion.action) {
                console.log(level + 'did visitor answer to previous action : ' + lastDiscussion.action + ' ?');
                var action = actions[lastDiscussion.action];
                // if there is an outro
                var outro = action.outro;
                if (outro && outro.push) {
                    console.log(level + 'outro detected');
                    if (currentDiscussion.sentence.contains(wordsToStop)) {
                        console.log(level + 'outro canceled by user');
                        output = expressionsAsYouWish.pick();
                    }
                    else if (currentDiscussion.sentence.satisfy(action.need)) {
                        console.log(level + 'outro validated by user');
                        if (lastDiscussion.subject && lastDiscussion.topic && lastDiscussion.answer) {
                            output = update(lastDiscussion.subject, lastDiscussion.topic, currentDiscussion.answer) + ' -- ';
                        }
                        output += outro.pick();
                        action.done = true;
                    }
                    storage.set('actions', actions);
                }
            }
        }
        if (!output.length) {
            if (lastDiscussion.command && currentDiscussion.sentence.satisfy(lastDiscussion.need)) {
                console.log(level + 'did visitor answer to previous command ?');
                var command = commands[lastDiscussion.command];
                if (typeof command === 'function') {
                    console.log(level + 'starting command : ' + lastDiscussion.command);
                    command();
                    currentDiscussion.command = lastDiscussion.command;
                    output = expressionsCommandExecutedWell.pick() + emoticonsHappy.pick();
                }
            }
        }
        if (!output.length) {
            if (lastDiscussion.commandExample && currentDiscussion.sentence.satisfy(lastDiscussion.need)) {
                console.log(level + 'did visitor accepted to ask me the previous commandExample ?');
                understand(lastDiscussion.commandExample, false);
                return true; // TODO : not sure about this behaviour
            }
        }
        if (!output.length) {
            console.log(level + 'did visitor used a keyword ?');
            for (var i = 0; i < keywordedAnswers.length; i++) {
                var keywordedAnswer = keywordedAnswers[i];
                // if some keyword matches
                var keyword = currentDiscussion.sentence.contains(keywordedAnswer.words);
                if (keyword) {
                    console.log(level + 'keywordedAnswers : keyword detected : ' + keyword);

                    // get the answer
                    output = keywordedAnswer.answers.pick();

                    // if it's a command, store which one
                    if (keywordedAnswer.command) {
                        console.log(level + 'keywordedAnswers : command detected : ' + keyword);
                        currentDiscussion.command = keyword;

                        // if this command require something
                        if (keywordedAnswer.need) {
                            console.log(level + 'keywordedAnswers : command need detected : ' + keywordedAnswer.need);
                            currentDiscussion.question = true;
                            currentDiscussion.need = keywordedAnswer.need;
                        }
                    }
                    break;
                }
            }
        }
        if (!output.length) {
            if (currentDiscussion.question) {
                console.log(level + 'is there an active question to answer to ?');
                currentDiscussion.answer = currentDiscussion.subject[currentDiscussion.topicAboutUs];
                if (currentDiscussion.answer) {
                    if (currentDiscussion.answer.push) {
                        currentDiscussion.answer = currentDiscussion.answer.pick();
                    }
                    console.log(level + 'reply : give answer & invite');
                    if (currentDiscussion.subject) {
                        var start = currentDiscussion.subject.me ? 'my' : 'your';
                        var startAlt = currentDiscussion.subject.me ? "I'm" : 'you are';
                    }
                    if (currentDiscussion.topicAboutUs === 'age') {
                        output = startAlt + ' ' + currentDiscussion.answer + ["", " year old", ""].pick();
                    }
                    else {
                        output = start + ' ' + currentDiscussion.topicAboutUs + ' is ' + currentDiscussion.answer;
                    }
                    if (currentDiscussion.subject.visitor) {
                        output += ' ' + expressionsThatsWhatYouTold.pick();
                    }

                } else {
                    output = expressionsDontKnow.pick() + emoticonsSad.pick();
                    console.log(level + 'reply : no answer to give -> say expressionsDontKnow & invite');
                    storage.sendInputToDb('questions');
                }
            }
        }
        if (!output.length) {
            if (currentDiscussion.subject && currentDiscussion.topicAboutUs && currentDiscussion.answer) {
                console.log(level + 'did visitor made an assertion ?');
                output = update(currentDiscussion.subject, currentDiscussion.topicAboutUs, currentDiscussion.answer);
            }
        }
        if (!output.length) {
            if (lastDiscussion.question && lastDiscussion.subject && lastDiscussion.topicAboutUs && currentDiscussion.answer) {
                console.log(level + 'did visitor replied to my last question ?');
                // use answer to update targeted subject
                output = update(lastDiscussion.subject, lastDiscussion.topicAboutUs, currentDiscussion.answer);
            }
        }
        if (!output.length) {
            console.log(level + 'I dont know what to say...');
            output = expressionsDidntGetYou.pick();
            storage.sendInputToDb();
        }

        // speak
        say(output);

        // if no current question, invite
        if (!currentDiscussion.question) {
            invite();
        }

        // clone currentDiscussion
        lastDiscussion = JSON.parse(JSON.stringify(currentDiscussion));
    };

    var welcome = function () {
        var bAlreadySeen = (visitor.name !== 'Visitor');
        var output = [' there', '', ' visitor', ''].pick();
        if (bAlreadySeen) {
            output = ' ' + visitor.name + ', ' + expressionsSeeYouBack.pick();
            document.querySelector('.visitor span').innerText = visitor.name;
        }
        say(wordsToWelcome.pick() + output + emoticonsHappy.pick());
    };

    var update = function (person, topic, value) {

        var output = '';

        // adapt value depending on topic
        if (topic.indexOf('name') !== -1) {
            value = value.capitalizeFirsts();
        }

        if (person && topic) {
            if (person.visitor) {
                // update visitor profile
                output = expressionsGotIt.pick() + emoticonsHappy.pick();
                visitor[topic] = value;
                storage.set('visitor', visitor);
                // update name in the landing page
                if (topic.indexOf('name') !== -1) {
                    document.querySelector('.visitor span').innerText = visitor.name;
                }
            } else {
                // visitor tried to update MY profile ! ;p
                // TODO : I should check origin to avoid thinking I'm hacking myself :p
                output = 'nice try' + emoticonsHappy.pick();
            }
        }

        return output;
    };


    /* Utilities */

    String.prototype.contains = function (stuffs) {
        if (stuffs.push) {
            for (var i = 0; i < stuffs.length; i++) {
                if (this.indexOf(stuffs[i]) !== -1) {
                    return stuffs[i];
                }
            }
        }
        return false;
    };

    String.prototype.satisfy = function (need) {

        var bSatisfied = false;

        if (need && need.length) {
            console.log(level + 'searching for need : ' + need + ', in sentence : ' + this);
            if (need === 'boolean' && this.contains(wordsToContinueAndStop)) {
                bSatisfied = true;
            }
            else if (need === 'string' && this.trim && this.trim().length > 0) {
                bSatisfied = true;
            }
        }
        else {
            bSatisfied = true;
        }

        if (bSatisfied) {
            console.log(level + 'sentence satisfied need : ' + need);
        }
        else {
            console.warn(level + 'sentence did not satisfied given need : ' + need);
        }

        return bSatisfied;

    };

    String.prototype.capitalizeFirsts = function () {
        return (this + '').replace(/^([a-z\u00E0-\u00FC])|\s+([a-z\u00E0-\u00FC])/g, function ($1) {
            return $1.toUpperCase();
        });
    };


    /* Scene */
    var scene = {};
    scene.el = document.getElementsByClassName('scene')[0];
    scene.initTheater = function () {
        var theater = new TheaterJS();
        theater.describe("Romain", {
            speed: 1,
            accuracy: 1
        }, "#romain");
        theater.on("say:start, erase:start", function () {
            this.utils.addClass(this.current.voice, "saying");
        }).on("say:end, erase:end", function () {
            // When say or erase ends, remove the caret.
            this.utils.removeClass(this.current.voice, "saying");
        });
        this.theater = theater;
    };
    scene.handleDiscreteMode = function () {
        if (this.el.classList.contains('discrete')) {
            this.el.classList.add('hidden');
            var self = this;
            window.onfocus = function () {
                self.el.classList.remove('hidden');
            };
            window.onblur = function () {
                self.el.classList.add('hidden');
            };
        }
    };
    scene.listenToInputs = function () {
        // listen user inputs
        options.input.addEventListener('keydown', function (event) {
            if (event.keyCode == 13) {
                event.preventDefault();
                console.clear();
                level = '';
                understand(event.target.value, false);
                event.target.value = '';
                reply();
                return false;
            }
        });
        // auto-focus the first time
        options.input.focus();
        // listen user clicks
        this.el.addEventListener('click', function (event) {
            if (event.target.classList.contains('command-typer')) {
                event.preventDefault();
                var cmd = event.target.textContent;
                options.input.value = cmd;
                understand(cmd, false);
                scene.clearOnClick = true;
                reply();
            } else if (event.target === options.input && scene.clearOnClick) {
                options.input.value = '';
                scene.clearOnClick = false;
            }
        });
    };
    scene.init = function () {
        this.initTheater();
        //this.handleDiscreteMode();
        this.listenToInputs();
    };

    /* Storage */
    var storage = store.namespace('shuufolio');
    storage.import = function () {
        var lsVersion = storage.get('version');
        if (lsVersion) {
            // if version older, clear all saved data
            if (parseFloat(lsVersion) < parseFloat(me.version)) {
                console.log('old version in LS, clear all saved data');
                storage.clear();
            }
            // else try to update defaults with previously saved data
            else {
                var lsVisitor = storage.get('visitor');
                var avoidProperties = ['me', 'visitor'];
                if (lsVisitor) {
                    for (var property in lsVisitor) {
                        // if property is a direct property of lsVisitor &&
                        // if property is a direct property of visitor &&
                        // if property is not part of the avoided properties
                        if (lsVisitor.hasOwnProperty(property) && visitor.hasOwnProperty(property) && avoidProperties.indexOf(property) === -1) {
                            // if there is an update
                            if (visitor[property] !== lsVisitor[property]) {
                                console.log('updated visitor "' + property + '" from "' + visitor[property] + '" to "' + lsVisitor[property] + '"');
                                visitor[property] = lsVisitor[property];
                            }
                        }
                    }
                }

                var lsActions = storage.get('actions');
                if (lsActions) {
                    console.log('updated actions');
                    actions = lsActions;
                }
            }
        }
        storage.set('version', me.version);
        storage.set('visitor', visitor);
        storage.set('actions', actions);
    };
    storage.sendInputToDb = function (type) {
        var host = window.location.hostname;
        if (host.indexOf('localhost') !== -1 || host.indexOf('c9.io') !== -1) {
            return;
        }
        else {
            console.info('sending sentence to mongo');
        }
        type = type || 'anything';
        var request = new XMLHttpRequest();
        // TODO : do not submit apiKey
        var apiKey = '';
        request.open('POST', 'https://api.mongolab.com/api/1/databases/portfolio-chat/collections/' + type + '?apiKey=' + apiKey, true);
        request.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
        request.send(JSON.stringify({
            "sentence": currentDiscussion.sentence,
            "timestamp": Math.floor(Date.now() / 1000),
            "version": me.version
        }));

    };
    storage.init = function () {
        this.import();
    };

    /* Init */

    scene.init();
    storage.init();
    welcome();

};
