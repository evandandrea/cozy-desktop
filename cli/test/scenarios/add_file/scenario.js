module.exports = {
  actions: [
    {type: '>', path: 'file'}
  ],
  expected: {
    prepCalls: [
      {method: 'addFileAsync', path: 'file'}
    ],
    tree: [
      'file2',
    ],
    remoteTrash: []
  }
}
