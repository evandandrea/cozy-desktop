/* eslint-env mocha */
/* @flow */

import Promise from 'bluebird'
import fs from 'fs-extra'
import path from 'path'
import should from 'should'
import sinon from 'sinon'

import Watcher from '../../../src/local/watcher'
import * as metadata from '../../../src/metadata'

import { scenarios, loadFSEvents } from '../../fixtures/local_watcher'
import configHelpers from '../../helpers/config'
import pouchHelpers from '../../helpers/pouch'

class SpyPrep {
  calls: *

  constructor () {
    this.calls = []

    this.stub('addFileAsync')
    this.stub('moveFileAsync')
    this.stub('putFolderAsync')
    this.stub('trashFileAsync')
    this.stub('trashFolderAsync')
    this.stub('updateFileAsync')
  }

  stub (method: string) {
    // $FlowFixMe
    this[method] = (side, doc, was) => {
      if (was != null) {
        this.calls.push({method, dst: doc.path, src: was.path})
      } else {
        this.calls.push({method, path: doc.path})
      }
      return Promise.resolve()
    }
  }
}

describe('LocalWatcher fixtures', () => {
  let watcher, eventHandlers, prep
  before('instanciate config', configHelpers.createConfig)
  // FIXME: beforeEach for pouch?
  beforeEach('instanciate pouch', pouchHelpers.createDatabase)
  beforeEach('instanciate local watcher', async function () {
    prep = new SpyPrep()
    // $FlowFixMe
    watcher = new Watcher(this.syncPath, prep, this.pouch)
  })

  const { platform } = process

  let abspath

  beforeEach(function () {
    abspath = (relpath) => path.join(this.syncPath, relpath.replace(/\//g, path.sep))
  })

  afterEach('destroy pouch', pouchHelpers.cleanDatabase)

  for (let scenario of scenarios) {
    describe(scenario.name, () => {
      if (scenario.init != null) {
        beforeEach('init', async function () {
          for (let relpath of scenario.init) {
            if (relpath.endsWith('/')) {
              console.log('- mkdir', relpath)
              await fs.ensureDir(abspath(relpath))
              this.pouch.put({
                _id: metadata.id(relpath),
                docType: 'folder',
                updated_at: new Date(),
                path: relpath,
                tags: [],
                sides: {local: 1, remote: 1}
              })
            } else {
              console.log('- >', relpath)
              await fs.outputFile(abspath(relpath), '')
              this.pouch.put({
                _id: metadata.id(relpath),
                md5sum: '1B2M2Y8AsgTpgAmY7PhCfg==', // ''
                class: 'text',
                docType: 'file',
                executable: false,
                updated_at: new Date(),
                mime: 'text/plain',
                path: relpath,
                size: 0,
                tags: [],
                sides: {local: 1, remote: 1}
              })
            }
          }
        })
      }

      beforeEach('init actions', async () => {
        for (let action of scenario.actions) {
          switch (action.type) {
            case 'mkdir':
              console.log('- mkdir', action.path)
              await fs.ensureDir(abspath(action.path))
              break

            case 'rm':
              console.log('- rm', action.path)
              await fs.remove(abspath(action.path))
              break

            case 'mv':
              console.log('- mv', action.src, action.dst)
              await fs.move(abspath(action.src), abspath(action.dst))
              break

            default:
              throw new Error(`Unknown action ${action.type} for scenario ${scenario.name}`)
          }
        }
      })

      it(`runs on ${platform}`, async () => {
        const events = await loadFSEvents(scenario, platform)
        for (let e of events) {
          if (e.stats) {
            e.stats.mtime = new Date(e.stats.mtime)
            e.stats.ctime = new Date(e.stats.ctime)
          }
        }
        await watcher.onFlush(events)
        if (scenario.expected && scenario.expected.prepCalls) {
          should(prep.calls).deepEqual(scenario.expected.prepCalls)
        }
      })
    })
  }
})