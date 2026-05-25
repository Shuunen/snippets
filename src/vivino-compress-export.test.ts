import { expect, it } from 'vitest'
import { csvMockA } from './vivino-compress-export.mock'
import { compressCsv } from './vivino-compress-export.utils'

it('compressCsv A', () => {
  expect(compressCsv(csvMockA)).toMatchSnapshot()
})
