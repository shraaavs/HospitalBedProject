import { execSync } from 'child_process';
import os from 'os';

try {
  if (os.platform() === 'win32') {
    const output = execSync('netstat -ano | findstr :5000').toString();
    const lines = output.split('\n');
    const pidsToKill = new Set();
    
    for (const line of lines) {
      if (line.includes('LISTENING')) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0') {
          pidsToKill.add(pid);
        }
      }
    }
    
    for (const pid of pidsToKill) {
      console.log(`Killing PID ${pid} listening on port 5000...`);
      try {
        execSync(`taskkill /F /PID ${pid}`);
        console.log(`Successfully killed PID ${pid}`);
      } catch (err) {
        console.error(`Failed to kill PID ${pid}:`, err.message);
      }
    }
  }
} catch (e) {
  console.log('Error checking netstat:', e.message);
}
