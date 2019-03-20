
const { google } = require('googleapis')

const creds = require('creds.json')
// console.log('using creds', creds)

function fetchRecords () {
  // prepare oauth2 client
  const auth = new google.auth.OAuth2(
    creds.client_id,
    creds.client_secret,
    'urn:ietf:wg:oauth:2.0:oob'
  )

  auth.setCredentials({
    access_token: 'DUMMY',
    expiry_date: 1,
    refresh_token: creds.refresh_token,
    token_type: 'Bearer'
  })

  // create sheets client
  const sheets = google.sheets({ version: 'v4', auth })
  // get a range of values
  return sheets.spreadsheets.values.get({
    spreadsheetId: creds.spreadsheet_id,
    range: creds.spreadsheet_range
  }).then(res => {
    // print results
    // console.log(JSON.stringify(res.data, null, 2))
    const records = res.data.values
    console.log('got', records.length, 'records from spreadsheet')
    return records
  })
}

async function findBoxContaining (object) {
  const records = await fetchRecords()
  for (let [name, brand, box, drawer, category] of records) {
    // console.table({name, brand, box, drawer, category})
    // TODO : implement better search than this :p
    if (name.toLowerCase().indexOf(object) > -1) {
      const record = { name, brand, box, drawer, category }
      console.log(`found "${object}" in record`, record)
      return record
    }
  }
}

module.exports = { findBoxContaining }
