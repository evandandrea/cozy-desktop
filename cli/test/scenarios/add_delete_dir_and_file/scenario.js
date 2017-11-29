module.exports = {
  actions: [
    {type: 'mkdir', path: 'dir'},
    {type: '>', path: 'file'},
    {type: 'wait', ms: 1500},
    {type: 'delete', path: 'dir'},
    {type: 'delete', path: 'file'}
  ],
  expected: {
    prepCalls: [],
    tree: ['123'],
    remoteTrash: []
  }
}
