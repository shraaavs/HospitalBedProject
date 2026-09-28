import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const modelsDir = path.join(__dirname, 'server', 'models');

const files = fs.readdirSync(modelsDir);

files.forEach(file => {
  if (file.endsWith('.js')) {
    const filePath = path.join(modelsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Simplest fix for MVP: just replace ref: 'User' with ref: 'Doctor' in generic cases.
    // In MedicalRecord, it's definitely Doctor.
    if (file === 'MedicalRecord.js') {
      content = content.replace(/ref:\s*'User'/g, "ref: 'Doctor'");
    } else if (file === 'BedAllocation.js') {
      content = content.replace(/ref:\s*'User'/g, "ref: 'Receptionist'");
    } else if (file === 'BedHistory.js' || file === 'BedTransfer.js') {
      content = content.replace(/ref:\s*'User'/g, "ref: 'Admin'");
    } else if (file === 'ResourceRequest.js') {
      content = content.replace(/ref:\s*'User'/g, "ref: 'Nurse'");
    } else {
      content = content.replace(/ref:\s*'User'/g, "ref: 'Admin'");
    }
    
    fs.writeFileSync(filePath, content);
  }
});

console.log('Fixed all User refs');
