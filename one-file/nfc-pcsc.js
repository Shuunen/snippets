'use strict'

// #############
// Basic example
// - example reading and writing data on from/to card
// - should work well with any compatible PC/SC card reader
// - tested with Mifare Ultralight cards but should work with many others
// - example authentication for Mifare Classic cards
// #############

import consola from 'consola'
import { KEY_TYPE_B, NFC, TAG_ISO_14443_3, TAG_ISO_14443_4 } from 'nfc-pcsc'

consola.wrapConsole()

// minilogger for debugging
//
// function log() {
//    console.log(...arguments);
// }
//
// const minilogger = {
//    log: log,
//    debug: log,
//    info: log,
//    warn: log,
//    error: log
// };

// minilogger for debugging
/*
function log () {
  console.log(...arguments)
}

const debug = false

const minilogger = {
  log: log,
  debug: log,
  info: log,
  warn: log,
  error: log
}
*/
const nfc = new NFC() // const nfc = new NFC(minilogger); // optionally you can pass logger to see internal debug logs

const readers = []

nfc.on('reader', async reader => {
  console.info('device attached', { reader: reader.name })

  readers.push(reader)

  // needed for reading tags emulated with Android HCE AID
  // see https://developer.android.com/guide/topics/connectivity/nfc/hce.html
  reader.aid = 'F222222222'

  reader.on('card', async card => {
    if (card.type === TAG_ISO_14443_3) console.info('card 3 detected', { reader: reader.name, card }) // standard nfc tags like Mifare
    else if (card.type === TAG_ISO_14443_4) console.info('card 4 detected', { reader: reader.name, card: { ...card, data: card.data.toString('utf8') } }) // Android HCE
    else console.info('card detected', { reader: reader.name, card }) // not possible, just to be sure

    // Notice: reading data from Mifare Classic cards (e.g. Mifare 1K) requires,
    // that the data block must be authenticated first
    // don't forget to fill your keys and types
    // reader.authenticate(blockNumber, keyType, key, obsolete = false)
    // if you are experiencing problems, you can try using obsolete = true which is compatible with PC/SC V2.01
    // uncomment when you need it

    const startRead = 4

    try {
      const key = 'FFFFFFFFFFFF'
      const keyType = KEY_TYPE_B

      // we will authenticate block 4, ... (which we want to read)
      await Promise.all([
        reader.authenticate(startRead, keyType, key),
      ])

      console.info('blocks successfully authenticated')
    } catch (error) {
      console.error('error when authenticating data', { reader: reader.name, card, err: error })
      return
    }

    try {
      // reader.read(blockNumber, length, blockSize = 4, packetSize = 16)
      // - blockNumber - memory block number where to start reading
      // - length - how many bytes to read
      // - blockSize - 4 for Mifare Ultralight, 16 for Mifare Classic
      // ! Caution! length must be divisible by blockSize
      // ! Caution! Mifare Classic cards have sector trailers
      //   containing access bits instead of data, each last block in sector is sector trailer
      //   (e.g. block 3, 7, 11, 14)
      //   see for more info https://github.com/pokusew/nfc-pcsc/issues/16#issuecomment-304989178
      /*
      // example reading 16 bytes assuming containing 16bit integer
      const data = await reader.read(0, 16, 16) // await reader.read(4, 16, 16); for Mifare Classic cards
      console.info(`data read`, { reader: reader.name, data })
      const payload = data.readInt16BE()
      console.info(`data converted`, payload)
      */
      const data = await reader.read(startRead, 16, 16) // starts reading in block 4, continues to 5 and 6 in order to read 12 bytes
      console.log('data read', data)
      const payload = data.toString() // utf8 is default encoding
      console.log('data converted', payload)
    } catch (error) {
      console.error('error when reading data', { reader: reader.name, err: error })
    }
  })

  reader.on('error', error => {
    console.error('an error occurred', { reader: reader.name, err: error })
  })

  reader.on('end', () => {
    console.info('device removed', { reader: reader.name })

    delete readers[readers.indexOf(reader)]

    console.log(readers)
  })
})

nfc.on('error', error => {
  console.error('an error occurred', error)
})
