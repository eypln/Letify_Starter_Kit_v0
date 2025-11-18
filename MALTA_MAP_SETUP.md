# Malta Listings Map - Kurulum Talimatları

## Google Maps API Kurulumu

Malta haritası özelliğini kullanmak için Google Maps API anahtarına ihtiyacınız var.

### Adımlar:

1. **Google Cloud Console'a gidin:**
   - https://console.cloud.google.com/

2. **Yeni bir proje oluşturun veya mevcut bir projeyi seçin**

3. **Maps JavaScript API'yi etkinleştirin:**
   - Sol menüden "APIs & Services" > "Library"
   - "Maps JavaScript API" arayın
   - "ENABLE" butonuna tıklayın

4. **API Key oluşturun:**
   - Sol menüden "APIs & Services" > "Credentials"
   - "CREATE CREDENTIALS" > "API key"
   - Oluşturulan anahtarı kopyalayın

5. **API Key'i kısıtlayın (Önerilen):**
   - Oluşturulan key'e tıklayın
   - "Application restrictions" bölümünde:
     - "HTTP referrers (web sites)" seçin
     - Domain'lerinizi ekleyin (örn: `localhost:3000/*`, `yourdomain.com/*`)
   - "API restrictions" bölümünde:
     - "Restrict key" seçin
     - "Maps JavaScript API" seçin
   - "SAVE" butonuna tıklayın

6. **.env.local dosyanıza ekleyin:**
   ```bash
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
   ```

7. **Paketleri yükleyin:**
   ```bash
   npm install
   ```
   veya
   ```bash
   pnpm install
   ```

8. **Development server'ı başlatın:**
   ```bash
   npm run dev
   ```

## Harita Özellikleri

- ✅ Sadece "Available" ve "Soon" durumundaki listingler haritada görünür
- ✅ Yeşil marker: Available listingler
- ✅ Mavi marker: Soon listingler veya karışık (Available + Soon)
- ✅ Marker'a tıklayınca o şehirdeki tüm listingler ve referans numaraları görünür
- ✅ Harita zoom yapılabilir, kaydırılabilir
- ✅ Mobil responsive tasarım

## Not

Google Maps API kullanımı için kredi kartı bilgisi gerekebilir, ancak aylık $200 ücretsiz kullanım kredisi vardır. Normal kullanımda bu limit aşılmaz.
