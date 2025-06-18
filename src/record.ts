import * as fs from 'fs'
import path from 'path'
import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as artifact from '@actions/artifact'
import * as inputHelper from './input-helper.js'

// Define the action inputs
let inputs: inputHelper.ActionInputs
// Define the Sysdig container ID
let sysdigContainerId: string = ''
// Define the path of the Sysdig capture file
const sysdigCaptureFile: string = '/tmp/capture.scap'

export async function startSysdig(i: inputHelper.ActionInputs): Promise<void> {
  core.info('Starting Sysdig...')
  inputs = i
  await pullSysdigImage()
  await runSysdigDockerContainer(inputs.configFile)
}

export async function pullSysdigImage(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    // todo(loresuso): pull specific version of sysdig
    exec
      .exec('docker', ['pull', 'sysdig/sysdig:latest'])
      .then(() => {
        resolve()
      })
      .catch((error) => {
        reject(`Failed to pull Sysdig image: ${error.message}`)
      })
  })
}

async function runSysdigDockerContainer(configFile: string) {
  let output = ''
  const args = [
    'run',
    '--rm',
    '-d',
    '--name',
    'sysdig',
    '--privileged',
    '-v',
    '/var/run/docker.sock:/host/var/run/docker.sock',
    '-v',
    '/dev:/host/dev',
    '-v',
    '/proc:/host/proc:ro',
    '-v',
    '/boot:/host/boot:ro',
    '-v',
    '/lib/modules:/host/lib/modules:ro',
    '-v',
    '/usr:/host/usr:ro',
    '-v',
    '/tmp:/tmp',
    '--net=host',
    'sysdig/sysdig:latest',
    'sysdig',
    '--modern-bpf',
    '-w',
    sysdigCaptureFile,
    '--snaplen=256',
    'not evt.type in (switch)'
  ]

  let configRaw = ''
  if (configFile) {
    const fullPath = path.join(
      process.env.GITHUB_ACTION_PATH || process.cwd(),
      configFile
    )

    try {
      configRaw = fs.readFileSync(fullPath, 'utf-8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`Sysdig config file not found at ${fullPath}`)
      } else if (error instanceof Error) {
        throw new Error(`Failed to read Sysdig config file: ${error.message}`)
      } else {
        throw new Error(`Unknown error reading config file: ${String(error)}`)
      }
    }
  }

  if (configRaw) {
    let config
    let ignore_syscall = ''

    try {
      config = JSON.parse(configRaw)
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in config file: ${error.message}`)
      } else if (error instanceof Error) {
        throw new Error(`Unexpected error while parsing JSON: ${error.message}`)
      } else {
        throw new Error(`Unknown error while parsing JSON: ${String(error)}`)
      }
    }

    if (Array.isArray(config.ignore_syscalls)) {
      ignore_syscall = config.ignore_syscalls.join(', ')
    }
    args.push('and not evt.type in (', ignore_syscall, ' )')
  } else {
    throw new Error('Sysdig config file is empty or wrong format')
  }

  const options = {
    listeners: {
      stdout: (data: Buffer) => {
        output += data.toString()
      },
      stderr: (data: Buffer) => {
        core.error(`Docker stderr: ${data.toString()}`)
      }
    }
  }

  await exec
    .exec('docker', args, options)
    .then(() => {
      // Capture the container ID from the output
      const containerIdMatch = output.match(/([a-f0-9]{64})/)
      if (containerIdMatch) {
        sysdigContainerId = containerIdMatch[1]
        core.info(`Sysdig Container ID: ${sysdigContainerId}`)
        core.saveState('sysdigContainerId', sysdigContainerId)
        return
      } else {
        throw new Error('Failed to capture Sysdig container ID')
      }
    })
    .catch((error) => {
      throw new Error(`Failed to start Sysdig container: ${error.message}`)
    })

  // Ensure we can see the container id docker ps
  const maxRetries = 5
  let retries = 0
  const checkContainerId = async () => {
    let psOutput = ''
    await exec
      .exec('docker', ['ps', '-a', '-f', 'status=running'], {
        listeners: {
          stdout: (data: Buffer) => {
            psOutput += data.toString()
          }
        }
      })
      .then(() => {
        // Docker ps only contains the first 12 characters of the container ID
        const id = sysdigContainerId.slice(0, 12)
        if (psOutput.includes(id)) {
          return
        } else if (retries < maxRetries) {
          retries++
          setTimeout(checkContainerId, 1000)
        } else {
          core.info('Waiting for Sysdig container ID to appear in docker ps...')
          throw new Error(
            'Sysdig container ID not found in docker ps output after multiple attempts'
          )
        }
      })
      .catch((error) => {
        core.error(`Failed to list docker containers: ${error.message}`)
        throw error
      })
  }
  checkContainerId()
}

export async function cleanup(inputs: inputHelper.ActionInputs): Promise<void> {
  // Retrieved the saved container ID to stop Sysdig
  sysdigContainerId = core.getState('sysdigContainerId')
  if (sysdigContainerId === '') {
    throw new Error('No Sysdig container ID found in state, nothing to stop.')
  }
  core.info('Stopping Sysdig...')
  await exec.exec('docker', ['stop', sysdigContainerId]).catch((error) => {
    core.error(`Failed to stop Sysdig container: ${error.message}`)
    throw error
  })
  core.info('Sysdig container stopped.')

  // Check if the capture file exists
  if (fs.existsSync(sysdigCaptureFile)) {
    if (inputs.verbose) {
      core.info(`Sysdig capture file exists at ${sysdigCaptureFile}`)
    }
  } else {
    throw new Error('Sysdig capture file not found.')
  }

  // Upload the Sysdig capture file as an artifact
  const artifactClient = new artifact.DefaultArtifactClient()
  const { id, size } = await artifactClient.uploadArtifact(
    'capture',
    [sysdigCaptureFile],
    path.dirname(sysdigCaptureFile)
  )
  core.info(
    `Uploaded Sysdig capture file as artifact with ID: ${id}, size: ${size} bytes.`
  )

  core.info('Action completed.')
}
