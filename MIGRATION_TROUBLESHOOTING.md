# Listing Sequence Migration - Adım Adım Kurulum

## Hata Aldıysanız - Adım Adım Çalıştırın

Eğer tek migration dosyasında hata aldıysanız, aşağıdaki adımları **sırayla** takip edin:

### Adım 0: Kontrol Et (Önce Bu!)
```sql
-- check_listing_duplicates.sql dosyasını çalıştır
```
Bu dosya size:
- Duplicate title'lar var mı?
- En yüksek L numarası nedir?
- Hangi yapılar zaten var?

gibi bilgileri verecek.

---

### Adım 1: Tablo Oluştur
```sql
-- migration_step_1_create_table.sql
```
✅ **Başarılı olmalı**: "Table created successfully" veya "Table already exists"

❌ **Hata alırsan**: Tablo zaten varsa sorun yok, devam et

---

### Adım 2: Başlangıç Değerini Ayarla
```sql
-- migration_step_2_initialize.sql
```
✅ **Başarılı olmalı**: "Found max reference number: LXX" mesajını göreceksin

❌ **Hata alırsan**: 
- `listings` tablosu var mı kontrol et
- `title` sütunu var mı kontrol et

---

### Adım 3: Fonksiyonu Oluştur
```sql
-- migration_step_3_create_function.sql
```
✅ **Başarılı olmalı**: Test sonucu bir L numarası dönecek (örn: "L89")

❌ **Hata alırsan**:
- "table listing_sequence does not exist" → Adım 1'e geri dön
- Permission denied → Admin yetkisi gerekiyor

---

### Adım 4: Unique Constraint Ekle
```sql
-- migration_step_4_unique_constraint.sql
```
✅ **Başarılı olmalı**: Duplicate'lar varsa otomatik düzeltilecek

❌ **Hata alırsan**:
- "duplicate key value" → Script duplicate'ları düzeltmelidir
- Manuel kontrol: `check_listing_duplicates.sql` çalıştır

---

### Adım 5: RLS ve İzinler
```sql
-- migration_step_5_rls_permissions.sql
```
✅ **Başarılı olmalı**: Son kontrol tablosu tüm "true" olmalı

❌ **Hata alırsan**:
- Permission denied → Admin/service_role key ile çalıştır

---

## Sık Karşılaşılan Hatalar

### 1. "duplicate key value violates unique constraint"
**Neden**: Listings tablosunda aynı title'dan birden fazla var
**Çözüm**: 
```sql
-- Önce kontrol et
SELECT title, COUNT(*) 
FROM listings 
WHERE title ~ '^L[0-9]+$'
GROUP BY title 
HAVING COUNT(*) > 1;

-- Step 4'teki script otomatik düzeltir
```

### 2. "function get_next_listing_reference() does not exist"
**Neden**: Adım 3 çalışmamış veya hata vermiş
**Çözüm**: Step 3'ü tekrar çalıştır

### 3. "permission denied for table listing_sequence"
**Neden**: RLS aktif ama policy yok veya yanlış
**Çözüm**: Step 5'i service_role key ile çalıştır

### 4. "relation listing_sequence already exists"
**Neden**: Daha önce kısmen çalıştırılmış
**Çözüm**: IF NOT EXISTS kullanıldığı için sorun değil, devam et

---

## Rollback (Geri Alma)

Eğer işlemi geri almak istersen:

```sql
-- RLS ve policies'i temizle
DROP POLICY IF EXISTS "Anyone can read listing sequence" ON listing_sequence;

-- Constraint'i kaldır
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_title_unique;

-- Index'i kaldır
DROP INDEX IF EXISTS idx_listings_title;

-- Fonksiyonu sil
DROP FUNCTION IF EXISTS get_next_listing_reference();

-- Tabloyu sil
DROP TABLE IF EXISTS listing_sequence;
```

---

## Test Et

Migration tamamlandıktan sonra:

```sql
-- 1. Fonksiyonu test et
SELECT get_next_listing_reference(); -- L89 gibi bir değer dönmeli

-- 2. Tekrar çağır, artmalı
SELECT get_next_listing_reference(); -- L90 olmalı

-- 3. Sequence'i kontrol et
SELECT * FROM listing_sequence; -- current_number artmış olmalı
```

---

## Hangi Yöntemi Kullanmalıyım?

### Tek Seferde (Hızlı)
Eğer database'in temiz ve duplicate yok ise:
```sql
-- supabase_migration_listing_sequence.sql (güncellenmiş hali)
```

### Adım Adım (Güvenli)
Eğer hata alıyorsan veya production'da isen:
1. `check_listing_duplicates.sql` - Kontrol
2. `migration_step_1_create_table.sql`
3. `migration_step_2_initialize.sql`
4. `migration_step_3_create_function.sql`
5. `migration_step_4_unique_constraint.sql`
6. `migration_step_5_rls_permissions.sql`

Her adımda sonucu kontrol et, hata varsa düzelt, sonraki adıma geç.

---

## Ekran Görüntüsü Gönderirsen

Lütfen şunları ekle:
- ❌ Tam hata mesajı (error code ve satır numarası)
- 📋 Hangi SQL script'ini çalıştırdığın
- 🔍 `check_listing_duplicates.sql` sonuçları

Bu bilgilerle tam olarak sorunu tespit edebilirim.
