/* eslint-disable no-magic-numbers */
/* eslint-disable import/unambiguous */

/**
 * @param {number} value
 * @param {string} unit
 * @returns {number} the value in Mo
 * @example unitValueToMo(1, 'Kio') // 0.001
 * @example unitValueToMo(1, 'Mio') // 1
 */
function unitValueToMo (value, unit) {
  if (unit === 'Kio') return value / 1000
  if (unit === 'Mio') return value
  if (unit === 'Gio') return value * 1000
  if (unit === 'Tio') return value * 1000 * 1000
  console.warn('unhandled unit :', unit)
  return 0
}

/**
 * @param {HTMLElement} row
 * @returns <string> the date as a string
 */
function getDateString (row) {
  const dateElement = row.querySelector('.stable-List-col-14 div')
  if (!dateElement) console.warn('failed to find a date on', row)
  return dateElement?.textContent ?? ''
}

/**
 * Get the number of days
 * @param {HTMLElement} row
 * @returns {number} the number of days *
 */
function getNbDays (row) {
  const [day, month, year] = getDateString(row).split(' ')[0].split('.')
  const dateStart = new Date(`${year}-${month}-${day}`)
  const dateNow = new Date(new Date().toISOString().split('T')[0]) // ends up with new Date("2019-11-15") and no hours/min/sec
  return (dateNow - dateStart) / (1000 * 60 * 60 * 24)
}

/**
 * Get mo per day
 * @param {HTMLElement} row
 * @returns {number} the number of mo per day
 */
function getMoPerDay (row) {
  const sentElement = row.querySelector('.stable-List-col-5 div')
  const sentString = sentElement.textContent
  if (sentString.includes('/')) return console.warn(sentString, 'seems already process ^^')
  const [sentValue, sentUnit] = sentString.split(' ')
  const nbMo = unitValueToMo(Number.parseInt(sentValue, 10), sentUnit)
  const diffDays = getNbDays(row)
  let moPerDay = Math.round(nbMo / diffDays)
  if (!moPerDay || moPerDay === Number.POSITIVE_INFINITY || moPerDay < 1) moPerDay = 0
  return moPerDay
}

/**
 * Process a row
 * @param {HTMLElement} row
 * @returns {void}
 */
function processRow (row) {
  const nameElement = row.querySelector('.stable-List-col-0 div')
  if (!nameElement) return
  const sentElement = row.querySelector('.stable-List-col-5 div')
  sentElement.textContent = `${getMoPerDay(row)} mo/jour`
}

document.querySelectorAll('.stable-body > table > tbody > tr[index][title]').forEach(row => { processRow(row) })
