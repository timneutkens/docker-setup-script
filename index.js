#!/usr/bin/env node

// External libs
const pify = require('pify')
const ora = require('ora')
const ncp = pify(require('ncp'))

// Docker related functions
const DockerLib = require('dockerode')
const docker = new DockerLib()
const createContainer = pify(docker.createContainer).bind(docker)
const createVolume = pify(docker.createVolume).bind(docker)

// Config
const proxyConfig = require('./proxy-config')

// Wraps container methods in a promise using pify
function methodFactory(container) {
  return method => pify(container[method]).bind(container)()
}

// Simple try catch which returns false on failure instead of throwing an exception
async function check (fn) {
  try {
    return await fn()
  } catch (e) {
    return false
  }
}

async function pull (image) {
  return new Promise((resolve, reject) => {
    docker.pull(image, (error, stream) => {
      if (error) reject(error)

      stream.pipe(process.stdout)
      docker.modem.followProgress(stream, (error, output) => {
        if (error) reject(error)

        resolve(output)
      })
    })
  })
}

async function loader (text, fn) {
  const loading = ora(text).start()
  const output = typeof fn === 'function' ? await fn() : fn
  loading.stopAndPersist('✔️')

  return output
}

async function runCommand () {
  let dockerContainer = docker.getContainer('http-proxy')
  let container = methodFactory(dockerContainer)

  let info = await loader('Checking container info', check(() => container('inspect')))

  // Create new container if it doesn't exist already
  if (info) {
    ora('Container already running').start().stopAndPersist('✔️')
  } else {
    await loader('Creating proxy container', async () => {
      await pull('codekitchen/dinghy-http-proxy')
      dockerContainer = await createContainer(proxyConfig)
      container = methodFactory(dockerContainer)
      info = await container('inspect')
    })
  }

  // Start container if it's not running
  if (!info.State.Running) {
    await loader('Starting container', container('start'))
  }

  // Copy dns resolver config for *.dev
  await loader('Configuring DNS', ncp(`${__dirname}/resolver.txt`, '/etc/resolver/dev'))

  // Create cache volume for composer
  await loader('Creating composerdata volume', createVolume({ Name: 'composerdata' }))
}

runCommand()
