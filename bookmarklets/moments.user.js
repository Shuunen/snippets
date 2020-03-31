/* global iziToast, AudioContext */

/* eslint-disable func-names, no-async-promise-executor */

var api = 'http://192.168.31.227:5001/webapi/entry.cgi?'
var headers = {
  'x-syno-token': 'XXX', // <=== PUT TOKEN HERE
}
var body = ''
var unidentifiedColor = 'red'
var identifiedColor = 'green'
var identifierColor = 'darkorange'
var errorDetected = false
var autoMode = true
var clickedOnAvailableTag = false
var allowNoTag = true

var frequencyMin = 120
var frequencyMax = 760
var frequency = (frequencyMin + frequencyMax) / 2
var frequencyIncrement = 100

function errorSound () {
  errorDetected = true
  document.title = 'ACTION NEEDED'
  var context = new AudioContext()
  var o = context.createOscillator()
  var g = context.createGain()
  o.type = 'sine'
  o.connect(g)
  o.frequency.value = frequency
  frequency += frequencyIncrement
  if (frequency > frequencyMax) {
    frequency = frequencyMin
  }
  g.connect(context.destination)
  o.start(0)
  g.gain.exponentialRampToValueAtTime(0.00001, context.currentTime + 1)
}

// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds. If `immediate` is passed, trigger the function on the
// leading edge, instead of the trailing.
function debounce (func, wait, immediate) {
  var timeout
  return function () {
    var context = this
    var args = arguments
    var later = function () {
      timeout = null
      if (!immediate) func.apply(context, args)
    }
    var callNow = immediate && !timeout
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    if (callNow) func.apply(context, args)
  }
}

function openPanel () {
  if (document.querySelector('.synophoto-lightbox-bottom-info-panel')) {
    document.querySelector('.synophoto-lightbox-toolbar-right-button[title="Information"]').click()
    console.log('panel now opened, will start check')
  } else {
    console.log('panel already opened, will start check')
  }
  removeVisuallyAddedTags()
  setTimeout(check, 1000)
}

function removeUseless () {
  document.querySelector('.synophoto-lightbox-info-close').remove()
  document.querySelector('.synophoto-lightbox-info-section-header').remove()
}

function getCleanName (name) {
  return (name + '').split('(')[0].trim()
}

async function check () {
  console.log('checking...')
  var photoId = getPhotoId()
  var tags = getPhotoTags()
  var names = document.querySelectorAll('.synophoto-lightbox-people-item')
  document.title = 'working...'
  errorDetected = false
  clickedOnAvailableTag = false
  await names.forEach(async (name) => {
    if (!name.title || !name.title.length) {
      markAsUnidentified(name)
      document.title = 'IDENTIFICATION NEEDED'
      errorDetected = true
      console.error('unidentified person')
    } else {
      markAsIdentified(name)
      var cleanName = getCleanName(name.title)
      if (cleanName.length) {
        if (!tags.includes(cleanName)) {
          var status = await addTagByName(cleanName, photoId)
          if (status !== 'success') {
            error('failed at adding tag by name')
          }
        } else {
          console.info('"' + cleanName + '" already in tags')
        }
      } else {
        console.info('no clean name for "' + name.title + '", skipping tag...')
      }
    }
  })
  tags = getPhotoTags()
  var nbUnidentified = document.querySelectorAll('.abm-unidentified').length
  if (tags.length === 0) {
    if (allowNoTag && nbUnidentified === 0) {
      console.info('no one unidentified & no tags allowed, continues...')
    } else {
      error('no tags after processing', true)
    }
  } else if (nbUnidentified === 1) {
    console.log('there is only one unidentified person')
    return tryToAssociateOne()
  } else {
    console.log(tags.length, 'tags after processing')
  }
  if (autoMode && errorDetected === false) {
    gotoNextPhoto()
    // setTimeout(check, 500) // no need cause dom tree injection watched
  }
}
// prepare a debounced function
var checkDebounced = debounce(check, 500)

function tryToAssociateOne () {
  removeVisuallyAddedTags()
  var tags = getPhotoTags()
  var persons = Array.from(document.querySelectorAll('.synophoto-lightbox-people-item')).map(node => getCleanName(node.title))
  var one = tags.filter(tag => !persons.includes(tag))
  if (one.length === 1) {
    var availableTag = availableTags.find(tag => tag.name === one[0])
    if (availableTag) {
      onAvailableTagClick(availableTag)
    } else {
      error('failed at finding tag for the only unidentified person')
    }
    /*
    var status = await addTagByName(tags[0])
    if (status === 'success') {
        return check()
     } else {
       error('failed at adding the only tag to the only unidentified person')
     }
     */
  } else {
    error('failed at finding the good tag for the only unidentified person')
  }
}

function removeRetryToast () {
  var toast = document.querySelector('#abm-retry')
  if (toast) {
    iziToast.hide({}, toast)
  }
}

function gotoNextPhoto () {
  removeRetryToast()
  removeVisuallyAddedTags()
  document.querySelector('.synophoto-lightbox-nav-icon-button.align-right').click()
}
// prepare a debounced function
var gotoNextPhotoDebounced = debounce(gotoNextPhoto, 500)

function markAsIdentified (el) {
  markAs(el, true)
}

function markAsUnidentified (el) {
  markAs(el, false)
}

function markAs (el, identified) {
  el.style.backgroundColor = identified ? identifiedColor : unidentifiedColor
  el.style.padding = '10px'
  el.style.borderRadius = '50% 0'
  if (identified) {
    el.classList.remove('abm-unidentified')
  } else {
    el.classList.add('abm-unidentified')
  }
}

function addTagByName (name, photoId) {
  if (!photoId) {
    photoId = getPhotoId()
  }
  if (name.includes('http')) {
    console.error(name)
    return error('bad name detected (addTagByName)')
  }
  console.info('adding tag "' + name + '" to current photo')
  var availableTag = availableTags.find(tag => tag.name === name)
  if (availableTag) {
    return addTagToPhoto(availableTag.id, photoId)
  } else {
    return createNewTag(name).then(response => {
      if (response.success) {
        var newTag = response.data.tag
        console.info('new tag created for "' + newTag.name + '", has id', newTag.id)
        availableTags.push(newTag)
        updateAvailableTagsList()
        return addTagToPhoto(newTag.id, photoId)
      } else {
        return error('failed at creating new tag')
      }
    })
  }
}

function removeVisuallyAddedTags () {
  console.log('removeVisuallyAddedTags')
  var tags = document.querySelectorAll('.abm-visual-tag')
  tags.forEach(tag => tag.remove())
}

function addTagVisuallyToPhotoTags (tagId) {
  var tag = availableTags.find(tag => tag.id === tagId)
  var el = document.createElement('div')
  el.classList.add('Select-value', 'abm-visual-tag')
  el.style.padding = 0
  el.innerHTML = `<a class="Select-value-label" style="padding: 0 16px;">${tag.name}</a>`
  document.querySelector('.synophoto-general-tag .Select-multi-value-wrapper').prepend(el)
}

function addTagToPhoto (tagId, photoId) {
  if (!photoId) {
    photoId = getPhotoId()
  }
  console.info('adding tag', tagId, 'to photo', photoId)
  body = `id=%5B${photoId}%5D&tag=%5B${tagId}%5D&api=%22SYNO.Photo.Browse.Item%22&method=%22add_tag%22&version=1`
  return post(body).then(response => {
    if (response.success) {
      console.info('adding tag success')
      addTagVisuallyToPhotoTags(tagId)
      checkDebounced()
      return 'success'
    } else {
      return error('failed at adding tag')
    }
  })
}

function createNewTag (name) {
  console.info('creating new tag with name "' + name + '"')
  body = `name=%22${encodeURI(name)}%22&api=%22SYNO.Photo.Browse.GeneralTag%22&method=%22create%22&version=1`
  return post(body)
}

function showAutoModeSwitcher () {
  if (!iziToast) {
    return error('iziToast is required to show switcher', true)
  }
  if (document.querySelector('#abm-switch')) {
    return
  }
  iziToast.info({
    closeOnClick: true,
    id: 'abm-switch',
    message: `Click here to ${autoMode ? 'stop' : 'start'} automatic mode`,
    timeout: false,
    onClosing: function () {
      autoMode = !autoMode
      setTimeout(showAutoModeSwitcher, 3000)
    },
  })
}

function error (message, avoidRejection) {
  errorSound()
  console.error(message)
  if (iziToast) {
    iziToast.error({
      message,
      id: 'abm-retry',
      timeout: false,
      toastOnce: true,
      buttons: [
        ['<button>retry</button>', function (instance, toast) {
          console.log('clicked on retry...')
          if (!clickedOnAvailableTag) {
            // seems like user manually typed a new tag
            getAvailableTags().then(() => check())
          } else {
            check()
          }
          instance.hide({
            transitionOut: 'fadeOut',
          }, toast, 'button')
        }, true],
      ],
    })
  }
  if (avoidRejection) {
    return message
  }
  return Promise.reject(message)
}

function merge (from, to, el) {
  if (!from || typeof from !== 'number') {
    return error('"from" should be a number')
  }
  if (!to || typeof to !== 'number') {
    return error('"to" should be a number')
  }
  if (!el || typeof el.tagName !== 'string') {
    return error('"el" should be a dom element')
  }
  console.info('merging person', from, 'to', to)
  body = `target_id=${to}&merged_id=%5B${from}%5D&api=%22SYNO.Photo.Browse.Person%22&method=%22merge%22&version=1`
  return post(body).then(response => {
    if (response.success) {
      console.info('merge successful')
      markAsIdentified(el)
      return 'success'
    } else {
      return error('failed at merging')
    }
  })
}

function post (body) {
  return window.fetch(api, {
    body,
    method: 'POST',
    credentials: 'same-origin',
    headers,
  }).then(response => response.json())
}

var availableTags = []

async function getAvailableTags () {
  console.log('getting available tags...')
  body = 'limit=300&offset=0&api=%22SYNO.Photo.Browse.GeneralTag%22&method=%22list%22&version=1'
  return post(body).then(response => {
    if (response.success) {
      console.log('got tags', response.data.list)
      availableTags = response.data.list
      updateAvailableTagsList()
      return 'success'
    } else {
      return error('failed at getting available tags')
    }
  })
}
getAvailableTags()

function updateAvailableTagsList (tryTime) {
  if (!tryTime) {
    tryTime = 1
  }
  console.log('in updateAvailableTagsList, try n°', tryTime)
  var infoPanel = document.querySelector('.synophoto-lightbox-info-panel')
  if (!infoPanel) {
    if (tryTime < 10) {
      setTimeout(() => updateAvailableTagsList(++tryTime), 400)
    }
    return
  }
  // first sort by name
  availableTags = availableTags.sort((a, b) => a.name.localeCompare(b.name))
  // then create the tag list that will be displayed
  var tagListContent = '<div class="Select--multi">'
  var lastLetter = ''
  tagListContent += availableTags.map(tag => {
    // dont display un-popular tags
    if (tag.item_count < 2) {
      return ''
    }
    var html = ''
    var letter = tag.name.toLowerCase()[0]
    if (letter !== lastLetter) {
      lastLetter = letter
      html += `<strong style="width: 100%; display: block; font-weight: bold; font-size: 24px;">${letter.toUpperCase()}</strong>`
    }
    var style = getStyleForTagName(tag.name)
    html += `<div class="Select-value ${style ? 'abm-custom-background' : ''}" ${style}><a class="Select-value-label abm-tag" style="padding: 0 16px;">${tag.name}</a></div>`
    return html
  })
  tagListContent = tagListContent.replace(/,+/g, '')
  tagListContent += '</div>'
  var tagList = document.querySelector('.abm-taglist')
  if (!tagList) {
    tagList = document.createElement('div')
    tagList.style = 'height: 52%; overflow: auto; box-shadow: inset -4px 0px 20px black; padding: 11px 14px;'
    tagList.classList.add('abm-taglist', 'synophoto-lightbox-info-section', 'synophoto-general-tag', 'synophoto-react-select', 'synophoto-lightbox-tag-panel')
    infoPanel.appendChild(tagList)
    document.querySelector('.synophoto-lightbox-info-panel').style.width = '500px'
  }
  tagList.innerHTML = tagListContent
}

function getBackgroundForTagName (name) {
  var isBlue = name.includes('Racamier-Lafon') || name.includes('guy')
  var isRed = name.includes('Juliane') || name.includes('girl')
  if (isBlue) {
    return 'royalblue'
  } else if (isRed) {
    return 'palevioletred'
  } else {
    return ''
  }
}

function getStyleForTagName (name) {
  var background = getBackgroundForTagName(name)
  if (background === '') {
    return 'style="padding: 0;"'
  }
  return `style="background-color: ${background}; padding: 0;"`
}

function getFirstUnidentified () {
  return document.querySelector('.synophoto-lightbox-people-item.abm-unidentified')
}

function getPhotoTags () {
  var els = document.querySelectorAll('.Select-control a.Select-value-label')
  var tags = Array.from(els).map(el => el.text.trim())
  return tags
}

function watchTags () {
  var els = document.querySelectorAll('a.Select-value-label:not(.abm-watched)')
  if (els.length) {
    els.forEach(el => {
      el.classList.add('abm-watched')
      el.addEventListener('mousedown', onTagClick)
      el.addEventListener('mouseenter', onTagEnter)
      el.addEventListener('mouseout', onTagOut)
    })
  }
}
setInterval(watchTags, 500)

var personsByTag = []

function getPersonByTag (tag) {
  var personByTag = personsByTag.find(person => person.tagId === tag.id)
  if (personByTag) {
    console.log('found "' + tag.name + '" in cache')
    return Promise.resolve(personByTag)
  } else {
    console.log('did not found "' + tag.name + '" in cache, fetching api...')
  }
  // body = `name_prefix=%22${encodeURI(tag.name)}%22&additional=%5B%22thumbnail%22%5D&api=%22SYNO.Photo.Browse.Person%22&method=%22suggest%22&version=1`
  body = `name_prefix=%22${encodeURI(tag.name)}%22&api=%22SYNO.Photo.Browse.Person%22&method=%22suggest%22&version=1`
  return post(body).then(response => {
    if (response.success) {
      var persons = response.data.list
      console.log('got persons', persons)
      if (persons.length === 1) {
        personByTag = persons[0]
        personsByTag.push(personByTag)
        return personByTag
      } else if (persons.length === 0) {
        return Promise.reject(new Error('this person does not exists yet')) // NOT error() cause we dont want to break auto processing
      } else {
        return error('failed at getting person by name : too much persons found with that name')
      }
    } else {
      return error('failed at getting person by name')
    }
  })
}

async function onTagClick (event) {
  event.preventDefault()
  event.stopPropagation()
  var name = event.target.textContent.trim()
  var availableTag = availableTags.find(tag => tag.name === name)
  if (availableTag) {
    onAvailableTagClick(availableTag)
  } else {
    console.log('seems like a newly added tag, refreshing available tag list...')
    await getAvailableTags()
    availableTag = availableTags.find(tag => tag.name === name)
    if (availableTag) {
      onAvailableTagClick(availableTag)
    } else {
      error('clicked on tag "' + name + '" but not found in available tags')
    }
  }
}

function createPerson (id, name) {
  if (!id || typeof id !== 'number') {
    return error('"id" should be a number')
  }
  body = `id=${id}&name=%22${encodeURI(name)}%22&api=%22SYNO.Photo.Browse.Person%22&method=%22set%22&version=1`
  return post(body).then(response => {
    if (response.success) {
      return 'success'
    } else {
      return error('failed at creating a new person')
    }
  })
}

async function onAvailableTagClick (availableTag) {
  clickedOnAvailableTag = true
  console.log('clicked on availableTag "' + availableTag.name + '" with id', availableTag.id)
  if (availableTag.name.includes('http')) {
    console.error(availableTag.name)
    return error('bad name detected (onAvailableTagClick)')
  }
  var unidentified = getFirstUnidentified()
  if (!unidentified) {
    console.log('clicking on a tag without un-identified person, simply adding tag to picture')
    return addTagToPhoto(availableTag.id)
  }
  var fromPersonId = parseInt(unidentified.href.match(/person\/(\d+)/)[1])
  if (!fromPersonId || typeof fromPersonId !== 'number') {
    return error('"fromPersonId" should be a number')
  }
  getPersonByTag(availableTag)
    .then(person => {
      var toPersonId = person.id
      merge(fromPersonId, toPersonId, unidentified).then(status => {
        if (status === 'success') {
          unidentified.title = availableTag.name
          errorDetected = false
          console.log('merge has been successful, restarting check')
          setTimeout(check, 300)
        }
      })
    })
    .catch(reason => {
      if (reason.includes('not exists')) {
        createPerson(fromPersonId, availableTag.name).then(status => {
          if (status === 'success') {
            console.log('person "' + availableTag.name + '" has been created to match the tag, restarting check')
            unidentified.title = availableTag.name
            errorDetected = false
            setTimeout(check, 300)
          }
        })
      }
    })
}

function onTagEnter (event) {
  event.target.parentElement.style.backgroundColor = identifierColor
  var unidentified = getFirstUnidentified()
  if (unidentified) {
    unidentified.style.backgroundColor = identifierColor
  }
}

function onTagOut (event) {
  event.target.parentElement.style.backgroundColor = getBackgroundForTagName(event.target.text)
  var unidentified = getFirstUnidentified()
  if (unidentified) {
    unidentified.style.backgroundColor = unidentifiedColor
  }
}

function getPhotoId () {
  var matches = document.location.hash.match(/\d+/g)
  var match = null
  if (matches.length === 1) {
    match = matches[0]
  } else {
    match = matches[1]
  }
  return parseInt(match)
}

var lastPhotoLoaded = 1

function onNewPhotoLoaded () {
  var photoId = getPhotoId()
  if (photoId === lastPhotoLoaded) {
    console.info('same photo id, skipping...')
    return
  }
  lastPhotoLoaded = photoId
  console.log('new photo loaded')
  removeVisuallyAddedTags()
  if (document.querySelector('.synophoto-lightbox-image.synophoto-item-image-broken-large, .vjs-error-display')) {
    console.log('photo not displayed, skipping...')
    gotoNextPhotoDebounced()
  } else {
    console.log('photo displayed, will check')
    checkDebounced()
  }
}
// prepare a debounced function
var onNewPhotoLoadedDebounced = debounce(onNewPhotoLoaded, 500)

function watchForNewPhoto () {
  getEl('lightbox-image').then(el => el.addEventListener('DOMSubtreeModified', onNewPhotoLoadedDebounced))
}

function clearVisualTagsOnOverlayClick () {
  getEl('lightbox-overlay').then(el => el.addEventListener('mousedown', removeVisuallyAddedTags))
}

function start () {
  openPanel()
  getAvailableTags()
  removeUseless()
  watchForNewPhoto()
  showAutoModeSwitcher()
  clearVisualTagsOnOverlayClick()
}

function getEl (type) {
  var sel = null
  var txt = null
  var ele = null
  if (type === 'tree-dots') {
    sel = '.synophoto-menu-button > .synophoto-actionbar-action-button'
  } else if (type === 'modify-tags') {
    sel = '.synophoto-menu-modal[style*="44px"] .synophoto-modal-content > div > .synophoto-text-button:nth-child(2)'
    txt = 'Modifier les tags'
  } else if (type === 'show-hide-persons') {
    sel = '.synophoto-menu-modal[style*="44px"] .synophoto-modal-content > div > .synophoto-text-button:nth-child(1)'
    txt = 'Afficher/masquer des personnes'
  } else if (type === 'lightbox-overlay') {
    sel = '.synophoto-lightbox-overlays'
  } else if (type === 'lightbox-image') {
    sel = '.synophoto-lightbox-image-panel'
  } else if (type === 'person-name') {
    sel = '.synophoto-person-name-menu-button'
  } else if (type === 'timeline') {
    sel = '.synophoto-timeline.synophoto-list-scroll'
  } else if (type === 'person-bubble') {
    sel = '.synophoto-icon-button-person-overlay.synophoto-icon-button-person-overlay.synophoto-selectable-checkbox:not(.abm-inverted)'
  }
  if (!sel) {
    return error('un-handled el type "' + type + '"')
  }
  ele = document.querySelector(sel)
  if (!ele) {
    return error('failed to find "' + type + '" el in dom')
  }
  if (txt && ele.textContent !== txt) {
    return error('el text did not matched "' + type + '" el')
  }
  return Promise.resolve(ele)
}

function clickEl (el, time) {
  return new Promise((resolve, reject) => {
    if (!el) {
      reject(error('cannot click on null', true))
    }
    el.click()
    setTimeout(() => resolve('success, clicked'), time || 200)
  })
}

function scrollToEl (el, time) {
  return new Promise((resolve, reject) => {
    if (!el) {
      reject(error('cannot scroll on null', true))
    }
    el.scrollIntoViewIfNeeded()
    setTimeout(() => resolve('success, scrolled to that element'), time || 300)
  })
}

async function checkAllAvailable (checkboxes) {
  return new Promise(async (resolve) => {
    var fresh = false
    if (!checkboxes) {
      checkboxes = await getUncheckedCheckboxes()
      fresh = true
    }
    if (!fresh && !checkboxes.length) {
      checkboxes = await getUncheckedCheckboxes()
    }
    if (!checkboxes.length) {
      resolve('success, no more checkboxes to process')
    } else {
      var checkbox = checkboxes.shift()
      var status = await scrollToEl(checkbox)
      console.log(status, '(checkbox)')
      status = await clickEl(checkbox)
      console.log(status)
      status = await scrollToLastChecked()
      console.log(status, '(last checked photo)')
      resolve(checkAllAvailable(checkboxes))
    }
  })
}

async function scrollToLastChecked (previous) {
  return new Promise(async (resolve, reject) => {
    var lastPhotosChecked = document.querySelectorAll('.synophoto-selectable-overlay.checked:last-child')
    var lastPhotoChecked = lastPhotosChecked[lastPhotosChecked.length - 1]
    if (lastPhotoChecked) {
      if (lastPhotoChecked === previous) {
        setTimeout(() => resolve('success, scrolled to last checked'), 100)
      } else {
        var status = await scrollToEl(lastPhotoChecked)
        console.log(status, '(last checked photo)')
        setTimeout(() => resolve(scrollToLastChecked(lastPhotoChecked)), 200)
      }
    } else {
      reject(error('failed at finding last photo', true))
    }
  })
}

function getUncheckedCheckboxes () {
  return new Promise(async resolve => {
    var sel = '.synophoto-selectable-timeline-header > .synophoto-selectable-overlay:not(.checked) .button-icon.checkbox-btn-icon'
    var checkboxes = Array.from(document.querySelectorAll(sel))
    console.log('found', checkboxes.length, 'checkboxes')
    resolve(checkboxes)
  })
}

async function autotag () {
  var personName = await getEl('person-name').then(el => el.textContent)
  console.log('got personName', personName)
  var cleanName = getCleanName(personName)
  console.log('got cleanName', cleanName)
  var status = await checkAllAvailable()
  console.log(status)
  await getEl('tree-dots').then(el => clickEl(el))
  await getEl('modify-tags').then(el => clickEl(el))
  errorSound()
  window.prompt('Person name', cleanName)
  document.title = 'auto tag finished'
}

async function invertNextBubble () {
  var bubble = await getEl('person-bubble')
  if (!bubble || !bubble.classList) {
    return error('failed at getting next bubble element')
  }
  await clickEl(bubble, 100)
  bubble.classList.add('abm-inverted')
  await scrollToEl(bubble, 100)
  return Promise.resolve('success')
}

async function invertSelection () {
  // await getEl('tree-dots').then(el => clickEl(el))
  // await getEl('show-hide-persons').then(el => clickEl(el))
  var status = 'success'
  while (status === 'success') {
    status = await invertNextBubble()
  }
  console.log('inverted selection !')
}

var btnStart = document.createElement('button') // Create a <button> element
var tStart = document.createTextNode('Start ABM') // Create a text node
btnStart.appendChild(tStart) // Append the text to <button>
btnStart.addEventListener('click', start)
btnStart.style = 'position: absolute; background-color: sienna; width:130px; top: 70px; left: 20px; color: white; display: block; font-size: 12px; z-index: 10000; border-width: 8px; padding: 6px 10px; border-radius: 14px 0; border-style: groove; border-color: antiquewhite; cursor: pointer;'
document.body.appendChild(btnStart)

var btnAutoTag = document.createElement('button') // Create a <button> element
var tAutoTag = document.createTextNode('Tag this person') // Create a text node
btnAutoTag.appendChild(tAutoTag) // Append the text to <button>
btnAutoTag.addEventListener('click', autotag)
btnAutoTag.style = 'position: absolute; background-color: sienna; width:130px; top: 120px; left: 20px; color: white; display: block; font-size: 12px; z-index: 10000; border-width: 8px; padding: 6px 10px; border-radius: 0; border-style: groove; border-color: antiquewhite; cursor: pointer;'
document.body.appendChild(btnAutoTag)

var btnInvertSel = document.createElement('button') // Create a <button> element
var tInvertSel = document.createTextNode('Invert selection') // Create a text node
btnInvertSel.appendChild(tInvertSel) // Append the text to <button>
btnInvertSel.addEventListener('click', invertSelection)
btnInvertSel.style = 'position: absolute; background-color: sienna; width:130px; top: 170px; left: 20px; color: white; display: block; font-size: 12px; z-index: 10000; border-width: 8px; padding: 6px 10px; border-radius: 0 14px; border-style: groove; border-color: antiquewhite; cursor: pointer;'
document.body.appendChild(btnInvertSel)

// addCSS('https://cdnjs.cloudflare.com/ajax/libs/izitoast/1.3.0/css/iziToast.min.css')
// addScript('https://cdnjs.cloudflare.com/ajax/libs/izitoast/1.3.0/js/iziToast.min.js')
