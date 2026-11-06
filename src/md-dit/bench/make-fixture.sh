#!/usr/bin/env bash
# usage: make-fixture.sh out.md [size_kb=200] — generates a markdown file with every typical feature, repeated up to the target size
set -euo pipefail
out="${1:?usage: make-fixture.sh out.md [size_kb]}"
target=$(( ${2:-200} * 1024 ))
: > "$out"
i=0
while [ "$(stat -c %s "$out")" -lt "$target" ]; do
  i=$((i + 1))
  cat >> "$out" <<SECTION
# Section $i

## Text & inline

Some **bold**, *italic*, ***both***, ~~strikethrough~~, \`inline code\`, a [link](https://example.com/$i) and an autolink <https://example.com>.
Footnote reference[^$i] and an emoji 🚀 with "smart quotes" -- and ellipsis...

> A blockquote with **formatting**
>
> > and a nested quote

## Lists

- item one
  - nested item
    - deeper item
- item two
1. first
2. second
   1. sub second

- [x] done task
- [ ] open task

## Code

\`\`\`typescript
export function fibonacci(n: number): number {
  return n < 2 ? n : fibonacci(n - 1) + fibonacci(n - 2)
}
const values = Array.from({ length: 10 }, (_, index) => fibonacci(index))
\`\`\`

\`\`\`bash
for f in *.md; do echo "\$f"; done
\`\`\`

## Table

| Name | Type | Default | Description |
| ---- | :--: | ------: | ----------- |
| alpha | string | \`"a"\` | first option $i |
| beta | number | 42 | second option |
| gamma | boolean | true | third option |

## Media & rules

![an image](./missing-$i.png "title")

<details><summary>Raw html block</summary>hidden $i</details>

---

[^$i]: The footnote body for section $i.

SECTION
done
echo "$out: $(stat -c %s "$out") bytes, $i sections"
