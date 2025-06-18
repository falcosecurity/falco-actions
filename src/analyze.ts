import * as artifact from '@actions/artifact'
import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as inputHelper from './input-helper.js'
import { pullSysdigImage } from './record.js'
import { pullFalcoImage } from './live.js'
import * as filters from './sysdig-filters.js'
import * as fs from 'fs'
import path from 'path'

const artifactDir = '/tmp'
const artifactName = 'capture'
const artifactPath = '/tmp/capture.scap'

/**
 *
 * @param captureFile The capture file to analyze
 * @param filter The Sysdig filter to apply
 * @param outputFields  The Sysdig output fields to use
 * @param outputFile Where to put the Sysdig output, in JSON format. Should be a file in the /tmp directory, which is mounted to the Sysdig container.
 */
async function startSysdigContainer(
  captureFile: string,
  filter: string[],
  outputFields: string[],
  outputFile: string
) {
  try {
    const filterString = filter.join(' ')
    const outputFieldsString = outputFields.join(',')

    // Construct the sysdig command to be executed by bash
    const sysdigCommand = `sysdig -r ${captureFile} -j "${filterString}" -p "${outputFieldsString}"`

    const out = await exec.getExecOutput('docker', [
      'run',
      '--rm',
      '-v',
      `/tmp:/tmp`,
      '--entrypoint',
      '/bin/bash',
      'sysdig/sysdig:latest',
      '-c',
      sysdigCommand
    ])

    if (out.exitCode !== 0) {
      core.setFailed(
        `Sysdig command failed with exit code ${out.exitCode}: ${out.stderr}`
      )
      throw new Error(`Sysdig command failed: ${out.stderr}`)
    }

    core.info(`Sysdig output: ${out.stdout}`)
    fs.writeFileSync(outputFile, out.stdout)
    core.info(`Sysdig output written to ${outputFile}`)
  } catch (error) {
    core.error(`Failed to start Sysdig container: ${error}`)
    throw error
  }
  core.info('Sysdig container started successfully')
}

export async function start(i: inputHelper.ActionInputs): Promise<void> {
  // Get artifact id
  const artifactClient = new artifact.DefaultArtifactClient()
  let captureArtifact: artifact.GetArtifactResponse
  try {
    captureArtifact = await artifactClient.getArtifact(artifactName)
  } catch (error) {
    core.setFailed(`Failed to get artifact ${artifactName} id`)
    throw error
  }
  const id = captureArtifact.artifact.id
  if (captureArtifact.artifact.size === 0) {
    throw new Error(`Artifact ${artifactName} is empty`)
  }
  if (i.verbose) {
    core.info(`Artifact ${artifactName}, id: ${id}`)
    core.info(
      `Artifact ${artifactName}, size: ${captureArtifact.artifact.size}`
    )
  }

  // Download the artifact for further analysis
  try {
    await artifactClient.downloadArtifact(id, { path: artifactDir })
  } catch (error) {
    core.error(`Failed to download artifact ${artifactName}: ${id}`)
    throw error
  }

  // Download Sysdig to perform analysis
  try {
    await pullSysdigImage()
  } catch (error) {
    core.error(`Failed to download Sysdig: ${error}`)
    throw error
  }

  // Download Falco to check for triggered rules
  try {
    await pullFalcoImage()
  } catch (error) {
    core.error(`Failed to download Falco: ${error}`)
    throw error
  }

  // Run Sysdig container to analyze the capture file
  core.info('Running Sysdig container to analyze the capture file...')

  const processesFile = '/tmp/processes.json'
  const containersFile = '/tmp/containers.json'
  const outboundConnectionsFile = '/tmp/outbound-connections.json'
  const writtenFilesFile = '/tmp/written-files.json'
  const outputFiles = [
    processesFile,
    containersFile,
    outboundConnectionsFile,
    writtenFilesFile
  ]

  // Processes
  await startSysdigContainer(
    artifactPath,
    filters.processes,
    filters.processDetails,
    processesFile
  )

  // Containers
  await startSysdigContainer(
    artifactPath,
    filters.containers,
    filters.containerDetails,
    containersFile
  )

  // Outbound connections
  await startSysdigContainer(
    artifactPath,
    filters.outboundConnections,
    filters.outboundConnectionDetails,
    outboundConnectionsFile
  )

  // Written files
  await startSysdigContainer(
    artifactPath,
    filters.writtenFiles,
    filters.writtenFileDetails,
    writtenFilesFile
  )

  // Write summary
  await writeSummary(outputFiles)
}

/**
 * Write the summary of the analysis to the GitHub Actions summary
 * @param files The list of files to write to the summary
 */
async function writeSummary(files: string[]) {
  core.info('Writing summary...')
  core.summary.addHeading('Summary', 1)

  for (const file of files) {
    // If the file does not exists, skip it
    if (!fs.existsSync(file)) {
      core.info(`File ${file} does not exist`)
      continue
    }

    // If the file is empty, skip it
    const stats = fs.statSync(file)
    if (stats.size === 0) {
      core.info(`File ${file} is empty`)
      continue
    }

    // Read the output file and convert to Markdown table
    const data = fs.readFileSync(file, 'utf-8')

    // Parse the JSON lines and dynamically extract all keys
    try {
      const lines = data
        .split('\n')
        .filter((line) => line.trim() !== '')
        .map((line) => {
          const jsonLine = JSON.parse(line)
          return Object.values(jsonLine).map((value) => String(value))
        })

      // Dynamically generate table headers from the keys of the first JSON object
      const headers = Object.keys(JSON.parse(data.split('\n')[0])).map(
        (key) => ({
          data: key,
          header: true
        })
      )

      // Generate Heading name from file name
      const h = path.basename(file, '.json')
      const capitalizedHeading = h.charAt(0).toUpperCase() + h.slice(1)

      // Write the Markdown table to a file
      core.summary
        .addHeading(capitalizedHeading, 2)
        .addTable([headers, ...lines])
    } catch (error) {
      core.error(`Failed to parse JSON from file ${file}`)
      throw error
    }
  }

  core.summary.write()
}
