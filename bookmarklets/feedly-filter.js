var avoid = "Dark Vador, Pokemon Go";
avoid = avoid.toLowerCase().replace(/,/g, '|');
console.info('will remove rows with one of these words');
console.info(avoid.replace(/\|/g, ' | '));
var escapeRegExp = function (str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$]/g, '\\$&');
};
var accentsTidy = function (inputStr) {
    var str = inputStr.toLowerCase();
    var notGood = {
        a: '[àáâãäå]',
        ae: 'æ',
        c: 'ç',
        e: '[èéêë]',
        i: '[ìíîï]',
        n: 'ñ',
        o: '[òóôõö]',
        oe: 'œ',
        u: '[ùúûuü]',
        y: '[ýÿ]'
    };
    for (var good in notGood) {
        str = str.replace(new RegExp(notGood[good], 'g'), good);
    }
    return str;
};
var uniqueValues = function (value, index, self) {
    return self.indexOf(value) === index;
};
var forEach = function (array, callback, scope) {
    for (var i = 0; i < array.length; i++) {
        callback.call(scope, i, array[i]);
    }
};
var elements = document.querySelectorAll('.entryList .title');
forEach(elements, function (index, element) {
    var str = accentsTidy(element.text).replace(/_/g, ' ');
    str = str.replace(/[^\w&]+/g, ' ').trim();
    var match = str.match(new RegExp(escapeRegExp(avoid), 'g'));
    if (match) {
        match = match.filter(uniqueValues);
        if (match[0]) {
            console.warn('detected : ' + match.join(', ') + ' in title : ' + str);
        }
    }
    element.text = str;
});