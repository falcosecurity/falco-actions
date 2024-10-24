const { execSync } = require('child_process');
const core = require('@actions/core');

try {
    // Get the input custom-rule-file
    const customRuleFile = core.getInput('custom-rule-file');
    const version = core.getInput('version');

    // Construct the Docker run command for Falco
    let command = 'docker run -d --name falco';

    if (customRuleFile) {
        command += ` -v ${customRuleFile}:/etc/falco/custom_rules.yaml`;
    }
    command += ` falcosecurity/falco-no-driver:${version}`;
    command += ' -r /etc/falco/falco_rules.yaml';
    command += ' -r /etc/falco/custom_rules.yaml';
    command += ' -o json_output=true';
    command += ' -o file_output.enabled=true';
    command += ' -o file_output.keep_alive=false';
    command += ' -o file_output.filename=/tmp/falco_events.json';
    command += ' -o engine.kind=modern_ebpf';

    // Execute the Docker run command
    console.log(`Running command: ${command}`);
    execSync(command, { stdio: 'inherit' });
} catch (error) {
    core.setFailed(`Failed to start Falco Docker container: ${error.message}`);
}