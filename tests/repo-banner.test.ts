import { logger, replaceAndCheck, replaceAndCheckById } from '../one-file/repo-banner.utils'
import { svgMockA } from './repo-banner.mock'
import { check, checkSnapshot } from './utils'

check('replaceAndCheck A', replaceAndCheck('Hello world !', /(?<before>Hello )world(?<after> !)/gu, 'there'), 'Hello there !')
logger.info('Dont worry, the following error is expected')
check('replaceAndCheck B generate error', replaceAndCheck('Hello world !', /(?<before>Hello )world(?<after> !)/gu, 'world'), 'Hello world !')
logger.info('That was it, are you good ?')

checkSnapshot('replaceAndCheckById A', replaceAndCheckById(svgMockA, 'projectName', 'My project name'))
