/* @flow */

import fs from 'fs'
import _ from 'lodash'

import type { Metadata } from '../metadata'
import type { ContextualizedChokidarFSEvent } from './chokidar_event'

export type PrepDeleteFolder = {type: 'PrepDeleteFolder', path: string, old: ?Metadata, ino: ?number}
export type PrepDeleteFile = {type: 'PrepDeleteFile', path: string, old: ?Metadata, ino: ?number}
export type PrepPutFolder = {type: 'PrepPutFolder', path: string, ino: number, stats: fs.Stats}
export type PrepUpdateFile = {type: 'PrepUpdateFile', path: string, ino: number, stats: fs.Stats, md5sum: string}
export type PrepAddFile = {type: 'PrepAddFile', path: string, ino: number, stats: fs.Stats, md5sum: string}
export type PrepMoveFile = {type: 'PrepMoveFile', path: string, old: Metadata, ino: number, stats: fs.Stats, md5sum: string}
export type PrepMoveFolder = {type: 'PrepMoveFolder', path: string, old: Metadata, ino: number, stats: fs.Stats}

export type PrepAction =
  | PrepDeleteFolder
  | PrepDeleteFile
  | PrepAddFile
  | PrepPutFolder
  | PrepUpdateFile
  | PrepMoveFile
  | PrepMoveFolder

// TODO: Introduce specific builders?
export const build = (type: string, path: string, opts?: {stats?: fs.Stats, md5sum?: string, old?: ?Metadata}): PrepAction => {
  const event: Object = _.assign({type, path}, opts)
  return event
}

export const maybeAddFile = (a: PrepAction): ?PrepAddFile => a.type === 'PrepAddFile' ? a : null
export const maybePutFolder = (a: PrepAction): ?PrepPutFolder => a.type === 'PrepPutFolder' ? a : null
export const maybeMoveFile = (a: PrepAction): ?PrepMoveFile => a.type === 'PrepMoveFile' ? a : null
export const maybeMoveFolder = (a: PrepAction): ?PrepMoveFolder => a.type === 'PrepMoveFolder' ? a : null
export const maybeDeleteFile = (a: PrepAction): ?PrepDeleteFile => a.type === 'PrepDeleteFile' ? a : null
export const maybeDeleteFolder = (a: PrepAction): ?PrepDeleteFolder => a.type === 'PrepDeleteFolder' ? a : null

export const find = <T>(actions: PrepAction[], maybeRightType: (PrepAction) => ?T, predicate: (T) => boolean, remove?: true): ?T => {
  for (let i=0; i<actions.length; i++) {
    const anyAction = actions[i]
    const rightTypeAction: ?T = maybeRightType(anyAction)
    if (rightTypeAction != null && predicate(rightTypeAction)) {
      if (remove) actions.splice(i, 1)
      return rightTypeAction
    }
  }
}

// TODO: Find by maybeType & inode?
// TODO: Maybe split find and remove?
export const findAndRemove = <T>(actions: PrepAction[], maybeRightType: (PrepAction) => ?T, predicate: (T) => boolean): ?T => {
  return find(actions, maybeRightType, predicate, true)
}

export const isChildMove = (a: PrepAction, b: PrepAction) => {
  return a.type === 'PrepMoveFolder' &&
         (b.type === 'PrepMoveFolder' || b.type === 'PrepMoveFile') &&
        b.path.indexOf(a.path) === 0 &&
        a.old && b.old &&
        b.old.path.indexOf(a.old.path) === 0
}

export const fromChokidar = (e: ContextualizedChokidarFSEvent) : PrepAction => {
  switch (e.type) {
    case 'unlinkDir':
      return {type: 'PrepDeleteFolder', path: e.path, old: e.old, ino: (e.old != null ? e.old.ino : null)}
    case 'unlink':
      return {type: 'PrepDeleteFile', path: e.path, old: e.old, ino: (e.old != null ? e.old.ino : null)}
    case 'addDir':
      return {type: 'PrepPutFolder', path: e.path, stats: e.stats, ino: e.stats.ino}
    case 'change':
      return {type: 'PrepUpdateFile', path: e.path, stats: e.stats, ino: e.stats.ino, md5sum: e.md5sum}
    case 'add':
      return {type: 'PrepAddFile', path: e.path, stats: e.stats, ino: e.stats.ino, md5sum: e.md5sum}
    default:
      throw new TypeError(`wrong type ${e.type}`) // @TODO FlowFixMe
  }
}
