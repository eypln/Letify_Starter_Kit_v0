const fs = require('fs');
const path = require('path');

// .next klasörünü sil
const nextDir = path.join(__dirname, '.next');
if (fs.existsSync(nextDir)) {
  fs.rmSync(nextDir, { recursive: true, force: true });
  console.log('.next klasörü silindi');
} else {
  console.log('.next klasörü bulunamadı');
}

console.log('Temizlik tamamlandı');