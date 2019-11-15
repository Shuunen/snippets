document.querySelectorAll('.stable-body > table > tbody > tr[index][title]').forEach(row => {
  const nameEl = row.querySelector('.stable-List-col-0 div')
  if (!nameEl) {
    return
  }
  const name = nameEl.textContent
  const sentEl = row.querySelector('.stable-List-col-5 div')
  const sentStr = sentEl.textContent
  if (sentStr.indexOf('/') !== -1) {
    return console.warn(sentStr, 'seems already process ^^')
  }
  const [sentValue, sentUnit] = sentStr.split(' ')
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
  const dateEl = row.querySelector('.stable-List-col-14 div')
  if (!dateEl) {
    return console.warn('failed to find a date on', name)
  }
  const dateStr = dateEl.textContent
  const [day, month, year] = dateStr.split(' ')[0].split('.')
  const dateStart = new Date(`${year}-${month}-${day}`)
  const dateNow = new Date(new Date().toISOString().split('T')[0]) // ends up with new Date("2019-11-15") and no hours/min/sec
  const diffDays = (dateNow - dateStart) / (1000 * 60 * 60 * 24)
  let moPerDay = Math.round(nbMo / diffDays)
  if (!moPerDay || moPerDay === Infinity || moPerDay < 1) {
    moPerDay = 0
  }
  sentEl.textContent = `${moPerDay} mo/jour`
})
