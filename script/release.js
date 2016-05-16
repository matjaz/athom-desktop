#!/usr/bin/env node

const childProcess = require('child_process')
const fs = require('fs')
const path = require('path')
const request = require('request')
const util = require('util')

const token = process.env.ATHOM_DESKTOP_GITHUB_TOKEN
const version = require('../package').version

checkToken()
  .then(zipAssets)
  .then(createRelease)
  .then(uploadAssets)
  .then(publishRelease)
  .then(() => {
    console.log('Done')
  })
  .catch((error) => {
    console.error(error.message || error)
    process.exit(1)
  })

function checkToken () {
  if (!token) {
    return Promise.reject('ATHOM_DESKTOP_GITHUB_TOKEN environment variable not set\nSet it to a token with repo scope created from https://github.com/settings/tokens/new')
  } else {
    return Promise.resolve(token)
  }
}

function zipAsset (asset) {
  return new Promise((resolve, reject) => {
    const assetBase = path.basename(asset.path)
    const assetDirectory = path.dirname(asset.path)
    console.log(`Zipping ${assetBase} to ${asset.name}`)

    if (!fs.existsSync(asset.path)) {
      return reject(new Error(`${asset.path} does not exist`))
    }

    const zipCommand = `zip --recurse-paths --symlinks '${asset.name}' '${assetBase}'`
    const options = {cwd: assetDirectory, maxBuffer: Infinity}
    childProcess.exec(zipCommand, options, (error) => {
      if (error) {
        reject(error)
      } else {
        asset.path = path.join(assetDirectory, asset.name)
        resolve(asset)
      }
    })
  })
}

function zipAssets () {
  const outPath = path.join(__dirname, '..', 'out')

  const zipAssets = [{
    name: 'athom-desktop-mac.zip',
    path: path.join(outPath, 'Athom Desktop-darwin-x64', 'Athom Desktop.app')
  }, {
    name: 'athom-desktop-windows.zip',
    path: path.join(outPath, 'AthomDesktop-win32-ia32')
  }]

  return Promise.all(zipAssets.map(zipAsset)).then((assets) => {
    return assets.concat([{
      name: 'Athom Desktop.dmg',
      path: path.join(outPath, 'Athom Desktop.dmg')
    }, {
      name: 'RELEASES',
      path: path.join(outPath, 'windows-installer', 'RELEASES')
    }, {
      name: 'AthomDesktopSetup.exe',
      path: path.join(outPath, 'windows-installer', 'AthomDesktopSetup.exe')
    }, {
      name: `AthomDesktop-${version}-full.nupkg`,
      path: path.join(outPath, 'windows-installer', `AthomDesktop-${version}-full.nupkg`)
    }])
  })
}

function createRelease (assets) {
  const options = {
    uri: 'https://api.github.com/repos/matjaz/athom-desktop/releases',
    headers: {
      Authorization: `token ${token}`,
      'User-Agent': `node/${process.versions.node}`
    },
    json: {
      tag_name: `v${version}`,
      target_commitish: 'master',
      name: version,
      body: 'An awesome new release :tada:',
      draft: true,
      prerelease: true
    }
  }

  return new Promise((resolve, reject) => {
    console.log('Creating new draft release')

    request.post(options, (error, response, body) => {
      if (error) {
        return reject(Error(`Request failed: ${error.message || error}`))
      }
      if (response.statusCode !== 201) {
        return reject(Error(`Non-201 response: ${response.statusCode}\n${util.inspect(body)}`))
      }

      resolve({assets: assets, draft: body})
    })
  })
}

function uploadAsset (release, asset) {
  const options = {
    uri: release.upload_url.replace(/\{.*$/, `?name=${asset.name}`),
    headers: {
      Authorization: `token ${token}`,
      'Content-Length': fs.statSync(asset.path).size,
      'User-Agent': `node/${process.versions.node}`
    }
  }

  return new Promise((resolve, reject) => {
    console.log(`Uploading ${asset.name} as release asset`)

    const assetRequest = request.post(options, (error, response, body) => {
      if (error) {
        return reject(Error(`Uploading asset failed: ${error.message || error}`))
      }
      if (response.statusCode >= 400) {
        return reject(Error(`400+ response: ${response.statusCode}\n${util.inspect(body)}`))
      }

      resolve(asset)
    })
    fs.createReadStream(asset.path).pipe(assetRequest)
  })
}

function uploadAssets (release) {
  return Promise.all(release.assets.map((asset) => {
    return uploadAsset(release.draft, asset)
  })).then(() => release)
}

function publishRelease (release) {
  const options = {
    uri: release.draft.url,
    headers: {
      Authorization: `token ${token}`,
      'User-Agent': `node/${process.versions.node}`
    },
    json: {
      draft: false
    }
  }

  return new Promise((resolve, reject) => {
    console.log('Publishing release')

    request.post(options, (error, response, body) => {
      if (error) {
        return reject(Error(`Request failed: ${error.message || error}`))
      }
      if (response.statusCode !== 200) {
        return reject(Error(`Non-200 response: ${response.statusCode}\n${util.inspect(body)}`))
      }

      resolve(body)
    })
  })
}
