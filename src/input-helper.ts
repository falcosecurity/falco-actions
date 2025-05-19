import * as core from '@actions/core'

export interface ActionInputs {
  falcoVersion: string
  configFile: string
  customRuleFile: string
  cicdRules: boolean
  verbose: boolean
  mode: string
}

export function getInputs(): ActionInputs {
  return {
    falcoVersion: core.getInput('falco-version') || 'latest',
    configFile: core.getInput('config-file') || 'filters/syscall_ignore.config',
    customRuleFile: core.getInput('custom-rule-file') || '',
    cicdRules: core.getBooleanInput('cicd-rules') || true,
    verbose: core.getBooleanInput('verbose') || false,
    mode: core.getInput('mode') || 'live'
  }
}

export function logInputs(inputs: ActionInputs): void {
  core.info(`Inputs:`)
  core.info(`Falco version: ${inputs.falcoVersion}`)
  core.info(`Config file: ${inputs.configFile}`)
  core.info(`Custom rule file: ${inputs.customRuleFile}`)
  core.info(`CICD rules: ${inputs.cicdRules}`)
  core.info(`Verbose: ${inputs.verbose}`)
  core.info(`Mode: ${inputs.mode}`)
}
