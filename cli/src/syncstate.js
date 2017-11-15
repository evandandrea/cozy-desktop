import EventEmitter from 'events'

export default class SyncState extends EventEmitter {
  syncLastSeq: number
  syncCurrentSeq: number
  buffering: boolean
  syncSyncing: boolean
  localSyncing: boolean
  remoteSyncing: boolean

  shouldSpin () {
    return this.localSyncing || this.remoteSyncing || this.syncSyncing
  }

  emitStatus () {
    const label = this.syncSyncing ? 'sync'
                   : this.localSyncing || this.remoteSyncing ? 'squashprepmerge'
                   : this.buffering ? 'buffering'
                   : 'uptodate'

    super.emit('sync-status', {
      label: label,
      remaining: this.syncLastSeq - this.syncCurrentSeq
    })

    if (this.wasSpinning && !this.shouldSpin()) {
      this.emit('up-to-date')
    }

    if (this.shouldSpin() && !this.wasSpinning) {
      this.emit('syncing')
    }
  }

  emit (name, ...args) {
    this.wasSpinning = this.shouldSpin()
    switch (name) {
      case 'buffering-start':
        this.buffer = true
        break
      case 'buffering-end':
        this.buffering = false
        break
      case 'local-start':
        this.localSyncing = true
        this.emitStatus()
        break
      case 'remote-start':
        this.remoteSyncing = true
        this.emitStatus()
        break
      case 'sync-start':
        this.syncSyncing = true
        this.emitStatus()
        break
      case 'local-end':
        this.localSyncing = false
        this.emitStatus()
        break
      case 'remote-end':
        this.remoteSyncing = false
        this.emitStatus()
        break
      case 'sync-end':
        this.syncSyncing = false
        this.emitStatus()
        break
      case 'sync-target':
        if (args[0] !== -1) this.syncLastSeq = args[0]
        this.emitStatus()
        break
      case 'sync-current':
        this.syncCurrentSeq = args[0]
        this.emitStatus()
        break
      default:
        super.emit(name, ...args)
    }
  }
}
