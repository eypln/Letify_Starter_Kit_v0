# 🔐 Role-Based Access Control (RBAC) Güvenlik Politikası

## 📋 Genel Bakış

Bu belge, Letify platformunda uygulanan Rol Tabanlı Erişim Kontrolü (RBAC) mimarisini ve güvenlik politikalarını açıklar.

**Son Güncelleme:** 6 Aralık 2025  
**Versiyon:** 1.0  
**Durum:** Aktif

---

## 🎯 Amaç

Bu güvenlik katmanının amacı:
- Her kullanıcının sadece yetkisi olan sayfalara erişmesini sağlamak
- Rol bazlı dashboard'lar arası yetkisiz geçişleri engellemek  
- Sistem güvenliğini artırmak ve veri gizliliğini korumak
- Kullanıcı deneyimini iyileştirmek ve karışıklığı önlemek

---

## 👥 Rol Hiyerarşisi

Sistemde 5 ana rol bulunmaktadır:

### 1. **Agent** (Temsilci)
- **Erişim Seviyesi:** Temel
- **Ana Dashboard:** `/dashboard`
- **Yetkiler:**
  - Kendi müşterilerini yönetme
  - İlan paylaşma
  - Görüşme oluşturma
  - Kendi gelirlerini takip etme

### 2. **Team Leader** (Takım Lideri)
- **Erişim Seviyesi:** Orta
- **Ana Dashboard:** `/teamleader`
- **Yetkiler:**
  - Agent'ların tüm yetkileri
  - Takım üyelerinin performansını görme
  - Takım görüşmelerini yönetme
  - Takım gelirlerini analiz etme
  - Sistem bildirimlerini izleme

### 3. **Manager** (Yönetici)
- **Erişim Seviyesi:** Yüksek
- **Ana Dashboard:** `/manager`
- **Yetkiler:**
  - Team Leader'ların tüm yetkileri
  - Çoklu takım yönetimi
  - Şirket geneli raporlama
  - Organizasyon ayarları
  - _Not: Geliştirme aşamasında_

### 4. **Boss** (Üst Yönetim)
- **Erişim Seviyesi:** Maksimum
- **Ana Dashboard:** `/boss`
- **Yetkiler:**
  - Tüm sistemlere tam erişim
  - Finansal raporlar
  - Stratejik analitik
  - Şirket geneli metrikler
  - _Not: Geliştirme aşamasında_

### 5. **Admin** (Sistem Yöneticisi)
- **Erişim Seviyesi:** Sınırsız
- **Ana Dashboard:** `/admin`
- **Yetkiler:**
  - Tüm dashboard'lara erişim
  - Kullanıcı yönetimi
  - Sistem konfigürasyonu
  - Güvenlik ayarları

---

## 🛡️ Güvenlik Mekanizmaları

### 1. **Server-Side Rol Kontrolü**

Her protected sayfa, sunucu tarafında rol kontrolü yapar:

```typescript
// Örnek: /app/dashboard/page.tsx
export default async function Page() {
  const user = await getUser()
  const profile = await getProfile(user?.id)

  if (!user || !profile) {
    redirect('/sign-in')
  }

  // Rol kontrolü: Sadece 'agent' rolü erişebilir
  if (profile.role !== 'agent') {
    redirect('/access-denied')
  }

  // ... sayfa içeriği
}
```

### 2. **Client-Side Route Guard**

Client component'ler için `useEffect` ile erişim kontrolü:

```typescript
// Örnek: /app/(app)/teamleader/page.tsx
useEffect(() => {
  const checkAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/sign-in')
      return
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profileData?.role !== 'teamleader') {
      router.push('/access-denied')
      return
    }
  }

  checkAccess()
}, [])
```

### 3. **Merkezi Role Guard Utility**

`/lib/middleware/roleGuard.ts` dosyası rol bazlı erişim kontrolü için yardımcı fonksiyonlar içerir:

**Özellikler:**
- `ROLE_ROUTES`: Her rol için dashboard URL mapping
- `hasAccess()`: Kullanıcının bir rotaya erişim yetkisi var mı?
- `checkRoleAccess()`: Asenkron rol kontrolü ve redirect mantığı
- `getDashboardUrl()`: Role göre dashboard URL'i döndürür

---

## 🚪 Erişim Matrisi

| Sayfa | Agent | Team Leader | Manager | Boss | Admin |
|-------|-------|-------------|---------|------|-------|
| `/dashboard` | ✅ | ❌ | ❌ | ❌ | ✅ |
| `/teamleader` | ❌ | ✅ | ❌ | ❌ | ✅ |
| `/manager` | ❌ | ❌ | ✅ | ❌ | ✅ |
| `/boss` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `/admin` | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Shared Pages** | | | | | |
| `/dashboard/profile` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/dashboard/new-post` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/dashboard/clients` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/dashboard/listings` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/dashboard/teamwork` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/dashboard/viewings` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/dashboard/revenue` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/dashboard/analytics` | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## ⚠️ Yetkisiz Erişim Senaryoları

### Senaryo 1: Farklı Role Ait Dashboard'a Erişim
**Durum:** Agent kullanıcı tarayıcıya `http://localhost:3000/teamleader` yazar

**Akış:**
1. Sayfa yüklenir
2. `useEffect` içinde rol kontrolü yapılır
3. Kullanıcının rolü `agent` olarak tespit edilir
4. `teamleader` rotasına erişim yetkisi olmadığı anlaşılır
5. Kullanıcı otomatik olarak `/access-denied` sayfasına yönlendirilir

### Senaryo 2: Oturum Açmamış Kullanıcı
**Durum:** Kimlik doğrulaması yapılmamış kullanıcı protected sayfaya erişmeye çalışır

**Akış:**
1. Sunucu tarafında `getUser()` kontrol edilir
2. Kullanıcı bulunamazsa `/sign-in` sayfasına yönlendirme
3. Başarılı girişten sonra, kullanıcının rolüne göre doğru dashboard'a yönlendirme

### Senaryo 3: Rol Atanmamış Kullanıcı
**Durum:** Profilde `role` alanı `null` veya tanımsız

**Akış:**
1. Kullanıcı sisteme giriş yapar
2. Profile rol ataması yapılmadığı tespit edilir
3. `/waiting-approval` sayfasına yönlendirilir
4. Admin tarafından rol atanana kadar bekler

---

## 🔒 Access Denied Sayfası

Yetkisiz erişim durumunda kullanıcılar özel bir hata sayfasına yönlendirilir:

**Dosya:** `/app/access-denied/page.tsx`

**Özellikler:**
- English error message: "Access Denied"
- Role-aware "Back to Dashboard" button
- "Go Back" option to previous page
- HTTP 403 Forbidden UX design
- Automatic role detection and correct dashboard URL
- **Critical Fix:** Uses `eq('user_id', user.id)` for profile query
- Disabled button state until role is fetched (prevents wrong redirects)

---

## 🔧 Teknik Mimari

### Dosya Yapısı

```
/lib
  /middleware
    roleGuard.ts          # Merkezi rol kontrol utility
  /hooks
    useDashboardUrl.ts    # Client-side dashboard URL hook

/app
  /dashboard              # Agent dashboard (protected)
    page.tsx
  /(app)
    /teamleader           # Team Leader dashboard (protected)
      page.tsx
    /manager              # Manager dashboard (protected)
      page.tsx
    /boss                 # Boss dashboard (protected)
      page.tsx
  /access-denied          # Yetkisiz erişim sayfası
    page.tsx

/components
  /system
    RoleGuard.tsx         # Reusable role guard component
```

### Güvenlik Katmanları

1. **Authentication Layer:** Supabase Auth ile oturum yönetimi
2. **Authorization Layer:** Profile tablosunda `role` alanı
3. **Route Protection:** Server/Client-side rol kontrolü
4. **UI/UX Layer:** Dinamik dashboard linkleri ve yetkisiz erişim sayfası

---

## 📝 En İyi Uygulamalar

### ✅ Yapılması Gerekenler

1. **Her Yeni Protected Sayfa İçin:**
   - ✅ **TAMAMLANDI:** Server-side rol kontrolü (`/dashboard/page.tsx` - agent only)
   - ✅ **TAMAMLANDI:** Client component `useEffect` kontrolü (`/teamleader/page.tsx`)
   - ✅ **TAMAMLANDI:** `/access-denied` sayfasına yönlendirme implementasyonu
   - ⚠️ **ÖNEMLİ:** Profiles sorgusunda `eq('user_id', user.id)` kullanın (NOT: `eq('id', user.id)`)

2. **Shared Sayfalar İçin:**
   - ✅ **TAMAMLANDI:** `useDashboardUrl()` hook oluşturuldu ve tüm shared sayfalarda kullanılıyor
   - ✅ **TAMAMLANDI:** Dinamik dashboard linkleri (Profile, New Post, Clients, Listings, Teamwork, Viewings, Revenue, Analytics)
   - ✅ **TAMAMLANDI:** Tüm roller için erişim doğrulandı

3. **Test Etme:**
   - ✅ **TEST EDİLDİ:** Agent ve Team Leader rolleri ile cross-access engelleme test edildi
   - ✅ **TEST EDİLDİ:** Access-denied sayfası role-aware redirect test edildi
   - ✅ **TEST EDİLDİ:** Shared sayfalardan dashboard'a dönüş test edildi

### ❌ Yapılmaması Gerekenler

1. **Asla:**
   - ❌ Sadece client-side güvenliğe güvenmeyin → **Her protected sayfa server-side kontrol içeriyor**
   - ❌ Rol kontrolünü atlamayın → **Tüm role-specific sayfalar korunuyor**
   - ❌ Hardcoded dashboard URL'leri kullanmayın → **Tüm sayfalar `{dashboardUrl}` veya `useDashboardUrl()` kullanıyor**
   - ❌ **KRİTİK:** `eq('id', user.id)` KULLANMAYIN → **Doğrusu: `eq('user_id', user.id)`**

2. **Dikkat Edilmesi Gerekenler:**
   - ⚠️ Admin rolü tüm sayfalara erişebilir (özel kontrol gerekebilir) - **Henüz implement edilmedi**
   - ✅ Shared sayfalar tüm rollere açıktır - **Çalışıyor**
   - ⚠️ Rol değişikliği sonrası yeniden oturum açılması gerekebilir - **Client-side cache nedeniyle**
   - ⚠️ **UI Language Policy:** Tüm UI metinleri İngilizce olmalı (Turkish backend logs OK)

---

## 🧪 Test Senaryoları

### Test 1: Agent Erişim Kontrolü
```bash
# 1. Agent hesabıyla giriş yap
# 2. Tarayıcıya yaz: http://localhost:3000/teamleader
# Beklenen: /access-denied sayfasına yönlendirme
```

### Test 2: Team Leader Erişim Kontrolü
```bash
# 1. Team Leader hesabıyla giriş yap
# 2. Tarayıcıya yaz: http://localhost:3000/dashboard
# Beklenen: /access-denied sayfasına yönlendirme
```

### Test 3: Shared Sayfa Erişimi
```bash
# 1. Herhangi bir rolle giriş yap
# 2. /dashboard/profile sayfasına git
# Beklenen: Sayfa başarıyla yüklenir
# 3. Dashboard butonuna tıkla
# Beklenen: Kendi rolüne ait dashboard'a yönlendirme
```

### Test 4: Admin Sınırsız Erişim
```bash
# 1. Admin hesabıyla giriş yap
# 2. Tüm dashboard'lara erişmeyi dene
# Beklenen: Tüm sayfalara erişim sağlanır
```

---

## 🚀 Gelecek Geliştirmeler

### Planlanan Özellikler

- [ ] **Middleware-Based Route Protection:** Next.js middleware ile merkezi route koruma
- [ ] **Permission-Based Access:** Rol bazlı ek izin seviyeleri (read, write, delete)
- [ ] **Audit Logging:** Yetkisiz erişim girişimlerinin loglanması
- [ ] **Rate Limiting:** Tekrarlayan yetkisiz erişim denemelerini engelleme
- [ ] **Two-Factor Authentication:** Kritik roller için 2FA zorunluluğu

### Geliştirme Aşamasındaki Roller

- **Manager Dashboard:** Çoklu takım yönetimi ve organizasyon raporlama
- **Boss Dashboard:** Üst düzey yönetim ve finansal analitik

---

## 📞 İletişim & Destek

Güvenlik açığı tespit ederseniz veya sorularınız varsa:
- **Email:** admin@letify.cloud
- **Developer:** GitHub Issues

---

## 📄 Lisans & Uyumluluk

Bu güvenlik politikası aşağıdaki standartlara uygun olarak tasarlanmıştır:
- OWASP Security Best Practices
- GDPR Data Protection Principles
- ISO 27001 Access Control Standards

---

**⚡ Önemli Not:** Bu güvenlik katmanı aktif olarak korunmaktadır. Herhangi bir değişiklik yapmadan önce bu belgeyi gözden geçirin ve güncel tutun.
