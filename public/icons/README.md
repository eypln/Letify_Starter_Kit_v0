# PWA Icons

Bu klasörde PWA için gerekli icon dosyaları bulunmalıdır.

## Gerekli Icon Boyutları

### Standard Icons (purpose: "any")
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

### Maskable Icons (purpose: "maskable")
- icon-192x192-maskable.png
- icon-512x512-maskable.png

### Shortcuts Icons
- shortcut-dashboard.png (96x96)
- shortcut-new-post.png (96x96)
- shortcut-listings.png (96x96)

## Icon Oluşturma Araçları

1. **PWA Asset Generator**: https://github.com/elegantapp/pwa-asset-generator
   ```bash
   npx pwa-asset-generator logo.svg ./public/icons
   ```

2. **Favicon Generator**: https://realfavicongenerator.net/

3. **Maskable.app**: https://maskable.app/editor
   - Maskable icon'ları test etmek ve oluşturmak için

## Icon Tasarım Kuralları

### Standard Icons
- Şeffaf arka plan veya beyaz arka plan
- Logo merkezde, kenarlardan en az %10 boşluk
- PNG formatında, 24-bit renk derinliği

### Maskable Icons
- Safe zone: Merkezden %80 alan
- Minimum padding: %10
- Arka plan rengi theme color ile uyumlu (#9333ea)

## Geçici Çözüm

Icon'lar hazır olana kadar:
1. Favicon.ico kullanılabilir
2. Veya basit bir renk gradyan PNG oluşturulabilir
3. Logo SVG'den otomatik boyutlandırma yapılabilir

## Üretim İçin

Production'a geçmeden önce mutlaka tüm icon'lar oluşturulmalı:
- [ ] Standard icons (8 boyut)
- [ ] Maskable icons (2 boyut)
- [ ] Shortcut icons (3 adet)
- [ ] Apple touch icons
- [ ] Favicon (multiple sizes)
