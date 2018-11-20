# Use cases

## Interactive stage files

Just `git add -p` then play with :

* y : stage this hunk
* n : do not stage this hunk
* q : quit; do not stage this hunk or any of the remaining ones
* a : stage this hunk and all later hunks in the file
* d : do not stage this hunk or any of the later hunks in the file
* e : manually edit the current hunk
* ? : print this help

## Squash un-pushed commits

Let's say you're working on branch `feature/test`

Start rebasing with `git rebase -i`

You will get the editor open and see something like this :

```
Pick 2994283490 commit msg1
Pick 7994283490 commit msg2
Pick 4654283490 commit msg3
#Some message 
```

Better than squash (with s) just fixup commits :

```
Pick 2994283490 commit msg1
f 7994283490 commit msg2
f 4654283490 commit msg3
#Some message 
```

Here all commits will be merged with the first one.

Now you can push your single commit or continue working on your branch.

## Squash pushed commits

Let's say you're working on branch `feature/test`

Start rebasing with `git rebase -i master`

You will get the editor open and see something like this :

```
Pick 2994283490 commit msg1
Pick 7994283490 commit msg2
Pick 4654283490 commit msg3
#Some message 
```

Better than squash (with s) just fixup commits :

```
Pick 2994283490 commit msg1
f 7994283490 commit msg2
f 4654283490 commit msg3
#Some message 
```

Here all commits will be merged with the first one.

Now re-write your branch history : `git push -f origin feature/test`

## Delete remote branch

`git push --delete origin feature/test`

## Delete local branch

`git branch -D feature/test`

## Use git credential helper to clone

`git -c credential.helper= clone --recursive --progress -- https://github.com/Shuunen/snippets.git C:/Users/me/Projets/snippets`

## Add stuff to last commit

Without modifying last commit message :

`git commit --amend --no-edit` or `git commit --amend -m "My new message"`

Then use force to re-write history :

`git push -f`
