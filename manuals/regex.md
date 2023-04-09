# Useful Regex

## Remove a function return type

Just replace this : `\)(: [^\{]+ )\{` with this : `) {`

## Check tests to vitest

Replace

```text
check\('([^']+)', ([\w.]+|[\w.]+\([^\)]+\)|.+), (\{[^}]+\}|\[[^\]]+\]|true|false|[a-z]*[A-Z]+.+|'.*'|[\d_]+)\)
```

with `it('$1', () => { expect($2).toBe($3) })`
