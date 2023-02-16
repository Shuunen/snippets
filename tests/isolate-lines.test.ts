import { isolateLines } from '../one-file/isolate-lines.utils'
import { check } from './utils'

check(
  'isolate lines A',
  isolateLines('xyz\nudp://9.7zip.t0:2750  xyz  \n \n \n http://ubuntu.com:80/announce  \n  ab-cd\n\n  ab-cd '),
  'ab-cd\n\nhttp://ubuntu.com:80/announce\n\nudp://9.7zip.t0:2750xyz\n\nxyz',
)

check('isolate lines B', isolateLines(''), '')
check('isolate lines C', isolateLines('  '), '')
check('isolate lines D', isolateLines('  \n  '), '')
check('isolate lines E', isolateLines('  \n  \n  '), '')
check('isolate lines F', isolateLines('  \nxyz  \n  \n  '), 'xyz')
