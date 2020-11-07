document.querySelectorAll('.stable-body > table > tbody > tr[index][title]').forEach(row => {
  const nameElement = row.querySelector('.stable-List-col-0 div')
  if (!nameElement) {
    return
  }
  const name = nameElement.textContent
  const sentElement = row.querySelector('.stable-List-col-5 div')
  const sentString = sentElement.textContent
  if (sentString.includes('/')) {
    return console.warn(sentString, 'seems already process ^^')
  }
  const [sentValue, sentUnit] = sentString.split(' ')
  let nbMo = 0
  if (sentUnit === 'Kio') {
    nbMo = sentValue / 1000
  } else if (sentUnit === 'Mio') {
    nbMo = sentValue
  } else if (sentUnit === 'Gio') {
    nbMo = sentValue * 1000
  } else if (sentUnit === 'Tio') {
    nbMo = sentValue * 1000 * 1000
  } else {
    return console.warn(name, 'has an unhandled unit :', sentUnit)
  }
  const dateElement = row.querySelector('.stable-List-col-14 div')
  if (!dateElement) {
    return console.warn('failed to find a date on', name)
  }
  const dateString = dateElement.textContent
  const [day, month, year] = dateString.split(' ')[0].split('.')
  const dateStart = new Date(`${year}-${month}-${day}`)
  const dateNow = new Date(new Date().toISOString().split('T')[0]) // ends up with new Date("2019-11-15") and no hours/min/sec
  const diffDays = (dateNow - dateStart) / (1000 * 60 * 60 * 24)
  let moPerDay = Math.round(nbMo / diffDays)
  if (!moPerDay || moPerDay === Infinity || moPerDay < 1) {
    moPerDay = 0
  }
  sentElement.textContent = `${moPerDay} mo/jour`
})
