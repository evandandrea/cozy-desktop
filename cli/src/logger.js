/* @flow weak */

import bunyan from 'bunyan'
import fs from 'fs-extra'
import os from 'os'
import path from 'path'
import _ from 'lodash'

export const LOG_DIR = path.join(process.env.COZY_DESKTOP_DIR || os.homedir(), '.cozy-desktop')
export const LOG_FILENAME = 'logs.txt'
export const LOG_FILE = path.join(LOG_DIR, LOG_FILENAME)

fs.ensureDirSync(LOG_DIR)

export const defaultLogger = bunyan.createLogger({
  name: 'Cozy Desktop',
  level: 'trace',
  serializers: {
    err: bunyan.stdSerializers.err
  },
  streams: [
    {
      type: 'rotating-file',
      path: LOG_FILE,
      period: '1d',
      count: 7
    }
  ]
})

export const DEBUG_LOG_PATH = 'debug.log'

export const deleteDebugLogSync = () => {
  if (fs.existsSync(DEBUG_LOG_PATH)) fs.unlinkSync(DEBUG_LOG_PATH)
}

if (process.env.DEBUG) {
  deleteDebugLogSync()
  defaultLogger.addStream({
    type: 'file',
    path: DEBUG_LOG_PATH,
    level: 'trace'
  })
}
if (process.env.TESTDEBUG) {
  defaultLogger.addStream({
    type: 'raw',
    level: process.env.TESTDEBUG,
    stream: {
      write: function (msg) {
        console.log(msg.component, msg.path || '', msg.msg, _.omit(msg, ['component', 'pid', 'name', 'hostname', 'level', 'time', 'v', 'msg']))
      }
    }
  })
}

function logger (options) {
  return defaultLogger.child(options)
}

export default logger
