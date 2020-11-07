const request = require('request')
const cheerio = require('cheerio')

function scrap (url, argument) {
  request(url, function onRequest (error, response, body) {
    if (!error && response.statusCode === 200) {
      /*
       // save html content to file
       fs.writeFile('page.html', body, function (err) {
       if (!err) {
       console.log('The file was saved!');
       } else {
       console.error(err);
       }
       });
       */

      // extract data
      let result = ''
      if (typeof argument === 'string') {
        const $ = cheerio.load(body)
        result = $(argument).text()
      } else if (typeof argument === 'function') {
        result = argument(body)
      }

      // log to console
      console.log(result)
    } else {
      console.error('cannot fetch url')
    }
  })
}

function getGgTrafficTime (body) {
  let result = ''

  const minutesMatches = body.match(/traffic.+?\d+\smin.+?(\d+)\smin/) // TODO : handle hours
  if (minutesMatches) {
    if (minutesMatches[1]) {
      result = minutesMatches[1] + ' minutes'
    } else {
      console.error('only global minutesMatch :', minutesMatches[0])
    }
  } else {
    console.error('no minutesMatches at all')
  }

  let kilometers
  const kilometerMatches = body.match(/traffic.+?(\d+(,\d+)?)\skm/)
  if (kilometerMatches) {
    if (kilometerMatches[1]) {
      kilometers = kilometerMatches[1]
    } else {
      console.error('only global kilometerMatch :', kilometerMatches[0])
    }
  } else {
    console.error('no kilometerMatches at all')
  }

  if (kilometers !== '17,1') {
    console.error(kilometers + ' kilometers does not match to the usual road !')
  }

  return result
}

// scrap('https://www.kernel.org/', '#latest_link a');
scrap('https://www.google.fr/maps/dir/48.1167101,-1.5934134/48.1326646,-1.6832573/', getGgTrafficTime)
