

Phase sur les events



- Si j'ai un unlink+add sur une même inode --> Move
                  /\ Peu importe l'ordre

- Si j'ai un add sur une même inode qu'il y a unea action move -> Move & {dst}

- Else rajouter comme actions


// - SI j'ai un unlink sur un path que je connais pas (inode = null)


Phase 2 sur les actions

- squash les move si a.src descend de b.src & a.dst descend de b.dst

- unlink Sans Inode --> IGNORE7



classement
- ADDDIR (path croissant)
- ADD FILE
- MOVE?
- UNLINK FILE
- UNLINK DIR (path décroissant)





-------------------------------------------------



[add parent/dst1/dir]

add <-> path + (inode / checksum) -> Old?

Old.path = unlink.path

unlink <-> path


A -> partagé
A+A'
move A' dans Y
move A dans Z
