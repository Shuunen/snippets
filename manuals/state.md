# State

Here is the results of my investigation & experiments about the state management

## Vue reactive and watch

> Tested with Vue 3.2

Super simple to use, just install `vue` and create a state :

```ts
// state.ts
import { reactive } from 'vue'

export const state = reactive({
  isLoading: false,
})
```

Then use it :

```ts
import { watch } from 'vue'
import { state } from '../state'
// react to initial state
if (state.isLoading) // do something 
// update it
state.isLoading = true
// react to async state changes
watch(() => state.isLoading, (isLoading: boolean) => { message.textContent = isLoading ? 'Loading... please wait' : 'Not loading' })
```

Problem is the added size to the build :

- `import { reactive } from 'vue'` 65 kB
- `import { watch } from 'vue'` 0.5 kB

It's not a lot, 65 kB could be a png image, but it's still a lot for a simple state management.

Also this whole project build 60 kb of js, so adding 65 kb is more than doubling the size of the app to add a simple state management.

## Vue reactivity

> Tested with @vue/reactivity 3.2

Here we use a standalone package to manage a vue reactive state, so we don't have to import the whole Vue library.

```ts
// state.ts
import { reactive } from '@vue/reactivity'

export const state = reactive({
  isLoading: false,
})
```

It's the exact same code as before, but the size is much smaller :)

BUT... there is no `watch` function in this package, so we have to use the `effect` function and create a small wrapper :

```ts
import { effect, reactive, stop as stopRunner } from '@vue/reactivity'

export const state = reactive({
  isLoading: false,
})

export function watch (stateProperty: keyof typeof state, callback: () => unknown): () => void {
  const runner = effect(() => state[stateProperty], {
    scheduler: callback, 
  })
  return () => { stopRunner(runner) }
}
```

Thanks a lot to [AntFu](https://antfu.me/posts/watch-with-reactivity) for the inspiration <3.

Now we can use it :

```ts
import { state, watch } from '../state'
// react to initial state
if (state.isLoading) // do something 
// update it
state.isLoading = true
// react to async state changes
watch('isLoading', () => { console.log('isLoading', state.isLoading) })
```

And the size is much smaller :

- `import { effect, reactive, stop as stopRunner } from '@vue/reactivity'` 25.4 kB

## Homemade vanilla state in 20 LOC

> Tested with JavaScript

Here we use a homemade vanilla state management, without any library.

```ts
// state.ts
const data = {
  isLoading: false,
}

type Properties = keyof typeof data

type Listener = () => void 

const listeners: Partial<Record<Properties, Listener[]>> = {} 

const handler = {
  set (target: typeof data, key: Properties, value: unknown): boolean {
    listeners[key]?.forEach(callback => { callback() })
    return Reflect.set(target, key, value)
  },
}

export function watch (key: Properties, callback: () => void): void {
  listeners[key] ||= []
  listeners[key]?.push(callback)
}

export const state = new Proxy(data, handler)
```

Then use it the same way as before :

```ts
import { state, watch } from '../state'
// react to initial state
if (state.isLoading) // do something 
// update it
state.isLoading = true
// react to async state changes
watch('isLoading', () => { console.log('isLoading', state.isLoading) })
```

And the size is even smaller :

- `import { state, watch } from '../state'` 0.7 kB

## Improved homemade vanilla state migrated to shuutils

> Tested with Shuutils 7.0.0

I've migrated the homemade vanilla state management to [Shuutils](https://github.com/Shuunen/shuutils).

Super simple to use, just install `shuutils` and create a state :

```ts
// state.ts
import { createState } from 'shuutils'

export const { state, watch } = createState({
  isLoading: false,
})
```

Then use it :

```ts
import { state, watch } from '../state'
// react to initial state
if (state.isLoading) // do something 
// update it
state.isLoading = true
// react to async state changes
watch('isLoading', () => { console.log('isLoading', state.isLoading) })
```

Added size to the build : 0.8 kB ^^

And this version is packaged with more features, you can persist the state in local storage via :

```ts
// state.ts
import { createState, storage } from 'shuutils'

export const { state, watch } = createState({
  isLoading: false,
}, storage)
```

That's it :)

Want to persists fooBar and not isLoading ?
  
```ts
// state.ts
import { createState, storage } from 'shuutils'

export const { state, watch } = createState({
  isLoading: false,
  fooBar: 'foo',
}, storage, ['fooBar'])
```

This way isLoading will always be false on page reload, but fooBar will take the last value from local storage if it exists (or the default "foo" value here).

## Signals from Preact

Seems like a good contender, gonna try it later.

[https://github.com/preactjs/signals](https://github.com/preactjs/signals)

## Conclusion

I think the homemade vanilla state management is the best solution for this project, because it's the smallest and the most simple to use.

I don't need more features, so it fits perfectly my needs for now :)
