/* c8 ignore start */
import { expect, it } from 'vitest'

/**
 * Check if the actual value is equal to the expected value
 * @param title the title of the test
 * @param actual the actual value
 * @param expected the expected value
 */
export function check<Type> (title: string, actual: Promise<Type> | Type, expected?: Promise<Type> | Type) {
  it(title, async () => {
    const resolvedActual = (actual instanceof Promise) ? await actual : actual
    const resolvedExpected = (expected instanceof Promise) ? await expected : expected
    expect(resolvedActual).toStrictEqual(resolvedExpected)
  })
}

/**
 * Check if the actual value is equal to the expected snapshot
 * @param title the title of the test
 * @param actual the actual value
 */
export function checkSnapshot<Type> (title: string, actual: Promise<Type> | Type) {
  it(title, async () => {
    const resolvedActual = (actual instanceof Promise) ? await actual : actual
    expect(resolvedActual).toMatchSnapshot()
  })
}
