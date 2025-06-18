/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * To mock dependencies in ESM, you can create fixtures that export mock
 * functions and objects. For example, the core module is mocked in this test,
 * so that the actual '@actions/core' module is not imported.
 */
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'
import * as githubHelper from '../src/github-helper.js'

// Mocks should be declared before the module being tested is imported.
jest.unstable_mockModule('@actions/core', () => core)

// The module being tested should be imported dynamically. This ensures that the
// mocks are used in place of any actual dependencies.
const { correlateFalcoEvent } = await import('../src/live.js')

describe('correlateFalcoEvent', () => {
  it('should correlate Falco event with the correct step', () => {
    const steps: githubHelper.StepTimestamps = {
      step1: {
        startTime: '2025-03-26T09:58:00Z',
        endTime: '2025-03-26T09:59:00Z'
      },
      step2: {
        startTime: '2025-03-26T09:59:01Z',
        endTime: '2025-03-26T10:00:00Z'
      }
    }
    const falcoTimestamp = '2025-03-26T09:59:02.677408473Z'
    const result = correlateFalcoEvent(steps, falcoTimestamp)
    expect(result).toBe('step2')
  })

  it('should return "No step found" if no step matches the Falco event timestamp', () => {
    const steps: githubHelper.StepTimestamps = {
      step1: {
        startTime: '2025-03-26T09:58:00Z',
        endTime: '2025-03-26T09:59:00Z'
      },
      step2: {
        startTime: '2025-03-26T09:59:01Z',
        endTime: '2025-03-26T10:00:00Z'
      }
    }
    const falcoTimestamp = '2025-03-26T10:01:00.677408473Z'
    const result = correlateFalcoEvent(steps, falcoTimestamp)
    expect(result).toBe('No step found')
  })
})
