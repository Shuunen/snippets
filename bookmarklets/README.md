# Bookmarklets

My personal - useful or not - bookmarklets to make a better web


## Feedly filter

It will allow you to mark as read articles that match a banned list of words.

```javascript
javascript:(function(){
var avoid = "Star Wars, Justin Bieber";
var script=document.createElement('script');
script.type='text/javascript';
script.src='https://rawgit.com/Shuunen/snippets/master/bookmarklets/feedly-filter.js';
document.body.appendChild(script);})()
```

