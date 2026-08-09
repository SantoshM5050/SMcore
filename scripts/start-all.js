const { spawn } = require('child_process');

console.log('🚀 Starting SMCore Web Dashboard & Discord Bot concurrently...');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

const webProcess = spawn(npmCmd, ['run', 'start:web'], {
  stdio: 'inherit',
  env: process.env,
});

const botProcess = spawn(npmCmd, ['run', 'start:bot'], {
  stdio: 'inherit',
  env: process.env,
});

const handleShutdown = (signal) => {
  console.log(`Received ${signal}. Shutting down processes...`);
  webProcess.kill(signal);
  botProcess.kill(signal);
  process.exit(0);
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

webProcess.on('exit', (code) => {
  console.error(`⚠️ Web Dashboard process exited with code ${code}`);
});

botProcess.on('exit', (code) => {
  console.error(`⚠️ Discord Bot process exited with code ${code}`);
});
