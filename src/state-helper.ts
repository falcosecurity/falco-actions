import * as core from '@actions/core'

/**
 * Indicates whether the POST action is running
 */
export const IsPost = !!core.getState('isPost')

/**
 * Indicates the mode of the action ('live', 'record', or 'analyze')
 */
export const Mode = core.getInput('mode', { required: true })

// Publish a variable so that when the POST action runs, it can determine it should run the cleanup logic.
// This is necessary since we don't have a separate entry point.
if (!IsPost) {
  core.saveState('isPost', 'true')
}
