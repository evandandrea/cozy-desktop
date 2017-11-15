'use strict'

require('babel-polyfill')

const childProcess = require('child_process')
const Desktop = require('cozy-desktop').default
const electron = require('electron')
const notify = require('electron-main-notification')

const debounce = require('lodash.debounce')
const path = require('path')
// const uuid = require('node-uuid')

const autoLaunch = require('./src/main/autolaunch')
const lastFiles = require('./src/main/lastfiles')
const {selectIcon} = require('./src/main/fileutils')
const {buildAppMenu} = require('./src/main/appmenu')
const {autoUpdater} = require('./src/main/autoupdate')
const {addFileManagerShortcut} = require('./src/main/shortcut')
const {init: i18nInit, translate} = require('./src/main/i18n')
const {incompatibilitiesErrorMessage} = require('./src/main/incompatibilitiesmsg')
const {spawn} = childProcess
const {app, BrowserWindow, dialog, ipcMain, Menu, shell, session} = electron

const log = Desktop.logger({
  component: 'GUI'
})
process.on('uncaughtException', (err) => log.error(err))
let desktop

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
let tray
let diskTimeout

let state = 'not-configured'
let errorMessage = ''
let newReleaseAvailable = false

const ONBOARDING_SCREEN_WIDTH = 768
const ONBOARDING_SCREEN_HEIGHT = 570
const LOGIN_SCREEN_WIDTH = ONBOARDING_SCREEN_WIDTH
const LOGIN_SCREEN_HEIGHT = 700
const OAUTH_SCREEN_WIDTH = ONBOARDING_SCREEN_WIDTH
const OAUTH_SCREEN_HEIGHT = 930
const DASHBOARD_SCREEN_WIDTH = 1000
const DASHBOARD_SCREEN_HEIGHT = 1000

const showWindow = () => {
  if (mainWindow) {
    mainWindow.focus()
  } else {
    createWindow()
  }
}

const sendToMainWindow = (...args) => {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send(...args)
  }
}

const sendErrorToMainWindow = (msg) => {
  if (msg === 'Client has been revoked') {
    msg = translate('Revoked It looks like you have revoked your client from your Cozy')
    sendToMainWindow('revoked')
  } else if (msg === 'Cozy is full' || msg === 'No more disk space') {
    msg = translate('Error ' + msg)
    sendToMainWindow('sync-error', msg)
  } else {
    sendToMainWindow('sync-error', msg)
  }
  notify('Cozy Drive', { body: msg })
}

const goToTab = (tab) => {
  const alreadyShown = !!mainWindow
  showWindow()
  if (alreadyShown) {
    sendToMainWindow('go-to-tab', tab)
  } else {
    mainWindow.webContents.once('dom-ready', () => {
      sendToMainWindow('go-to-tab', tab)
    })
  }
}

const goToMyCozy = () => {
  shell.openExternal(desktop.config.cozyUrl)
}

const openCozyFolder = () => {
  shell.openItem(desktop.config.syncPath)
}

const updateState = (newState, filename) => {
  if (state === 'error' && newState === 'offline') {
    return
  }
  state = newState
  let statusLabel = ''
  if (state === 'error') {
    tray.setState('error')
    statusLabel = errorMessage = filename
  } else if (filename) {
    tray.setState('sync')
    statusLabel = `${translate('Tray Syncing')} ‟${filename}“`
  } else if (state === 'up-to-date' || state === 'online') {
    tray.setState('idle')
    statusLabel = translate('Tray Your cozy is up to date')
  } else if (state === 'syncing') {
    tray.setState('sync')
    statusLabel = translate('Tray Syncing') + '…'
  } else if (state === 'offline') {
    tray.setState('pause')
    statusLabel = translate('Tray Offline')
  }
  const menu = Menu.buildFromTemplate([
    { label: statusLabel, enabled: false },
    { type: 'separator' },
    { label: translate('Tray Open Cozy folder'), click: openCozyFolder },
    { label: translate('Tray Go to my Cozy'), click: goToMyCozy },
    { type: 'separator' },
    { label: translate('Tray Help'), click: goToTab.bind(null, 'help') },
    { label: translate('Tray Settings'), click: goToTab.bind(null, 'settings') },
    { type: 'separator' },
    { label: translate('Tray Quit application'), click: app.quit }
  ])
  if (!mainWindow) {
    menu.insert(2, new electron.MenuItem({
      label: translate('Tray Show application'), click: showWindow
    }))
  }
  if (state === 'error') {
    menu.insert(2, new electron.MenuItem({
      label: translate('Tray Relaunch synchronization'), click: () => { startSync(true) }
    }))
  }
  if (newReleaseAvailable) {
    menu.insert(2, new electron.MenuItem({
      label: translate('Tray A new release is available'), click: goToTab.bind(null, 'settings')
    }))
  }
  tray.setContextMenu(menu)
  tray.setToolTip(statusLabel)
}

const addFile = (info) => {
  const file = {
    filename: path.basename(info.path),
    path: info.path,
    icon: selectIcon(info),
    size: info.size || 0,
    updated: +new Date()
  }
  updateState('syncing', file.filename)
  lastFiles.add(file)
  sendToMainWindow('transfer', file)
  lastFiles.persists()
}

const removeFile = (info) => {
  const file = {
    filename: path.basename(info.path),
    path: info.path,
    icon: '',
    size: 0,
    updated: 0
  }
  lastFiles.remove(file)
  sendToMainWindow('delete-file', file)
  lastFiles.persists()
}

const sendDiskUsage = () => {
  if (diskTimeout) {
    clearTimeout(diskTimeout)
    diskTimeout = null
  }
  if (mainWindow) {
    diskTimeout = setTimeout(sendDiskUsage, 10 * 60 * 1000)  // every 10 minutes
    desktop.diskUsage().then(
      (res) => {
        const space = {
          used: +res.attributes.used,
          quota: +res.attributes.quota
        }
        sendToMainWindow('disk-space', space)
      },
      (err) => log.error(err)
    )
  }
}

const startSync = (force) => {
  if (mainWindow) mainWindow.setContentSize(DASHBOARD_SCREEN_WIDTH, DASHBOARD_SCREEN_HEIGHT)
  sendToMainWindow('synchronization', desktop.config.cozyUrl, desktop.config.deviceName)
  for (let file of lastFiles.list()) {
    sendToMainWindow('transfer', file)
  }
  if (desktop.sync && !force) {
    if (state === 'up-to-date' || state === 'online') {
      sendToMainWindow('up-to-date')
    } else if (state === 'offline') {
      sendToMainWindow('offline')
    } else if (state === 'error') {
      sendErrorToMainWindow(errorMessage)
    }
    sendDiskUsage()
  } else {
    updateState('syncing')
    desktop.events.on('syncing', () => {
      updateState('syncing')
      sendToMainWindow('syncing')
    })
    desktop.events.on('up-to-date', () => {
      updateState('up-to-date')
      sendToMainWindow('up-to-date')
    })
    desktop.events.on('online', () => {
      updateState('online')
      sendToMainWindow('up-to-date')
    })
    desktop.events.on('offline', () => {
      updateState('offline')
      sendToMainWindow('offline')
    })
    desktop.events.on('transfer-started', addFile)
    desktop.events.on('transfer-copy', addFile)
    desktop.events.on('transfer-move', (info, old) => {
      addFile(info)
      removeFile(old)
    })
    const notifyIncompatibilities = debounce(
      (incompatibilities) => {
        sendErrorToMainWindow(incompatibilitiesErrorMessage(incompatibilities))
      },
      5000,
      {leading: true}
    )
    desktop.events.on('platform-incompatibilities', incompatibilitiesList => {
      incompatibilitiesList.forEach(incompatibilities => {
        notifyIncompatibilities(incompatibilities)
      })
    })
    desktop.events.on('delete-file', removeFile)
    desktop.synchronize('full')
      .then(() => sendErrorToMainWindow('stopped'))
      .catch((err) => {
        log.error(err)
        updateState('error', err.message)
        sendDiskUsage()
        sendErrorToMainWindow(err.message)
      })
    sendDiskUsage()
  }
  autoLaunch.isEnabled().then((enabled) => {
    sendToMainWindow('auto-launch', enabled)
  })
}

const appLoaded = () => {
  if (!desktop.config.isValid()) {
    return
  }
  if (desktop.config.syncPath) {
    setTimeout(startSync, 20)
  } else {
    setTimeout(() => sendToMainWindow('registration-done'), 20)
  }
}

const createWindow = () => {
  let windowOptions = {icon: `${__dirname}/images/icon.png`}
  if (desktop && desktop.config.syncPath) {
    windowOptions.width = DASHBOARD_SCREEN_WIDTH
    windowOptions.height = DASHBOARD_SCREEN_HEIGHT
  } else {
    windowOptions.width = ONBOARDING_SCREEN_WIDTH
    windowOptions.height = ONBOARDING_SCREEN_HEIGHT
  }
  mainWindow = new BrowserWindow(windowOptions)
  mainWindow.loadURL(`file://${__dirname}/index.html`)
  if (process.env.WATCH === 'true' || process.env.DEBUG === 'true') {
    mainWindow.webContents.openDevTools({mode: 'detach'})
  } else {
    mainWindow.setMenu(null)
  }
  mainWindow.on('closed', () => {
    if (process.platform === 'darwin') { app.dock.hide() }
    mainWindow = null
  })
  mainWindow.webContents.on('dom-ready', appLoaded)
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('http') && !url.match('/auth/authorize')) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })
  if (process.platform === 'darwin') { app.dock.show() }
}

const shouldExit = app.makeSingleInstance(showWindow)
if (shouldExit) {
  log.warn('Cozy Drive is already running. Exiting...')
  app.exit()
}

app.on('ready', () => {
  desktop = new Desktop(process.env.COZY_DESKTOP_DIR)

  lastFiles.init(desktop)
  i18nInit(app)
  if (process.argv.indexOf('--hidden') === -1) {
    createWindow()
  } else {
    appLoaded()
  }
  tray = new electron.Tray(`${__dirname}/images/tray-icon-linux/idle.png`)
  tray.setState('idle')
  const menu = electron.Menu.buildFromTemplate([
    { label: translate('Tray Show application'), click: showWindow },
    { label: translate('Tray Quit application'), click: app.quit }
  ])
  tray.setContextMenu(menu)
  tray.on('click', showWindow)
  tray.on('')

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', showWindow)
})

// Don't quit the app when all windows are closed, keep the tray icon
// See http://electron.atom.io/docs/api/app/#event-window-all-closed
app.on('window-all-closed', () => {})

ipcMain.on('register-remote', (event, arg) => {
  const cozyUrl = desktop.checkCozyUrl(arg.cozyUrl)
  desktop.config.cozyUrl = cozyUrl
  const onRegistered = (client, url) => {
    let resolveP
    const promise = new Promise((resolve) => { resolveP = resolve })
    mainWindow.setContentSize(LOGIN_SCREEN_WIDTH, LOGIN_SCREEN_HEIGHT, true)
    mainWindow.loadURL(url)
    mainWindow.webContents.on('did-get-response-details', (event, status, newUrl, originalUrl, httpResponseCode) => {
      if (newUrl.match(/\/auth\/authorize\?/) && httpResponseCode === 200) {
        const bounds = mainWindow.getBounds()
        const display = electron.screen.getDisplayMatching(bounds)
        const height = Math.min(display.workAreaSize.height - bounds.y, OAUTH_SCREEN_HEIGHT)
        mainWindow.setSize(OAUTH_SCREEN_WIDTH, height, true)
      }
    })
    mainWindow.webContents.on('did-get-redirect-request', (event, oldUrl, newUrl) => {
      if (newUrl.match('file://')) {
        mainWindow.setContentSize(ONBOARDING_SCREEN_WIDTH, ONBOARDING_SCREEN_HEIGHT, true)
        resolveP(newUrl)
      }
    })
    return promise
  }
  desktop.registerRemote(cozyUrl, arg.location, onRegistered)
    .then(
      (reg) => {
        session.defaultSession.clearStorageData()
        mainWindow.loadURL(reg.client.redirectURI)
        autoLaunch.setEnabled(true)
      },
      (err) => {
        log.error(err)
        event.sender.send('registration-error', translate('Address No cozy instance at this address!'))
      }
    )
})

ipcMain.on('choose-folder', (event) => {
  let folders = dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory']
  })
  if (folders && folders.length > 0) {
    event.sender.send('folder-chosen', folders[0])
  }
})

ipcMain.on('start-sync', (event, syncPath) => {
  if (!desktop.config.isValid()) {
    log.error('No client!')
    return
  }
  try {
    desktop.saveConfig(desktop.config.cozyUrl, syncPath)
    try {
      addFileManagerShortcut(desktop.config)
    } catch (err) { log.error(err) }
    startSync()
  } catch (err) {
    log.error(err)
    event.sender.send('folder-error', translate('Error Invalid path'))
  }
})

ipcMain.on('quit-and-install', () => {
  autoUpdater.quitAndInstall()
})

ipcMain.on('auto-launcher', (event, enabled) => autoLaunch.setEnabled(enabled))

ipcMain.on('logout', () => {
  desktop.removeConfig()
  sendToMainWindow('unlinked')
})

ipcMain.on('unlink-cozy', () => {
  if (!desktop.config.isValid()) {
    log.error('No client!')
    return
  }
  const options = {
    type: 'question',
    title: translate('Unlink Title'),
    message: translate('Unlink Message'),
    detail: translate('Unlink Detail'),
    buttons: [translate('Unlink Cancel'), translate('Unlink OK')],
    cancelId: 0,
    defaultId: 1
  }
  dialog.showMessageBox(mainWindow, options, (response) => {
    if (response === 0) {
      sendToMainWindow('cancel-unlink')
      return
    }
    desktop.stopSync().then(() => {
      desktop.removeRemote()
        .then(() => log.info('removed'))
        .then(() => sendToMainWindow('unlinked'))
        .catch((err) => log.error(err))
    })
  })
})

function serializeError (err) {
  return {message: err.message, name: err.name, stack: err.stack}
}

ipcMain.on('send-mail', (event, body) => {
  desktop.sendMailToSupport(body).then(
    () => { event.sender.send('mail-sent') },
    (err) => { event.sender.send('mail-sent', serializeError(err)) }
  )
})

ipcMain.on('restart', () => {
  setTimeout(app.quit, 50)
  const args = process.argv.slice(1).filter(a => a !== '--isHidden')
  spawn(process.argv[0], args, { detached: true })
})

// On watch mode, automatically reload the window when sources are updated
if (process.env.WATCH === 'true') {
  const chokidar = require('chokidar')
  chokidar.watch(['*.{html,js,css}'], { cwd: __dirname })
    .on('change', () => {
      if (mainWindow) {
        mainWindow.reload()
      }
    })
} else {
  app.once('ready', () => {
    Menu.setApplicationMenu(buildAppMenu(app))
    autoUpdater.checkForNewRelease()
    .addListener('update-downloaded', (updateInfo) => {
      const releaseName = updateInfo.version || 'unknown'
      const releaseNotes = updateInfo.releaseName || `New version ${releaseName} available`
      newReleaseAvailable = true
      sendToMainWindow('new-release-available', releaseNotes, releaseName)
    })
  })
}

// Network requests can be stuck with Electron on Linux inside the event loop.
// A hack to deblock them is push some events in the event loop.
// See https://github.com/electron/electron/issues/7083#issuecomment-262038387
// And https://github.com/electron/electron/issues/1833
if (process.platform === 'linux') {
  setInterval(() => {}, 1000)
}
