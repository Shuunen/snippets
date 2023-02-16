import { compressCsv } from '../one-file/vivino-compress-export.utils'
import { checkSnapshot } from './utils'
import { csvMockA } from './vivino-compress-export.mock'

checkSnapshot('compressCsv A', compressCsv(csvMockA))

