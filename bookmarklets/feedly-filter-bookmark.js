javascript:(function () {
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://rawgit.com/Shuunen/snippets/master/bookmarklets/feedly-filter.js';
    document.body.appendChild(script);
    /* the list of word(s) to exclude separated by commas */
    window.avoid = "Star Wars, Justin Bieber";
    /* spaces around commas does not matter */
    window.avoid += ",Nyan cage cat    , Me Gusta";
    /* word case does not matter neither */
    window.avoid += ", NiCOlaS CaGE, UpGRAyeDD";
})();