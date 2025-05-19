import * as github from '@actions/github'
import * as core from '@actions/core'

export interface StepTimestamps {
  [stepName: string]: {
    startTime: string
    endTime: string
  }
}

/**
 * Gets the timestamps of each step in the job.
 *
 * @param token: The GitHub token to use for authentication.
 * @returns A promise that resolves to an object containing the start and end times of each step.
 */
export async function getStepTimestamps(
  token: string
): Promise<StepTimestamps> {
  const { repo, runId } = github.context
  let octokit
  try {
    octokit = github.getOctokit(token)
  } catch (error) {
    core.setFailed(`Failed to get octokit`)
    core.info(`Octokit error: ${error}`)
    throw error
  }

  try {
    const { data } = await octokit.rest.actions.listJobsForWorkflowRun({
      owner: repo.owner,
      repo: repo.repo,
      run_id: runId
    })

    core.info(`Retrieved data: ${JSON.stringify(data)}`)

    // todo(loresuso): understand in which job we are so to retrieve the correct steps
    const steps = data.jobs[0].steps
    if (!steps) {
      throw new Error('No steps found in the job')
    }

    const timestamps: StepTimestamps = {}
    for (const step of steps) {
      timestamps[step.name] = {
        startTime: step.started_at ?? '',
        endTime: step.completed_at ?? ''
      }
    }
    return timestamps
  } catch (error) {
    core.setFailed(`Failed to get step timestamps`)
    throw error
  }
}
