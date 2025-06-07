/* c8 ignore start */
// @ts-expect-error missing types
import { wake } from 'wake_on_lan'

wake('50-46-5D-A3-6E-53', (/** @type {Error | null} */ error) => {
  if (error) console.log('wol : got error', error)
  else console.log('wol : just sent magic packets !')
})
