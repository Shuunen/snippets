import { test } from 'uvu'
import { equal } from 'uvu/assert'
import { isolateLines } from '../one-file/isolate-lines.js'

test('isolate lines A', () => equal(
  isolateLines('xyz\nudp://9.7zip.t0:2750  xyz  \n \n \n http://ubuntu.com:80/announce  \n  ab-cd\n\n  ab-cd '),
  'ab-cd\n\nhttp://ubuntu.com:80/announce\n\nudp://9.7zip.t0:2750xyz\n\nxyz',
))

test.run()
