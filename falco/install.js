const { execSync } = require('child_process');

try {
    console.log('Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });
    console.log('Dependencies installed successfully.');
} catch (error) {
    console.error(`Failed to install dependencies: ${error.message}`);
    process.exit(1);
}