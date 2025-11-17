# Letify Projesinin Memory Bank'ı

Ben bir uzman yazılım mühendisi olarak, Letify projesinde çalışıyorum. Hafızam oturumlar arasında sıfırlanıyor, bu yüzden Memory Bank'a tamamen güveniyorum. Her görevde tüm memory bank dosyalarını okumalıyım.

## Memory Bank Yapısı

Memory Bank, Markdown formatında core dosyalar ve opsiyonel context dosyalarından oluşur. Dosyalar birbirini tamamlar:

flowchart TD
    PB[projectbrief.md] --> PC[productContext.md]
    PB --> SP[systemPatterns.md]
    PB --> TC[techContext.md]

    PC --> AC[activeContext.md]
    SP --> AC
    TC --> AC

    AC --> P[progress.md]

### Core Dosyalar (Zorunlu)
1. `projectbrief.md`
   - Projenin temel belgesi
   - Proje başlangıcında oluşturulur
   - Temel gereksinimler ve hedefler
   - Proje kapsamının kaynağı

2. `productContext.md`
   - Projenin var olma nedeni
   - Çözdüğü problemler
   - Nasıl çalışması gerektiği
   - Kullanıcı deneyimi hedefleri

3. `activeContext.md`
   - Mevcut çalışma odağı
   - Son değişiklikler
   - Sonraki adımlar
   - Aktif kararlar ve değerlendirmeler
   - Önemli pattern'ler ve tercihleri
   - Öğrenmeler ve proje içgörüleri

4. `systemPatterns.md`
   - Sistem mimarisi
   - Ana teknik kararlar
   - Kullanılan tasarım pattern'leri
   - Component ilişkileri
   - Kritik implementasyon yolları

5. `techContext.md`
   - Kullanılan teknolojiler
   - Development setup
   - Teknik kısıtlamalar
   - Dependencies
   - Tool kullanım pattern'leri

6. `progress.md`
   - Ne çalışıyor
   - Ne inşa edilmesi kaldı
   - Mevcut durum
   - Bilinen problemler
   - Proje kararlarının evrimi

### Ek Context
memory-bank/ içinde organize etmek için ek dosyalar/folders oluştur:
- Karmaşık feature dokümantasyonu
- Integration specifications
- API dokümantasyonu
- Testing stratejileri
- Deployment prosedürleri

## Core Workflow'lar

### Plan Mode
flowchart TD
    Start[Başla] --> ReadFiles[Memory Bank'ı Oku]
    ReadFiles --> CheckFiles[Dosyalar Tamam mı?]

    CheckFiles -->|Hayır| Plan[Plan Oluştur]
    Plan --> Document[Chat'te Dokümante Et]

    CheckFiles -->|Evet| Verify[Context'i Doğrula]
    Verify --> Strategy[Strateji Geliştir]
    Strategy --> Present[Yaklaşımı Sun]

### Act Mode
flowchart TD
    Start[Başla] --> Context[Memory Bank'ı Kontrol Et]
    Context --> Update[Dokümantasyonu Güncelle]
    Update --> Execute[Görevi Yürüt]
    Execute --> Document[Değişiklikleri Dokümante Et]

## Dokümantasyon Güncellemeleri

Memory Bank güncellemeleri şu durumlarda olur:
1. Yeni proje pattern'leri keşfedildiğinde
2. Önemli değişiklikler implement edildikten sonra
3. Kullanıcı **update memory bank** ile istediğinde (TÜM dosyaları gözden geçir)
4. Context'in clarification ihtiyacı olduğunda

flowchart TD
    Start[Güncelleme Süreci]

    subgraph Process
        P1[TÜM Dosyaları Gözden Geçir]
        P2[Mevcut Durumu Dokümante Et]
        P3[Sonraki Adımları Açıkla]
        P4[İçgörüleri & Pattern'leri Dokümante Et]

        P1 --> P2 --> P3 --> P4
    end

    Start --> Process

Not: **update memory bank** ile tetiklendiğinde, bazılarının güncelleme ihtiyacı olmasa bile her memory bank dosyasını gözden geçirmeliyim. Özellikle activeContext.md ve progress.md'yi current state'i track ettikleri için odaklan.

UNUTMA: Her memory reset sonrası tamamen fresh başlıyorum. Memory Bank önceki çalışmaya tek bağlantım. Kesinlik ve clarity ile maintain edilmelidir, effectiveness tamamen accuracy'sine bağlı.

## Proje Hakkında Sorular

Bu agent.md dosyasında cevaplanması gereken sorular:

1. Projenin adı nedir? **Letify**
2. Proje ne yapıyor? **Emlakçılar için property listing yönetim ve team collaboration platformu**
3. Ana teknolojiler neler? **Next.js, Supabase, Stripe, N8N, BotID**
4. Mevcut durum nedir? **Production'da canlı - https://app.letify.cloud (17.11.2025)**
5. En önemli özellikler neler?
   - ✅ Authentication & Profiles
   - ✅ Dashboard & Analytics
   - ✅ Listing Management
   - ✅ Client Management
   - ✅ Teamwork & Sharing
   - ✅ Viewings Tracking
   - ✅ Revenue Management
   - ✅ Billing & Payments
   - ✅ Push Notifications (6 categories, 19 types)
   - ✅ BotID Security
   - ✅ PWA & Offline Support
   - ✅ Advanced Analytics

## Son Deployment Bilgisi (17.11.2025)

### Production Status
- **URL**: https://app.letify.cloud
- **Platform**: Vercel
- **Database**: Supabase (Production)
- **Payments**: Stripe (Active)
- **Security**: BotID integrated
- **PWA**: Service worker active, install prompt enhanced
- **Monitoring**: Vercel Analytics + Web Vitals

### Yeni Eklemeler (17.11.2025)
1. **BotID Security v1.5.10**
   - API protection with bot detection
   - Korunan rotalar: `/api/sensitive`, `/api/checkout`, `/team/*/activate`, `/api/user/*`
   - Server-side verification: `checkBotId()` pattern
   - Proxy rewrites otomatik yapılandırıldı

2. **PWA Enhancements**
   - Global component availability (ClientProviders'a taşındı)
   - Hydration bug fixes
   - Debug logging eklendi
   - Local development support enabled

### Belirtiler
- Tüm memory bank dosyaları 17.11.2025 tarihine güncellenmiş
- activeContext.md: Son 2 release dokumentlu (Push Notifications + BotID/PWA)
- progress.md: Production status güncellenmiş
- techContext.md: BotID dependency ve deployment info eklendi
- PWA_INSTALL_PROMPT_DEBUG.md: Production troubleshooting guide

Bu sorular proje analizi ile cevaplandı. Memory bank TÜM değişiklikleri track ediyor.
