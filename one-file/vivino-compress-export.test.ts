import { checkSnapshot } from '../tests/test-utils'
import { csvMockA } from './vivino-compress-export.mock'
import { compressCsv } from './vivino-compress-export.utils'

checkSnapshot('compressCsv A', compressCsv(csvMockA))

