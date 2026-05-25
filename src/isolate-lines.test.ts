import { expect, it } from 'vitest'
import { isolateLines } from './isolate-lines.utils'

it('isolate lines A', () => {
  expect(isolateLines('xyz\nudp://9.7zip.t0:2750  xyz  \n \n \n http://ubuntu.com:80/announce  \n  ab-cd\n\n  ab-cd ')).toMatchSnapshot()
})

it('isolate lines B', () => {
  expect(isolateLines('')).toEqual([])
})

it('isolate lines C', () => {
  expect(isolateLines('  ')).toEqual([])
})

it('isolate lines D', () => {
  expect(isolateLines('  \n  ')).toEqual([])
})

it('isolate lines E', () => {
  expect(isolateLines('  \n  \n  ')).toEqual([])
})

it('isolate lines F', () => {
  expect(isolateLines('  \nxyz  \n  \n  ')).toEqual(['xyz'])
})
