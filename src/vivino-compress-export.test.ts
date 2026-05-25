import { csvMockA } from './vivino-compress-export.mock'
import { compressCsv } from './vivino-compress-export.utils'

test('compressCsv A', () => {
  expect(compressCsv(csvMockA)).toMatchSnapshot()
})
