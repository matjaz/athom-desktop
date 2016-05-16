'use strict'

const electron = require('electron')
const Menu = electron.Menu
const app = electron.app

const name = app.getName()

let template = [{
  label: 'Window',
  role: 'window',
  submenu: [{
    label: 'Minimize',
    accelerator: 'CmdOrCtrl+M',
    role: 'minimize'
  }, {
    label: 'Close',
    accelerator: 'CmdOrCtrl+W',
    role: 'close'
  }]
}, {
  label: 'Help',
  role: 'help',
  submenu: [
    {
      label: 'Athom Website',
      click: openExternalHandler('https://www.athom.com/')
    }, {
      label: 'Athom Support',
      click: openExternalHandler('https://www.athom.com/support/')
    }, {
      label: 'Athom Forums',
      click: openExternalHandler('https://forum.athom.com/')
    }, {
      label: 'Athom Blog',
      click: openExternalHandler('https://blog.athom.com/')
    }, {
      label: 'Athom Developers',
      click: openExternalHandler('https://developers.athom.com/')
    }, {
      label: 'Athom chat',
      click: openExternalHandler('https://slack.athom.com/')
    }, {
      type: 'separator'
    }, {
      label: 'Athom Status',
      click: openExternalHandler('https://status.athom.com/')
    }
  ]
}]

function addUpdateMenuItems (items, position) {
  const version = app.getVersion()
  let updateItems = [{
    label: `Version ${version}`,
    enabled: false
  }, {
    label: 'Checking for Update',
    enabled: false,
    key: 'checkingForUpdate'
  }, {
    label: 'Check for Update',
    visible: false,
    key: 'checkForUpdate',
    click: function () {
      require('electron').autoUpdater.checkForUpdates()
    }
  }, {
    label: 'Restart and Install Update',
    visible: false,
    key: 'restartToUpdate',
    click: function () {
      electron.autoUpdater.quitAndInstall()
    }
  }]

  items.splice.apply(items, [position, 0].concat(updateItems))
}

if (process.platform === 'darwin') {
  template.unshift({
    label: name,
    submenu: [{
      label: `About ${name}`,
      role: 'about'
    }, {
      type: 'separator'
    }, {
      label: 'Services',
      role: 'services',
      submenu: []
    }, {
      type: 'separator'
    }, {
      label: `Hide ${name}`,
      accelerator: 'Command+H',
      role: 'hide'
    }, {
      label: 'Hide Others',
      accelerator: 'Command+Alt+H',
      role: 'hideothers'
    }, {
      label: 'Show All',
      role: 'unhide'
    }, {
      type: 'separator'
    }, {
      label: `Quit ${name}`,
      accelerator: 'Command+Q',
      click: function () {
        app.quit()
      }
    }]
  })
  // Window menu.
  template[1].submenu.push({
    type: 'separator'
  }, {
    label: 'Bring All to Front',
    role: 'front'
  })

  addUpdateMenuItems(template[0].submenu, 1)
} else if (process.platform === 'win32') {
  const helpMenu = template[template.length - 1].submenu
  addUpdateMenuItems(helpMenu, 0)
}

function openExternalHandler (url) {
  return electron.shell.openExternal.bind(electron.shell, url)
}

app.on('ready', function () {
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
})
