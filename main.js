'use strict'

const path = require('path')
const glob = require('glob')
const electron = require('electron')
const autoUpdater = require('./auto-updater')

const app = electron.app

var updateWindowTitleTimeout
var mainWindow = null

function createWindow () {
  const screenSize = electron.screen.getPrimaryDisplay().workAreaSize
  const userAgent = ['Athom', app.getVersion(), process.platform, process.arch].join('|')
  const windowOptions = {
    show: false,
    title: 'Athom',
    width: Math.round(0.9 * screenSize.width),
    height: Math.round(0.9 * screenSize.height),
    minWidth: 680,
    webPreferences: {
      nodeIntegration: false,
      partition: 'persist:athom-desktop'
    }
  }

  if (process.platform === 'linux') {
    windowOptions.icon = path.join(__dirname, '/assets/app-icon/png/512.png')
  }

  mainWindow = new electron.BrowserWindow(windowOptions)
  mainWindow.loadURL('https://my.athom.com', {
    userAgent: userAgent
  })

  // debounce the title to prevent redirect uglyness
  mainWindow.on('page-title-updated', e => {
    const isMyAthom = mainWindow.webContents.getURL().includes('my.athom.com')
    const title = isMyAthom ? 'My Athom' : mainWindow.webContents.getTitle()

    if (updateWindowTitleTimeout) {
      clearTimeout(updateWindowTitleTimeout)
    }
    updateWindowTitleTimeout = setTimeout(() => {
      mainWindow.setTitle(title)
    }, 350)

    e.preventDefault()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents
    // on new window
    .on('new-window', (e, url, frameName) => {
      if (frameName !== 'pair_dialog') {
        e.preventDefault()
        electron.shell.openExternal(url)
      }
    })
    // show window on load
    .on('did-finish-load', () => mainWindow.show())
}

function initialize () {
  const shouldQuit = makeSingleInstance()
  if (shouldQuit) return app.quit()

  loadMainFiles()
  autoUpdater.updateMenu()

  app.on('ready', () => {
    createWindow()
    autoUpdater.initialize()
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('activate', () => {
    if (mainWindow === null) {
      createWindow()
    }
  })
}

// Make this app a single instance app.
//
// The main window will be restored and focused instead of a second window
// opened when a person attempts to launch a second instance.
//
// Returns true if the current version of the app should quit instead of
// launching.
function makeSingleInstance () {
  return app.makeSingleInstance(() => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

// Require each JS file in the main-process dir
function loadMainFiles () {
  var files = glob.sync(path.join(__dirname, 'main-process/**/*.js'))
  files.forEach(file => require(file))
}

// Handle Squirrel on Windows startup events
switch (process.argv[1]) {
  case '--squirrel-install':
  case '--squirrel-updated':
    autoUpdater.createShortcut(() => app.quit())
    break
  case '--squirrel-uninstall':
    autoUpdater.removeShortcut(() => app.quit())
    break
  case '--squirrel-obsolete':
    app.quit()
    break
  default:
    initialize()
}
