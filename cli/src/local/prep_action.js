/* @flow */

import fs from 'fs'
import type {Metadata} from '../metadata'
import type {ContextualizedChokidarFSEvent} from './chokidar_event'

export type UnlinkDir = {type: 'UnlinkDir', path: string, ino: ?number}
export type UnlinkFile = {type: 'UnlinkFile', path: string, ino: ?number}
export type AddDir = {type: 'AddDir', path: string, ino: number, stats: fs.Stats}
export type Change = {type: 'Change', path: string, ino: number, stats: fs.Stats, md5sum: string}
export type AddFile = {type: 'AddFile', path: string, ino: number, stats: fs.Stats, md5sum: string}
export type MoveFile = {type: 'AddFile', path: string, ino: number, stats: fs.Stats, md5sum: string, old: Metadata}
export type MoveDir = {type: 'MoveDir', path: string, ino: number, stats: fs.Stats, old: Metadata}

export type PrepAction =
  | UnlinkDir
  | UnlinkFile
  | AddFile
  | AddDir
  | Change
  | MoveFile
  | MoveDir

export const build = (type: string, path?: string, stats?: fs.Stats, md5sum?: string, old?: ?Metadata): PrepAction => {
  const event: Object = {type, path, stats, md5sum, old}
  return event
}

export const fromChokidar = (e: ContextualizedChokidarFSEvent) : PrepAction => {
  switch (e.type) {
    case 'unlinkDir': return build('UnlinkDir', e.path)
    case 'unlink': return build('UnlinkFile', e.path)
    case 'addDir': return build('AddDir', e.path, e.stats)
    case 'change': return build('Change', e.path, e.stats, e.md5sum)
    case 'add': return build('AddFile', e.path, e.stats, e.md5sum)
    default: throw new TypeError(`wrong type ${e.type}`) // @TODO FlowFixMe
  }
}
