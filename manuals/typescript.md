# TypeScript

## Ts is not always right

```ts
interface User {
    name: string
    age: number
}

const objet = {
    name: 'John Doe',
    age: 42,
    details: "J'existe !"
}

function getUser(user: User) {
    return user
}

const user = getUser(objet)

console.log(user.details) // display "J'existe !"
//              ^^^^^^^ Property 'details' does not exist on type 'User'.        
```

## Return type leak

```ts
// simulate a database query
const dbQuery = (id: string) => ({
    id,
    name: 'John Doe',
    age: 42,
    password: 'do-not-leak-me'
})

interface User {
    name: string
    age: number
}

function getUser(id: string): User {
    // 🔴 no typescript errors but dbQuery returns an object with a password property that does not exist in User interface
    return dbQuery(id)
}

// 🔴 when we hover the user variable, we see that it contains ONLY name and age, it's not true !
const user = getUser('admin')
console.log(user) 
// 🔴 the password is displayed in console
```

Without the specified return type, we let TypeScript infer the return type of the function.

```ts
// simulate a database query
const dbQuery = (id: string) => ({
    id,
    name: 'John Doe',
    age: 42,
    password: 'do-not-leak-me'
})

function getUser(id: string) {
    // 🟢 the return type is inferred by TypeScript
    return dbQuery(id)
}

// 🟢 when we hover the user variable, we can see that it contains a password property
const user = getUser('admin')
console.log(user.name) 
// 🟢 we avoid the password leak
```
