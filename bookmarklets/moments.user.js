/* var names = document.querySelectorAll('.synophoto-person-name-menu-button-album')
var name = names[0]
console.log(name) */

var api = 'https://192.168.31.227:5001/webapi/entry.cgi?'
var headers = {
  'x-syno-token': 'XXX' // <=== PUT TOKEN HERE
}
var body = ''

function soundNotification(stop) {
  var context = new AudioContext()
  o = context.createOscillator()
  g = context.createGain()
  o.type = 'sine'
  o.connect(g)
  o.frequency.value = 440
  g.connect(context.destination)
  o.start(0)
  g.gain.exponentialRampToValueAtTime(0.00001, context.currentTime + 1)
  if (!stop) {
    setTimeout(() => soundNotification(true), 150)
  }
}

function openPanel() {
  if (document.querySelector('.synophoto-lightbox-bottom-info-panel')) {
    document.querySelector('.synophoto-lightbox-toolbar-right-button[title="Information"]').click()
    setTimeout(check, 1000)
  }
  check()
}

async function check() {
  var tags = getTags()
  var names = document.querySelectorAll('.synophoto-lightbox-people-item')
  var allGood = true
  await names.forEach(async (name) => {
    if (!name.title || !name.title.length) {
      name.style.backgroundColor = 'red'
      name.style.padding = '10px'
      allGood = false
    } else {
      var cleanName = name.title.split('(')[0].trim()
      if (cleanName.length) {
        if (!tags.includes(cleanName)) {
          await addTagByName(cleanName)
        } else {
          console.info('"' + name.title + '" already in tags')
        }
      } else {
        console.info('no clean name for "' + name.title + '", skipping tag...')
      }
    }
  })
  return
  if (allGood) {
    document.querySelector('.synophoto-lightbox-nav-icon-button.align-right').click()
    setTimeout(check, 500)
  } else {
    console.warn('ouch un-identified person detected :)')
    soundNotification()
  }
}

function addTagByName(name) {
  console.info('adding tag "' + name + '" to current photo')
  var availableTag = availableTags.find(tag => tag.name === name)
  if (availableTag) {
    return addTagById(availableTag.id)
  } else {
    return createNewTag(name).then(response => {
      if (response.success) {
        var newTag = response.data.tag
        console.info('new tag created for "' + newTag.name + '", has id', newTag.id)
        availableTags.push(newTag)
        return addTagById(newTag.id)
      } else {
        console.error('failed at creating new tag')
      }
    })
  }

}

function addTagById(id) {
  var photoId = getPhotoId()
  console.info('adding tag', id, 'to photo', photoId)
  body = `id=%5B${photoId}%5D&tag=%5B${id}%5D&api=%22SYNO.Photo.Browse.Item%22&method=%22add_tag%22&version=1`
  return post(body)
}

function createNewTag(name) {
  console.info('creating new tag with name "' + name + '"')
  body = `name=%22${encodeURI(name)}%22&api=%22SYNO.Photo.Browse.GeneralTag%22&method=%22create%22&version=1`
  return post(body)
}

function merge(from, to) {
  body = `target_id=${to}&merged_id=%5B${from}%5D&api=%22SYNO.Photo.Browse.Person%22&method=%22merge%22&version=1`
  return post(body)
}

function post(body) {
  return fetch(api, {
    body,
    method: 'POST',
    credentials: 'same-origin',
    headers
  }).then(response => response.json())
}

function triggerChange(el) {
  el.dispatchEvent(new KeyboardEvent('change'))
  el.dispatchEvent(new Event('input', {
    bubbles: true,
    cancelable: true
  }))
}

function triggerEnter2(el) {
  el.dispatchEvent(new KeyboardEvent('keyup', {
    key: 'Enter',
    bubbles: true,
    cancelable: true
  }))
}

function triggerEnter(el) {
  var e = new Event("keydown");
  // e.key="a";    // just enter the char you want to send 
  // e.keyCode=e.key.charCodeAt(0);
  // key Enter = charCode 13
  e.keyCode = 13
  e.which = e.keyCode;
  e.bubbles = true;
  el.dispatchEvent(e);
}

function triggerClick(el) {
  // Create our event (with options)
  var evt = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    view: window
  });
  // If cancelled, don't dispatch our event
  var canceled = !el.dispatchEvent(evt);
}

var availableTags = []

function getAvailableTags() {
  body = `limit=100&offset=0&api=%22SYNO.Photo.Browse.GeneralTag%22&method=%22list%22&version=1`
  return post(body).then(response => {
    if (response.success) {
      console.log('got tags', response.data.list)
      availableTags = response.data.list
    } else {
      console.error('failed at getting available tags')
    }
  })
}
getAvailableTags()

function getTags() {
  return Array.from(document.querySelectorAll('a.Select-value-label')).map(el => el.text.trim())
}

function getPhotoId() {
  return document.location.hash.match(/\d+/)[0]
}

function start() {
  openPanel()
}

// setInterval(check, 500)
setTimeout(start, 1000)