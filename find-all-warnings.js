const fs = require('fs');
const path = require('path');

const WARNING = 'baseline-browser-mapping] The data';
const WARN_FN = 'console.warn("[baseline-browser-mapping]';
const REPLACEMENT = '(()=>{})("[baseline-browser-mapping]';

let found = 0;
let patched = 0;

function walk(dir, depth) {
  if (depth > 15) return;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      try {
        if (entry.isSymbolicLink()) {
          // Follow symlink
          const real = fs.realpathSync(full);
          const stat = fs.statSync(real);
          if (stat.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.cjs'))) {
            checkFile(real);
          }
        } else if (entry.isDirectory()) {
          walk(full, depth + 1);
        } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.cjs'))) {
          checkFile(full);
        }
      } catch (e) {}
    }
  } catch (e) {}
}

function checkFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(WARNING)) {
      found++;
      console.log('FOUND:', filePath);
      if (content.includes(WARN_FN)) {
        const newContent = content.replace(WARN_FN, REPLACEMENT);
        fs.writeFileSync(filePath, newContent);
        patched++;
        console.log('  -> PATCHED');
      } else {
        console.log('  -> Already patched (has replacement)');
      }
    }
  } catch (e) {}
}

const nmDir = path.join(__dirname, 'node_modules');
console.log('Scanning', nmDir, '...\n');
walk(nmDir, 0);
console.log('\nFound:', found, '| Patched:', patched);
