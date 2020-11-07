/* global iziToast, AudioContext */

/* eslint-disable func-names, no-async-promise-executor */

const api = 'http://192.168.31.227:5001/webapi/entry.cgi?'
const headers = {
  'x-syno-token': 'XXX', // <=== PUT TOKEN HERE
}
let body = ''
const unidentifiedColor = 'red'
const identifiedColor = 'green'
const identifierColor = 'darkorange'
let errorDetected = false
let autoMode = true
let clickedOnAvailableTag = false
const allowNoTag = true

const frequencyMin = 120
const frequencyMax = 760
let frequency = (frequencyMin + frequencyMax) / 2
const frequencyIncrement = 100

function errorSound () {
  errorDetected = true
  document.title = 'ACTION NEEDED'
  const context = new AudioContext()
  const o = context.createOscillator()
  const g = context.createGain()
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
function debounce (callback, wait, immediate) {
  let timeout
  return function () {
    const context = this
    const arguments_ = arguments
    const later = function () {
      timeout = undefined
      if (!immediate) callback.apply(context, arguments_)
    }
    const callNow = immediate && !timeout
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    if (callNow) callback.apply(context, arguments_)
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
  const photoId = getPhotoId()
  let tags = getPhotoTags()
  const names = document.querySelectorAll('.synophoto-lightbox-people-item')
  document.title = 'working...'
  errorDetected = false
  clickedOnAvailableTag = false
  await names.forEach(async (name) => {
    if (!name.title || name.title.length === 0) {
      markAsUnidentified(name)
      document.title = 'IDENTIFICATION NEEDED'
      errorDetected = true
      console.error('unidentified person')
    } else {
      markAsIdentified(name)
      const cleanName = getCleanName(name.title)
      if (cleanName.length > 0) {
        if (!tags.includes(cleanName)) {
          const status = await addTagByName(cleanName, photoId)
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
  const nbUnidentified = document.querySelectorAll('.abm-unidentified').length
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
const checkDebounced = debounce(check, 500)

function tryToAssociateOne () {
  removeVisuallyAddedTags()
  const tags = getPhotoTags()
  const persons = new Set([...document.querySelectorAll('.synophoto-lightbox-people-item')].map(node => getCleanName(node.title)))
  const one = tags.filter(tag => !persons.has(tag))
  if (one.length === 1) {
    const availableTag = availableTags.find(tag => tag.name === one[0])
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
  const toast = document.querySelector('#abm-retry')
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
const gotoNextPhotoDebounced = debounce(gotoNextPhoto, 500)

function markAsIdentified (element) {
  markAs(element, true)
}

function markAsUnidentified (element) {
  markAs(element, false)
}

function markAs (element, identified) {
  element.style.backgroundColor = identified ? identifiedColor : unidentifiedColor
  element.style.padding = '10px'
  element.style.borderRadius = '50% 0'
  if (identified) {
    element.classList.remove('abm-unidentified')
  } else {
    element.classList.add('abm-unidentified')
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
  const availableTag = availableTags.find(tag => tag.name === name)
  if (availableTag) return addTagToPhoto(availableTag.id, photoId)
  return createNewTag(name).then(response => {
    if (response.success) {
      const newTag = response.data.tag
      console.info('new tag created for "' + newTag.name + '", has id', newTag.id)
      availableTags.push(newTag)
      updateAvailableTagsList()
      return addTagToPhoto(newTag.id, photoId)
    } else {
      return error('failed at creating new tag')
    }
  })
}

function removeVisuallyAddedTags () {
  console.log('removeVisuallyAddedTags')
  const tags = document.querySelectorAll('.abm-visual-tag')
  tags.forEach(tag => tag.remove())
}

function addTagVisuallyToPhotoTags (tagId) {
  const tag = availableTags.find(tag => tag.id === tagId)
  const element = document.createElement('div')
  element.classList.add('Select-value', 'abm-visual-tag')
  element.style.padding = 0
  element.innerHTML = `<a class="Select-value-label" style="padding: 0 16px;">${tag.name}</a>`
  document.querySelector('.synophoto-general-tag .Select-multi-value-wrapper').prepend(element)
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

function merge (from, to, element) {
  if (!from || typeof from !== 'number') {
    return error('"from" should be a number')
  }
  if (!to || typeof to !== 'number') {
    return error('"to" should be a number')
  }
  if (!element || typeof element.tagName !== 'string') {
    return error('"el" should be a dom element')
  }
  console.info('merging person', from, 'to', to)
  body = `target_id=${to}&merged_id=%5B${from}%5D&api=%22SYNO.Photo.Browse.Person%22&method=%22merge%22&version=1`
  return post(body).then(response => {
    if (response.success) {
      console.info('merge successful')
      markAsIdentified(element)
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

let availableTags = []

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
  const infoPanel = document.querySelector('.synophoto-lightbox-info-panel')
  if (!infoPanel) {
    if (tryTime < 10) {
      setTimeout(() => updateAvailableTagsList(++tryTime), 400)
    }
    return
  }
  // first sort by name
  availableTags = availableTags.sort((a, b) => a.name.localeCompare(b.name))
  // then create the tag list that will be displayed
  let tagListContent = '<div class="Select--multi">'
  let lastLetter = ''
  tagListContent += availableTags.map(tag => {
    // dont display un-popular tags
    if (tag.item_count < 2) {
      return ''
    }
    let html = ''
    const letter = tag.name.toLowerCase()[0]
    if (letter !== lastLetter) {
      lastLetter = letter
      html += `<strong style="width: 100%; display: block; font-weight: bold; font-size: 24px;">${letter.toUpperCase()}</strong>`
    }
    const style = getStyleForTagName(tag.name)
    html += `<div class="Select-value ${style ? 'abm-custom-background' : ''}" ${style}><a class="Select-value-label abm-tag" style="padding: 0 16px;">${tag.name}</a></div>`
    return html
  })
  tagListContent = tagListContent.replace(/,+/g, '')
  tagListContent += '</div>'
  let tagList = document.querySelector('.abm-taglist')
  if (!tagList) {
    tagList = document.createElement('div')
    tagList.style = 'height: 52%; overflow: auto; box-shadow: inset -4px 0px 20px black; padding: 11px 14px;'
    tagList.classList.add('abm-taglist', 'synophoto-lightbox-info-section', 'synophoto-general-tag', 'synophoto-react-select', 'synophoto-lightbox-tag-panel')
    infoPanel.append(tagList)
    document.querySelector('.synophoto-lightbox-info-panel').style.width = '500px'
  }
  tagList.innerHTML = tagListContent
}

function getBackgroundForTagName (name) {
  const isBlue = name.includes('Racamier-Lafon') || name.includes('guy')
  const isRed = name.includes('Juliane') || name.includes('girl')
  if (isBlue) {
    return 'royalblue'
  } else if (isRed) {
    return 'palevioletred'
  } else {
    return ''
  }
}

function getStyleForTagName (name) {
  const background = getBackgroundForTagName(name)
  if (background === '') {
    return 'style="padding: 0;"'
  }
  return `style="background-color: ${background}; padding: 0;"`
}

function getFirstUnidentified () {
  return document.querySelector('.synophoto-lightbox-people-item.abm-unidentified')
}

function getPhotoTags () {
  const els = document.querySelectorAll('.Select-control a.Select-value-label')
  const tags = [...els].map(element => element.text.trim())
  return tags
}

function watchTags () {
  const els = document.querySelectorAll('a.Select-value-label:not(.abm-watched)')
  if (els.length > 0) {
    els.forEach(element => {
      element.classList.add('abm-watched')
      element.addEventListener('mousedown', onTagClick)
      element.addEventListener('mouseenter', onTagEnter)
      element.addEventListener('mouseout', onTagOut)
    })
  }
}
setInterval(watchTags, 500)

const personsByTag = []

function getPersonByTag (tag) {
  let personByTag = personsByTag.find(person => person.tagId === tag.id)
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
      const persons = response.data.list
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
  const name = event.target.textContent.trim()
  let availableTag = availableTags.find(tag => tag.name === name)
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
    return response.success ? 'success' : error('failed at creating a new person')
  })
}

async function onAvailableTagClick (availableTag) {
  clickedOnAvailableTag = true
  console.log('clicked on availableTag "' + availableTag.name + '" with id', availableTag.id)
  if (availableTag.name.includes('http')) {
    console.error(availableTag.name)
    return error('bad name detected (onAvailableTagClick)')
  }
  const unidentified = getFirstUnidentified()
  if (!unidentified) {
    console.log('clicking on a tag without un-identified person, simply adding tag to picture')
    return addTagToPhoto(availableTag.id)
  }
  const fromPersonId = Number.parseInt(unidentified.href.match(/person\/(\d+)/)[1])
  if (!fromPersonId || typeof fromPersonId !== 'number') {
    return error('"fromPersonId" should be a number')
  }
  getPersonByTag(availableTag)
    .then(person => {
      const toPersonId = person.id
      merge(fromPersonId, toPersonId, unidentified).then(status => {
        if (status === 'success') {
          unidentified.title = availableTag.name
          errorDetected = false
          console.log('merge has been successful, restarting check')
          setTimeout(check, 300)
        }
      })
    })
    .catch(error_ => {
      if (error_.includes('not exists')) {
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
  const unidentified = getFirstUnidentified()
  if (unidentified) {
    unidentified.style.backgroundColor = identifierColor
  }
}

function onTagOut (event) {
  event.target.parentElement.style.backgroundColor = getBackgroundForTagName(event.target.text)
  const unidentified = getFirstUnidentified()
  if (unidentified) {
    unidentified.style.backgroundColor = unidentifiedColor
  }
}

function getPhotoId () {
  const matches = document.location.hash.match(/\d+/g)
  const match = matches.length === 1 ? matches[0] : matches[1]
  return Number.parseInt(match)
}

let lastPhotoLoaded = 1

function onNewPhotoLoaded () {
  const photoId = getPhotoId()
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
const onNewPhotoLoadedDebounced = debounce(onNewPhotoLoaded, 500)

function watchForNewPhoto () {
  getElement('lightbox-image').then(element => element.addEventListener('DOMSubtreeModified', onNewPhotoLoadedDebounced))
}

function clearVisualTagsOnOverlayClick () {
  getElement('lightbox-overlay').then(element => element.addEventListener('mousedown', removeVisuallyAddedTags))
}

function start () {
  openPanel()
  getAvailableTags()
  removeUseless()
  watchForNewPhoto()
  showAutoModeSwitcher()
  clearVisualTagsOnOverlayClick()
}

function getElement (type) {
  let sel
  let txt
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
  const ele = document.querySelector(sel)
  if (!ele) {
    return error('failed to find "' + type + '" el in dom')
  }
  if (txt && ele.textContent !== txt) {
    return error('el text did not matched "' + type + '" el')
  }
  return Promise.resolve(ele)
}

function clickElement (element, time) {
  return new Promise((resolve, reject) => {
    if (!element) {
      reject(error('cannot click on null', true))
    }
    element.click()
    setTimeout(() => resolve('success, clicked'), time || 200)
  })
}

function scrollToElement (element, time) {
  return new Promise((resolve, reject) => {
    if (!element) {
      reject(error('cannot scroll on null', true))
    }
    element.scrollIntoViewIfNeeded()
    setTimeout(() => resolve('success, scrolled to that element'), time || 300)
  })
}

async function checkAllAvailable (checkboxes) {
  return new Promise(async (resolve) => {
    let fresh = false
    if (!checkboxes) {
      checkboxes = await getUncheckedCheckboxes()
      fresh = true
    }
    if (!fresh && checkboxes.length === 0) {
      checkboxes = await getUncheckedCheckboxes()
    }
    if (checkboxes.length === 0) {
      resolve('success, no more checkboxes to process')
    } else {
      const checkbox = checkboxes.shift()
      let status = await scrollToElement(checkbox)
      console.log(status, '(checkbox)')
      status = await clickElement(checkbox)
      console.log(status)
      status = await scrollToLastChecked()
      console.log(status, '(last checked photo)')
      resolve(checkAllAvailable(checkboxes))
    }
  })
}

async function scrollToLastChecked (previous) {
  return new Promise(async (resolve, reject) => {
    const lastPhotosChecked = document.querySelectorAll('.synophoto-selectable-overlay.checked:last-child')
    const lastPhotoChecked = lastPhotosChecked[lastPhotosChecked.length - 1]
    if (lastPhotoChecked) {
      if (lastPhotoChecked === previous) {
        setTimeout(() => resolve('success, scrolled to last checked'), 100)
      } else {
        const status = await scrollToElement(lastPhotoChecked)
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
    const sel = '.synophoto-selectable-timeline-header > .synophoto-selectable-overlay:not(.checked) .button-icon.checkbox-btn-icon'
    const checkboxes = [...document.querySelectorAll(sel)]
    console.log('found', checkboxes.length, 'checkboxes')
    resolve(checkboxes)
  })
}

async function autotag () {
  const personName = await getElement('person-name').then(element => element.textContent)
  console.log('got personName', personName)
  const cleanName = getCleanName(personName)
  console.log('got cleanName', cleanName)
  const status = await checkAllAvailable()
  console.log(status)
  await getElement('tree-dots').then(element => clickElement(element))
  await getElement('modify-tags').then(element => clickElement(element))
  errorSound()
  window.prompt('Person name', cleanName)
  document.title = 'auto tag finished'
}

async function invertNextBubble () {
  const bubble = await getElement('person-bubble')
  if (!bubble || !bubble.classList) {
    return error('failed at getting next bubble element')
  }
  await clickElement(bubble, 100)
  bubble.classList.add('abm-inverted')
  await scrollToElement(bubble, 100)
  return Promise.resolve('success')
}

async function invertSelection () {
  // await getEl('tree-dots').then(el => clickEl(el))
  // await getEl('show-hide-persons').then(el => clickEl(el))
  let status = 'success'
  while (status === 'success') {
    status = await invertNextBubble()
  }
  console.log('inverted selection !')
}

const buttonStart = document.createElement('button') // Create a <button> element
const tStart = document.createTextNode('Start ABM') // Create a text node
buttonStart.append(tStart) // Append the text to <button>
buttonStart.addEventListener('click', start)
buttonStart.style = 'position: absolute; background-color: sienna; width:130px; top: 70px; left: 20px; color: white; display: block; font-size: 12px; z-index: 10000; border-width: 8px; padding: 6px 10px; border-radius: 14px 0; border-style: groove; border-color: antiquewhite; cursor: pointer;'
document.body.append(buttonStart)

const buttonAutoTag = document.createElement('button') // Create a <button> element
const tAutoTag = document.createTextNode('Tag this person') // Create a text node
buttonAutoTag.append(tAutoTag) // Append the text to <button>
buttonAutoTag.addEventListener('click', autotag)
buttonAutoTag.style = 'position: absolute; background-color: sienna; width:130px; top: 120px; left: 20px; color: white; display: block; font-size: 12px; z-index: 10000; border-width: 8px; padding: 6px 10px; border-radius: 0; border-style: groove; border-color: antiquewhite; cursor: pointer;'
document.body.append(buttonAutoTag)

const buttonInvertSel = document.createElement('button') // Create a <button> element
const tInvertSel = document.createTextNode('Invert selection') // Create a text node
buttonInvertSel.append(tInvertSel) // Append the text to <button>
buttonInvertSel.addEventListener('click', invertSelection)
buttonInvertSel.style = 'position: absolute; background-color: sienna; width:130px; top: 170px; left: 20px; color: white; display: block; font-size: 12px; z-index: 10000; border-width: 8px; padding: 6px 10px; border-radius: 0 14px; border-style: groove; border-color: antiquewhite; cursor: pointer;'
document.body.append(buttonInvertSel)

// addCSS('https://cdnjs.cloudflare.com/ajax/libs/izitoast/1.3.0/css/iziToast.min.css')
// addScript('https://cdnjs.cloudflare.com/ajax/libs/izitoast/1.3.0/js/iziToast.min.js')
