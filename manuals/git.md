# Use cases

- [Use cases](#Use-cases)
  - [Commit](#Commit)
    - [Interactive stage files](#Interactive-stage-files)
    - [Squash un-pushed commits](#Squash-un-pushed-commits)
    - [Squash pushed commits](#Squash-pushed-commits)
    - [Add stuff to last commit](#Add-stuff-to-last-commit)
    - [Rewrite history](#Rewrite-history)
    - [Fixup](#Fixup)
  - [Branch](#Branch)
    - [Create local branch](#Create-local-branch)
    - [Push local branch to remote](#Push-local-branch-to-remote)
    - [Delete remote branch](#Delete-remote-branch)
    - [Delete local branch](#Delete-local-branch)
    - [Rebase onto](#Rebase-onto)
  - [Tricks](#Tricks)
    - [Use git credential helper to clone](#Use-git-credential-helper-to-clone)

## Commit

### Interactive stage files

Just `git add -p` then play with :

- y : stage this hunk
- n : do not stage this hunk
- q : quit; do not stage this hunk or any of the remaining ones
- a : stage this hunk and all later hunks in the file
- d : do not stage this hunk or any of the later hunks in the file
- e : manually edit the current hunk
- ? : print this help

### Squash un-pushed commits

Let's say you're working on branch `feature/test`

Start rebasing with `git rebase -i`

You will get the editor open and see something like this :

```bash
Pick 2994283490 commit msg1
Pick 7994283490 commit msg2
Pick 4654283490 commit msg3
#Some message
```

Better than squash (with s) just fixup commits :

```bash
Pick 2994283490 commit msg1
f 7994283490 commit msg2
f 4654283490 commit msg3
#Some message
```

Here all commits will be merged with the first one.

Now you can push your single commit or continue working on your branch.

### Squash pushed commits

Let's say you're working on branch `feature/test`

Start rebasing with `git rebase -i master`

You will get the editor open and see something like this :

```bash
Pick 2994283490 commit msg1
Pick 7994283490 commit msg2
Pick 4654283490 commit msg3
#Some message
```

Better than squash (with s) just fixup commits :

```bash
Pick 2994283490 commit msg1
f 7994283490 commit msg2
f 4654283490 commit msg3
#Some message
```

Here all commits will be merged with the first one.

Now re-write your branch history : `git push -f origin feature/test`

### Add stuff to last commit

Without modifying last commit message :

`git commit --amend --no-edit` or `git commit --amend -m "My new message"`

Then use force to re-write history :

`git push -f`

### Rewrite history

Let's say you have done 4 commits and you want to take all your modified files with latest changes to do new commits : `git reset HEAD~4`

### Fixup

Je veux corriger/ajouter `path/to/my-file.js` et d'autres fichiers à un commit existant qui a ce sha : `f65055b005492806115f8071d821c6c54d083901`

```bash
git add path/to/my-file.js
git add path/to/another/folder/*.css
git commit --fixup=f65055b005492806115f8071d821c6c54d083901
```

Si besoin, fixup d'autres commit en répétant la méthode ci-dessus.

Ensuite :

```bash
! GIT_SEQUENCE_EDITOR=: git rebase -i --autosquash develop
```

Note : sur GitHub la branche par défaut est master.

Note 2 : **le dernier paramètre n'est pas lié à la branche sur laquelle on se trouve** mais bien à la branche d'origine.

Je constate :

```bash
pick commit 1
pick commit 2 plop
fixup !fixup commit 2 plop
pick commit 3
```

Ici le fixup va se merge au commit qui le précède et porte le même nom.

Si tout est OK, deux point et Q pour quitter vim, on voit :

`Successfully rebased and updated refs/heads/feat/a-great-branch.`

On a ré-écrit l'histoire donc :

`git push --force`

## Branch

### Create local branch

Create locally from actual branch : `git checkout -b feature/test`

### Push local branch to remote

Set upstream : `git push --set-upstream origin feature/test`

### Delete remote branch

`git push --delete origin feature/test`

### Delete local branch

`git branch -D feature/test`

### Rebase onto

Let's say you created a branch `feat/my-great` from `master` and pushed a bunch of commits.

Problem is, you should not have started your work from `master` but from `develop`.

```bash
git fetch
git rebase --onto develop master feat/my-great
```

## Tricks

### Use git credential helper to clone

`git -c credential.helper= clone --recursive --progress -- https://github.com/Shuunen/snippets.git C:/Users/me/Projets/snippets`
