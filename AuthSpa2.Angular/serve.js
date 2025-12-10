const { spawn } = require('child_process');

const port = process.env.PORT || 4200;

console.log(`Starting Angular dev server with SSL on port ${port}`);

const ngServe = spawn('npx', ['ng', 'serve', '--port', port.toString(), '--host', '0.0.0.0', '--ssl', '--ssl-cert', 'ssl/localhost.crt', '--ssl-key', 'ssl/localhost.key'], {
  stdio: 'inherit',
  shell: true
});

ngServe.on('error', (error) => {
  console.error(`Failed to start Angular dev server: ${error.message}`);
  process.exit(1);
});

ngServe.on('close', (code) => {
  console.log(`Angular dev server exited with code ${code}`);
  process.exit(code);
});
