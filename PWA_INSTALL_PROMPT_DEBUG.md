# PWA Install Prompt - Production Troubleshooting

## ✅ Yapılan Düzeltmeler

1. **Component Konumu**: PWAInstallPrompt artık `ClientProviders.tsx` içinden yükleniyor
   - Dashboard yerine tüm uygulama için erişilebilir
   - Dinamik (lazy) loading ile performance iyileştirildi

2. **Hydration Sorunu Giderildi**: 
   - `isClient` state'i eklenerek server-client mismatch'ı çözüldü
   - Tarayıcı API'leri yalnızca client'te çalışıyor

3. **Debug Logging Eklendi**:
   - Console'da PWA event'lerini görmek için `console.log` statements eklendi
   - Production ortamında sorun teşhis edip edileceğini belirleyecek

## ⚠️ Production Ortamında Kontrol Edilecekler

`app.letify.cloud` sitesinde PWA Install Prompt'un gösterilmemesi durumunda:

### 1. **HTTPS Kontrolü** ✓ GEREKLI
```
beforeinstallprompt event'i yalnızca HTTPS üzerinde tetiklenir
- app.letify.cloud HTTPS'de çalışıyor mu? Kontrol edin
- URL bar'daki kilit simgesine bakın
```

### 2. **Manifest.json Kontrolü** ✓ GEREKLI
```
Browser DevTools → Application tab:
- Manifest Kontrolü: manifest.json düzgün yükleniyor mu?
- Required Fields:
  ✓ name
  ✓ short_name
  ✓ display: "standalone"
  ✓ start_url
  ✓ icons (en az 192x192 ve 512x512)
  ✓ theme_color
  ✓ background_color
```

### 3. **Service Worker Kontrolü** ✓ GEREKLI
```
Browser DevTools → Application tab → Service Workers:
- Service Worker aktif ve çalışıyor mu?
- Eğer yoksa: manifest.json'da service worker kaydı olmayabilir
```

### 4. **Console Hataları**
```
Browser DevTools → Console tab:
Aşağıdaki mesajları arayın:
- "PWA: beforeinstallprompt event not triggered, using fallback detection"
- Service worker errors
- Manifest loading errors
- CORS errors
```

### 5. **Chrome DevTools Kontrolü**
```
Şu adımları takip edin:
1. F12 → Application tab açın
2. Manifest field'ında tüm required fields'ı kontrol edin
3. Service Workers section'ında aktif worker var mı?
4. Storage → Cookies, Local Storage kontrol edin
   - "pwa-install-dismissed" key'i varsa 7+ gün geçmiş mi?
```

### 6. **Installation Criteria**
PWA kurulabilir olabilmesi için:
```
✓ HTTPS üzerinde servis ediliyorsa
✓ Geçerli manifest.json varsa
✓ Service worker kaydı varsa
✓ Minimum icon dosyaları varsa (192x192, 512x512)
✓ Display modu "standalone" ise
```

### 7. **Tarayıcı Uyumluluğu**
```
✓ Chrome/Edge: Destekli (Android + Desktop)
✓ Safari: iOS 16.4+
✓ Firefox: Sınırlı desteği
✓ Opera: Destekli
```

## 🔍 Debug için Console'a Yazılan Loglar

Uygulama açıldığında şu logları görmeli:
```javascript
// Eğer event tetiklenirse
// (hiçbir log yok = başarılı)

// Eğer tetiklenmezse 10 saniye sonra:
"PWA: beforeinstallprompt event not triggered, using fallback detection"
"PWA Check - isInstalled: false deferredPrompt: false"
```

## 🛠️ Hızlı Test Adımları

1. **Local'de test**:
   ```bash
   npm run dev
   # https://localhost:3000 (HTTPS gerekli)
   ```

2. **Production'da test**:
   - Browser DevTools açın (F12)
   - Console tab'ına bakın
   - "PWA Check" mesajlarını arayın

3. **Prompt'u manuel tetikle** (Chrome DevTools):
   ```javascript
   // Application → Manifest → "Add to Home screen" butonuna tıkla
   ```

4. **Dismissal history temizle**:
   ```javascript
   localStorage.removeItem('pwa-install-dismissed')
   location.reload()
   ```

## 📝 Manifest Dosya Konumu

- Dosya: `/public/manifest.json`
- Layout'ta link: `manifest: '/manifest.json'` (✓ Zaten yapılı)

## ✨ Güncellemeler Sonrasında

Değişiklikler yapıldı:
- ✅ PWAInstallPrompt ClientProviders içine taşındı (global erişim)
- ✅ Hydration bug'ı giderildi
- ✅ Debug logging eklendi
- ✅ DashboardClient'ten duplicate import kaldırıldı

---

**Sonraki Adım**: Tüm değişiklikleri `app.letify.cloud`'a deploy ettikten sonra, 
tarayıcının console'unda "PWA Check" mesajlarını kontrol edin.
