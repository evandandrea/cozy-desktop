// TODO: add a scenario with actions in reverse order

module.exports = {
  init: [
    { ino: 1, path: 'parent/' },
    { ino: 3, path: 'parent/dst/' },
    { ino: 4, path: 'parent/src/' },
    { ino: 5, path: 'parent/src/dir/' },
    { ino: 6, path: 'parent/src/dir/empty-subdir/' },
    { ino: 7, path: 'parent/src/dir/subdir/' },
    { ino: 8, path: 'parent/src/dir/subdir/foo/' },
    { ino: 9, path: 'parent/src/dir/subdir/bar/' }
  ],
  actions: [
    {type: 'mv', src: 'parent/src/dir/subdir/foo', dst: 'parent/src/dir/subdir/foo-renamed'},
    {type: 'mv', src: 'parent/src/dir', dst: 'parent/dst/dir'},
    {type: 'mv', src: 'parent/dst/dir/subdir/bar', dst: 'parent/dst/dir/subdir/bar-renamed'}
  ],
  expected: {
    prepCalls: [
      {method: 'moveFolderAsync', dst: 'parent/dst/dir', src: 'parent/src/dir'},
      {method: 'moveFolderAsync', dst: 'parent/dst/dir/subdir/foo-renamed', src: 'parent/dst/dir/subdir/foo'},
      {method: 'moveFolderAsync', dst: 'parent/dst/dir/subdir/bar-renamed', src: 'parent/dst/dir/subdir/bar'}
    ],
    savedChanges: [
      // FIXME: init changes? unmerged?
      {path: 'parent'},
      {path: 'parent/dst'},
      {path: 'parent/src'},
      {path: 'parent/src/dir'},
      {path: 'parent/src/dir/empty-subdir'},
      {path: 'parent/src/dir/subdir'},
      {path: 'parent/src/dir/subdir/foo'},
      {path: 'parent/src/dir/subdir/bar'},

      // parent/src/dir -> parent/dst/dir
      {path: 'parent/src/dir', _deleted: true, moveTo: 'PARENT/DST/DIR'},
      {path: 'parent/dst/dir'},
      {path: 'parent/src/dir/empty-subdir', _deleted: true, moveTo: 'PARENT/DST/DIR/EMPTY-SUBDIR', childMove: true},
      {path: 'parent/dst/dir/empty-subdir'},
      {path: 'parent/src/dir/subdir', _deleted: true, moveTo: 'PARENT/DST/DIR/SUBDIR', childMove: true},
      {path: 'parent/dst/dir/subdir'},
      {path: 'parent/src/dir/subdir/bar', _deleted: true, moveTo: 'PARENT/DST/DIR/SUBDIR/BAR', childMove: true},
      {path: 'parent/dst/dir/subdir/bar'},
      {path: 'parent/src/dir/subdir/foo', _deleted: true, moveTo: 'PARENT/DST/DIR/SUBDIR/FOO', childMove: true},
      {path: 'parent/dst/dir/subdir/foo'},

      // parent/dst/dir/subdir/bar -> parent/dst/dir/subdir/bar-renamed
      {path: 'parent/dst/dir/subdir/bar', _deleted: true, moveTo: 'PARENT/DST/DIR/SUBDIR/BAR-RENAMED'},
      {path: 'parent/dst/dir/subdir/bar-renamed'},

      // parent/dst/dir/subdir/foo -> parent/dst/dir/subdir/foo-renamed
      {path: 'parent/dst/dir/subdir/foo', _deleted: true, moveTo: 'PARENT/DST/DIR/SUBDIR/FOO-RENAMED'},
      {path: 'parent/dst/dir/subdir/foo-renamed'},

      // FIXME: ???
      {path: 'parent/dst/dir'},
      {path: 'parent/dst/dir/empty-subdir'},
      {path: 'parent/dst/dir/subdir'}
    ],
    appliedChanges: [
      // FIXME: init changes? unmerged?
      {path: 'parent'},
      {path: 'parent/dst'},
      {path: 'parent/src'},

      // parent/src/dir -> parent/dst/dir
      {path: 'parent/src/dir', _deleted: true, moveTo: 'PARENT/DST/DIR'},
      {path: 'parent/dst/dir'},
      {path: 'parent/src/dir/empty-subdir', _deleted: true, moveTo: 'PARENT/DST/DIR/EMPTY-SUBDIR', childMove: true},
      {path: 'parent/dst/dir/empty-subdir'},
      {path: 'parent/src/dir/subdir', _deleted: true, moveTo: 'PARENT/DST/DIR/SUBDIR', childMove: true},
      {path: 'parent/dst/dir/subdir'},
      {path: 'parent/src/dir/subdir/bar', _deleted: true, moveTo: 'PARENT/DST/DIR/SUBDIR/BAR', childMove: true},
      // {path: 'parent/dst/dir/subdir/bar'},
      {path: 'parent/src/dir/subdir/foo', _deleted: true, moveTo: 'PARENT/DST/DIR/SUBDIR/FOO', childMove: true},
      // {path: 'parent/dst/dir/subdir/foo'},

      // parent/dst/dir/subdir/bar -> parent/dst/dir/subdir/bar-renamed
      {path: 'parent/dst/dir/subdir/bar', _deleted: true, moveTo: 'PARENT/DST/DIR/SUBDIR/BAR-RENAMED'},
      {path: 'parent/dst/dir/subdir/bar-renamed'},

      // parent/dst/dir/subdir/foo -> parent/dst/dir/subdir/foo-renamed
      {path: 'parent/dst/dir/subdir/foo', _deleted: true, moveTo: 'PARENT/DST/DIR/SUBDIR/FOO-RENAMED'},
      {path: 'parent/dst/dir/subdir/foo-renamed'},

      // FIXME: ???
      {path: 'parent/dst/dir'},
      {path: 'parent/dst/dir/empty-subdir'},
      {path: 'parent/dst/dir/subdir'},

      // FIXME: Failed changes?
      {path: 'parent/src/dir/subdir/foo', _deleted: true, moveTo: 'PARENT/DST/DIR/SUBDIR/FOO', childMove: true},
      {path: 'parent/dst/dir/subdir/bar', _deleted: true, moveTo: 'PARENT/DST/DIR/SUBDIR/BAR-RENAMED'},
      {path: 'parent/dst/dir/subdir/bar-renamed'},
      {path: 'parent/dst/dir/subdir/foo', _deleted: true, moveTo: 'PARENT/DST/DIR/SUBDIR/FOO-RENAMED'},
      {path: 'parent/dst/dir/subdir/foo-renamed'},

      // FIXME: Failed changes again?
      {path: 'parent/src/dir/subdir/foo', _deleted: true, moveTo: 'PARENT/DST/DIR/SUBDIR/FOO', childMove: true},
      {path: 'parent/dst/dir/subdir/bar', _deleted: true, moveTo: 'PARENT/DST/DIR/SUBDIR/BAR-RENAMED'},
      {path: 'parent/dst/dir/subdir/bar-renamed'},
      {path: 'parent/dst/dir/subdir/foo', _deleted: true, moveTo: 'PARENT/DST/DIR/SUBDIR/FOO-RENAMED'},
      {path: 'parent/dst/dir/subdir/foo-renamed'}
    ],
    tree: [
      'parent/',
      'parent/dst/',
      'parent/dst/dir/',
      'parent/dst/dir/empty-subdir/',
      'parent/dst/dir/subdir/',
      'parent/dst/dir/subdir/bar-renamed/',
      'parent/dst/dir/subdir/foo-renamed/',
      'parent/src/'
    ],
    remoteTrash: []
  }
}
