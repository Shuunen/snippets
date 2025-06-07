import { expect, it } from 'vitest'
import { cleanTrackers } from './clean-trackers.utils'

it('clean trackers A', () => {
  expect(
    cleanTrackers(`udp://tracker.bitsearch.to:1337/announce
  udp://opentracker.i2p.rocks:6969/announce
  udp://open.demonii.com:1337/announce
  udp://tracker.openbittorrent.com:6969/announce
  udp://exodus.desync.com:6969/announce
  udp://exodus.desync.com:6969/announce
  udp://exodus.desync.com:6969/announce
  udp://tracker.openbittorrent.com:6969/announce
  udp://tracker.torrent.eu.org:451/announce
  https://tr.ready4.icu:443/announce`),
  ).toMatchSnapshot()
})
