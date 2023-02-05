#!/usr/bin/env node
/* eslint-disable prefer-destructuring */
/* eslint-disable no-magic-numbers */
import { appendFileSync, readFileSync, writeFileSync } from 'fs'
import { request as _request } from 'https'
import path from 'path'
import { fileURLToPath } from 'url'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const data = {
  customGameLobby: {
    configuration: { gameMode: 'PRACTICETOOL', gameMutator: '', gameServerRegion: '', mapId: 11, mutators: { id: 1 }, spectatorPolicy: 'AllAllowed', teamSize: 5 },
    lobbyName: `5v5 Practice ${String(Date.now()).slice(-4)}`,
    lobbyPassword: undefined,
  },
  isCustom: true,
}
const options = { hostname: '127.0.0.1', path: '/lol-lobby/v2/lobby', method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': '' }, port: 0 }

// @ts-ignore
const currentFolder = path.dirname(fileURLToPath(import.meta.url))
const logFile = path.join(currentFolder, 'lol-practice-5v5.log')
function logClear () {
  return writeFileSync(logFile, '')
}
function logAdd (/** @type {string[]} */ ...stuff) {
  return appendFileSync(logFile, `\n${stuff.join(' ')}\n`)
}

function doRequest () {
  if (!options.port) throw new Error('cannot make the request without port')
  const request = _request(options, (response) => {
    logAdd(`Game api response status code : ${response.statusCode}`)
    let requestData = ''
    response.on('data', chunk => { requestData += chunk })
    response.on('end', () => logAdd(`5v5 Practice created successfully by ${JSON.parse(requestData).localMember.summonerName}`))
  })
  request.on('error', (/** @type {string} */ error) => {
    logAdd(error)
    throw error
  })
  request.write(JSON.stringify(data))
  request.end()
}

function readLock () {
  const lockPath = process.argv[2]
  if (!lockPath) throw new Error('missing lockfile path, use me like : \n\n lol-practice-5v5.js "D:\\Games\\Riot Games\\League of Legends\\lockfile" "My game lobby name"')
  logAdd(`Summoner lockfile located at : ${lockPath}`)
  if (!/lockfile/u.test(lockPath)) throw new Error('lockfile path invalid, should looks like "D:\\Games\\Riot Games\\League of Legends\\lockfile"')
  const content = readFileSync(lockPath, 'utf8').split(':') || []
  if (!content[2] || !content[3]) throw new Error('lockfile does not contains expected data or is not formatted as usual')
  options.port = Number.parseInt(content[2], 10)
  const auth = Buffer.from(`riot:${content[3]}`).toString('base64')
  options.headers.Authorization = `Basic ${auth}`
}

function handleCustomName () {
  const customName = process.argv[3]
  if (customName) data.customGameLobby.lobbyName = customName
}

function init () {
  logClear()
  logAdd('LoL Practice 5v5 maker starts @', String(new Date()))
  readLock()
  handleCustomName()
  doRequest()
}

// @ts-ignore
// eslint-disable-next-line sonarjs/no-use-of-empty-return-value
await init().catch(error => console.error(`\n${error.message}`))
