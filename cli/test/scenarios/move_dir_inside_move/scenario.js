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
