import * as fs from 'fs'
import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as inputHelper from './input-helper.js'
import * as githubHelper from './github-helper.js'

// Define the action inputs
let inputs: inputHelper.ActionInputs
// Define the Falco container ID
let falcoContainerId: string = ''
// Define the Falco output file, containing the JSON output of Falco events
const falcoOutputFile: string = '/tmp/falco_events.json'

export async function startFalco(i: inputHelper.ActionInputs): Promise<void> {
  core.info('Starting Falco...')
  inputs = i
  await pullFalcoImage()
  await runFalcoDockerContainer()
}

/**
 * Pulls the specified Falco Docker image.
 */
export async function pullFalcoImage(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    exec
      .exec('docker', ['pull', `falcosecurity/falco:${inputs.falcoVersion}`])
      .then(() => {
        resolve()
      })
      .catch((error) => {
        reject(`Failed to pull Falco image: ${error.message}`)
      })
  })
}

/**
 * Runs a Docker container with the specified inputs and waits for a specific string in the output.
 */
async function runFalcoDockerContainer(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let output = ''
    const args = [
      'run',
      '--rm',
      '-d',
      '--name',
      'falco',
      '--privileged',
      '-v',
      '/tmp:/tmp', // Required for Falco to write events to a file
      '-v',
      '/var/run/docker.sock:/host/var/run/docker.sock',
      '-v',
      '/proc:/host/proc:ro',
      '-v',
      '/etc:/host/etc:ro'
    ]

    // Add the custom rule file volume mount if provided
    if (inputs.customRuleFile) {
      args.push(
        '-v',
        `${inputs.customRuleFile}:/etc/falco/falco_rules.local.yaml`
      )
    }

    // Add the default cicd_rules.yaml volume mount if the cicdRules input is true
    if (inputs.cicdRules) {
      args.push('-v', '/etc/falco/cicd_rules.yaml')
    }

    // Arguments for the Falco binary
    args.push(
      `falcosecurity/falco:${inputs.falcoVersion}`,
      'falco',
      '-o',
      'json_output=true',
      '-o',
      'file_output.enabled=true',
      '-o',
      'file_output.keep_alive=false',
      '-o',
      `file_output.filename=${falcoOutputFile}`,
      '-o',
      'engine.kind=modern_ebpf'
    )

    const options = {
      listeners: {
        stderr: (data: Buffer) => {
          output += data.toString()
          if (
            output.includes("Opening 'syscall' source with modern BPF probe.")
          ) {
            resolve()
          }
        }
      }
    }

    exec
      .exec('docker', args, options)
      .then(() => {
        // Capture the container ID from the output
        const containerIdMatch = output.match(/([a-f0-9]{64})/)
        if (containerIdMatch) {
          falcoContainerId = containerIdMatch[1]
          if (inputs.verbose) {
            core.info(`Falco Container ID: ${falcoContainerId}`)
          }
          core.saveState('falcoContainerId', falcoContainerId)
          resolve()
        } else {
          reject('Failed to capture Falco container ID')
        }
      })
      .catch((error) => {
        reject(`Docker run failed: ${error.message}`)
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
          if (psOutput.includes(falcoContainerId)) {
            resolve()
          } else if (retries < maxRetries) {
            retries++
            setTimeout(checkContainerId, 1000)
          } else {
            core.info(
              'Waiting for Falco container ID to appear in docker ps...'
            )
            reject(
              'Falco container ID not found in docker ps output after multiple attempts'
            )
          }
        })
        .catch((error) => {
          core.error(`Failed to list docker containers: ${error.message}`)
          reject(error)
        })
    }
    checkContainerId()
  })
}

export function correlateFalcoEvent(
  steps: githubHelper.StepTimestamps,
  falcoTimestamp: string
): string {
  let output = ''
  const falcoEvent = new Date(falcoTimestamp)

  // Loop over StepTimestamps, convert to date, and compare to falcoTimestamp
  for (const step in steps) {
    const stepStart = new Date(steps[step].startTime)
    const stepEnd = new Date(steps[step].endTime)
    core.info(
      `Correlating step: ${step}, Start: ${stepStart}, End: ${stepEnd}, Falco: ${falcoEvent}`
    )
    if (falcoEvent >= stepStart && falcoEvent <= stepEnd) {
      core.info(`Falco event occurred during step: ${step}`)
      output += step + ' '
    }
  }

  if (output === '') {
    output = 'No step found'
  }
  return output.trimEnd()
}

export async function cleanup(inputs: inputHelper.ActionInputs): Promise<void> {
  // Retrieved the saved container ID to stop Falco
  falcoContainerId = core.getState('falcoContainerId')
  if (falcoContainerId) {
    core.info('Stopping Falco...')
    await exec.exec('docker', ['stop', falcoContainerId]).catch((error) => {
      core.error(`Failed to stop Falco container: ${error.message}`)
      throw error
    })
    core.info('Falco container stopped.')
  }

  // Write the summary if the output file exists
  core.info('Writing the summary...')
  {
    if (fs.existsSync(falcoOutputFile)) {
      if (inputs.verbose) {
        core.warning('Falco output file found')
        await exec.exec('cat', [falcoOutputFile])
      }

      // Get information about start and end times of each step to perform correlation of events
      let timestamps: githubHelper.StepTimestamps = {}
      let skipCorrelation = false
      const token = process.env.GITHUB_TOKEN
      if (!token) {
        core.warning(
          'GITHUB_TOKEN env variable not found, skipping correlation. Also consider adding read actions:read permission to the workflow.'
        )
        skipCorrelation = true
      } else {
        timestamps = await githubHelper.getStepTimestamps(token)
      }

      // Read the Falco output file line by line and convert it to a JSON object
      // to be displayed as a table in the summary
      const data = []
      const lines = fs.readFileSync(falcoOutputFile, 'utf-8').split('\n')
      for (const line of lines) {
        if (line) {
          const jsonLine = JSON.parse(line)
          const rule = jsonLine.rule
          const priority = jsonLine.priority
          const time = jsonLine.time
          const output = jsonLine.output
          if (skipCorrelation) {
            data.push([rule, priority, time, output])
            continue
          } else {
            const step = correlateFalcoEvent(timestamps, time)
            data.push([rule, priority, time, output, step])
          }
        }
      }

      // Write the summary
      if (skipCorrelation) {
        await core.summary
          .addHeading('Falco Events')
          .addTable([
            [
              { data: 'Rule', header: true },
              { data: 'Priority', header: true },
              { data: 'Time', header: true },
              { data: 'Output', header: true }
            ],
            ...data
          ])
          .write()
      } else {
        // Also include the possible step where the event occurred in the summary
        await core.summary
          .addHeading('Falco Events')
          .addTable([
            [
              { data: 'Rule', header: true },
              { data: 'Priority', header: true },
              { data: 'Time', header: true },
              { data: 'Output', header: true },
              { data: 'Step', header: true }
            ],
            ...data
          ])
          .write()
      }
    } else {
      core.warning('Falco output file not found.')
    }
  }

  core.info('Action complete.')
}
