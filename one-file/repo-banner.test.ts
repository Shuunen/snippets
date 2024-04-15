import { expect, it } from 'vitest'
import { extractData, logger, replaceAndCheck, replaceAndCheckById, safeRead } from './repo-banner.utils'
import { svgMockA } from './repo-banner.mock'

it('replaceAndCheck A', () => {
  expect(replaceAndCheck('Hello world !', /(?<before>Hello )world(?<after> !)/gu, 'there')).toMatchInlineSnapshot(`"Hello there !"`)
})

logger.info('Dont worry, the following error is expected')

it('replaceAndCheck B generate error', () => {
  expect(replaceAndCheck('Hello world !', /(?<before>Hello )world(?<after> !)/gu, 'world')).toMatchInlineSnapshot(`"Hello world !"`)
})

logger.info('That was it, are you good ?')

it('replaceAndCheckById A', () => {
  expect(replaceAndCheckById(svgMockA, 'projectName', 'My project name')).toMatchSnapshot()
})

it('safeRead A non-existing file', () => {
  expect(safeRead('plop.txt')).toBe('')
})

it('safeRead B existing file', () => {
  expect(safeRead('README.md')).toContain('Snippets')
})

it('safeRead C existing directory', () => {
  expect(safeRead('.')).toBe('')
})

it('extractData A current folder', () => {
  expect(extractData()).toMatchInlineSnapshot(`
    {
      "color": "#54143A",
      "description": "My personal snippets",
      "name": "snippets",
      "scope": "Shuunen",
    }
  `)
})

it('extractData B another folder', () => {
  expect(extractData('..')).toMatchInlineSnapshot(`
    {
      "color": "#024eb8",
      "description": "A placeholder description",
      "name": "unknown",
      "scope": "JohnDoe",
    }
  `)
})
