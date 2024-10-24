const { execSync } = require('child_process');
const core = require('@actions/core');
const fs = require('fs');

try {
    // Construct the Docker stop command
    const command = 'docker stop falco';

    // Execute the Docker stop command
    console.log(`Running command: ${command}`);
    execSync(command, { stdio: 'inherit', shell: '/bin/bash' });

    // Write to GITHUB_STEP_SUMMARY
    core.summary.addRaw('Docker container "falco" stopped successfully.').write();
    const falcoEventsContent = fs.readFileSync('/tmp/falco_events.json', 'utf8');
    core.summary.addRaw(`\n\nFalco Events:\n${falcoEventsContent}`).write();

} catch (error) {
    console.error(`Failed to stop the container: ${error.message}`);
}