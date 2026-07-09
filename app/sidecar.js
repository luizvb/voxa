const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function resolveRecorderd() {
  const local = path.join(__dirname, '..', 'bin', 'recorderd');
  if (fs.existsSync(local)) return local;

  const packaged = path.join(process.resourcesPath || '', 'recorderd');
  if (packaged && fs.existsSync(packaged)) return packaged;

  throw new Error('recorderd binary not found; run npm run build:go first');
}

function spawnFile(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(resolveRecorderd(), args, {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `recorderd exited with code ${code}`));
        return;
      }

      try {
        resolve(JSON.parse(stdout));
      } catch (error) {
        reject(new Error(`invalid recorderd JSON: ${error.message}`));
      }
    });
  });
}

module.exports = {
  resolveRecorderd,
  spawnFile
};
