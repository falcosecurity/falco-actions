import * as core from '@actions/core'
import * as stateHelper from './state-helper.js'
import * as inputHelper from './input-helper.js'
import * as analyze from './analyze.js'
import * as live from './live.js'
import * as record from './record.js'

/**
 * The main logic for the action.
 */
export function main(inputs: inputHelper.ActionInputs): void {
  if (inputs.verbose) {
    inputHelper.logInputs(inputs)
  }

  if (inputs.mode === 'live') {
    core.info('Running in live mode...')
    live.startFalco(inputs).catch((error) => {
      core.setFailed(error)
    })
  } else if (inputs.mode === 'record') {
    core.info('Running in record mode...')
    record.startSysdig(inputs).catch((error) => {
      core.setFailed(error)
    })
  } else if (inputs.mode === 'analyze') {
    core.info('Running in analyze mode...')
    analyze.start(inputs).catch((error) => {
      core.setFailed(error)
    })
  }
}

/**
 * Cleans up the action after the main logic has run.
 */
export async function cleanup(inputs: inputHelper.ActionInputs): Promise<void> {
  core.info('Cleaning up after the action...')
  switch (inputs.mode) {
    case 'record':
      core.info('Stopping Sysdig...')
      record.cleanup(inputs).catch((error) => {
        core.setFailed(error)
      })
      break
    case 'analyze':
      core.info('Skipping cleanup in analyze mode, nothing to do...')
      break
    case 'live':
      await live.cleanup(inputs).catch((error) => {
        core.setFailed(error)
      })
      break
  }
  core.info('Action completed successfully.')
  return
}

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  core.info('Starting the action...')
  const inputs = inputHelper.getInputs()
  inputHelper.logInputs(inputs)
  // Main
  if (!stateHelper.IsPost) {
    main(inputs)
  }
  // Post
  else {
    cleanup(inputs)
  }
}
