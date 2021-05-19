const https = require('https')
const fs = require('fs')
const path = require('path')

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const data = {
  customGameLobby: {
    configuration: { gameMode: 'PRACTICETOOL', gameMutator: '', gameServerRegion: '', mapId: 11, mutators: { id: 1 }, spectatorPolicy: 'AllAllowed', teamSize: 5 },
    lobbyName: '5v5 Practice ' + String(Date.now()).slice(-4),
    lobbyPassword: null,
  },
  isCustom: true,
}
const options = { hostname: '127.0.0.1', path: '/lol-lobby/v2/lobby', method: 'POST', headers: { 'Content-Type': 'application/json' } }

const logFile = path.join(__dirname, 'lol-practice-5v5.log')
const logClear = () => fs.writeFileSync(logFile, '')
const logAdd = (...stuff) => fs.appendFileSync(logFile, '\n' + stuff.join(' ') + '\n')

function doRequest() {
  if (!options.port) throw new Error('cannot make the request without port')
  const request = https.request(options, response => {
    logAdd(`Game api response status code : ${response.statusCode}`)
    let data = ''
    response.on('data', chunk => (data += chunk)) // eslint-disable-line no-return-assign
    response.on('end', () => logAdd(`5v5 Practice created successfully by ${JSON.parse(data).localMember.summonerName}`))
  })
  request.on('error', error => {
    logAdd(error)
    throw error
  })
  request.write(JSON.stringify(data))
  request.end()
}

function readLock() {
  const lockPath = process.argv[2]
  if (!lockPath) throw new Error('missing lockfile path, use me like : \n\n node lol-practice-5v5.js "D:\\Games\\Riot Games\\League of Legends\\lockfile" "My game lobby name"')
  logAdd('Summoner lockfile located at : ' + lockPath)
  if (!/lockfile/.test(lockPath)) throw new Error('lockfile path invalid, should looks like "D:\\Games\\Riot Games\\League of Legends\\lockfile"')
  const content = fs.readFileSync(lockPath, 'utf-8').split(':') || []
  if (!content[2] || !content[3]) throw new Error('lockfile does not contains expected data or is not formatted as usual')
  options.port = content[2]
  options.headers.Authorization = `Basic ${Buffer.from(`riot:${content[3]}`).toString('base64')}`
}

function handleCustomName() {
  const customName = process.argv[3]
  if (customName) data.customGameLobby.lobbyName = customName
}

async function init() {
  logClear()
  logAdd('LoL Practice 5v5 maker starts @', new Date())
  readLock()
  handleCustomName()
  doRequest()
}

init().catch(error => console.error(`\n${error.message}`))
