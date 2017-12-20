#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const baseConfig = {
  'appId': 'io.cozy.desktop',
  'files': [
    'gui/app.css',
    'core-built/**',
    'gui/elm.js',
    'gui/fonts',
    'gui/images',
    'gui/index.html',
    'gui/locales',
    'gui/main.js',
    'gui/node_modules',
    'gui/ports.js',
    'gui/js'
  ],
  'directories': {
    'buildResources': 'gui/assets'
  },
  'win': {
    'certificateSubjectName': 'Cozy Cloud SAS',
    'target': [
      'nsis'
    ]
  },
  'mac': {
    'category': 'public.app-category.productivity',
    'target': [
      'dmg',
      'zip'
    ]
  },
  'linux': {
    'target': [
      'AppImage'
    ],
    'artifactName': 'CozyDrive-${version}-${arch}.${ext}',
    'executableName': 'CozyDrive',
    'category': 'Network;FileTransfer;',
    'desktop': {
      'StartupNotify': 'true'
    },
    'synopsis': 'Cozy Drive is a synchronization tool for your files and folders with Cozy Cloud.',
    'description': 'Save them safely in your open source personal cloud, access them anywhere, anytime with the mobile application and share them with the world or just your friends and colleagues. You can host your own Cozy Cloud, and or use the hosting services. Your freedom to chose is why you can trust us.'
  },
  'appImage': {
    'systemIntegration': 'doNotAsk'
  }
}

fs.writeFileSync(path.join(__dirname, 'base.json'), JSON.stringify(baseConfig, null, 2))
delete baseConfig.win.certificateSubjectName
fs.writeFileSync(path.join(__dirname, 'no-win-sign.json'), JSON.stringify(baseConfig, null, 2))
