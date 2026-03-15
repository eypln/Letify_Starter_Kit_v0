const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WARNING = 'console.warn("[baseline-browser-mapping]';
const REPLACEMENT = '(()=>{})("[baseline-browser-mapping]';

// Find all copies in node_modules/.pnpm
const pnpmDir = path.join(__dirname, 'node_modules', '.pnpm');
let patched = 0;

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' && !dir.includes('.pnpm')) continue;
      walk(full);
    } else if ((entry.name === 'index.cjs' || entry.name === 'index.js') && full.includes('baseline-browser-mapping')) {
      let content = fs.readFileSync(full, 'utf8');
      if (content.includes(WARNING)) {
        content = content.replace(WARNING, REPLACEMENT);
        fs.writeFileSync(full, content);
        console.log('Patched:', full);
        patched++;
      }
    }
  }
}

walk(pnpmDir);
console.log('\nTotal patched:', patched, 'files');
