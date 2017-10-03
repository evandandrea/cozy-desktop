module.exports = {
  init: [
    { ino: 1, path: 'parent/' },
    { ino: 2, path: 'parent/dst/' },
    { ino: 3, path: 'parent/src/' },
    { ino: 4, path: 'parent/src/dir/' },
    { ino: 5, path: 'parent/src/dir/empty-subdir/' },
    { ino: 6, path: 'parent/src/dir/subdir/' },
    { ino: 7, path: 'parent/src/dir/subdir/file' }
  ],
  actions: [
    {type: 'mv', src: 'parent/src/dir', dst: 'parent/dst/dir'}
  ],
  expected: {
    prepCalls: [
      {method: 'moveFolderAsync', dst: 'parent/dst/dir', src: 'parent/src/dir'}
    ]
  }
}
