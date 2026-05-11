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
   - ✅ Assign to Agent (Elevated user delegation)
   - ✅ Billing & Payments
   - ✅ Push Notifications (6 categories, 19 types)
   - ✅ BotID Security
   - ✅ PWA & Offline Support
   - ✅ Advanced Analytics
   - ✅ Internship Task Management (Intern + Teamleader, daily logs, client queries, listing integration)

## Son Deployment Bilgisi (17.02.2026)

### Production Status
- **URL**: https://app.letify.cloud
- **Platform**: Vercel
- **Database**: Supabase (Production) - Migration'lar SQL Editor'de çalıştırıldı
- **Payments**: Stripe (Active)
- **Security**: BotID integrated
- **PWA**: Service worker active, install prompt enhanced
- **Monitoring**: Vercel Analytics + Web Vitals
- **Email System**: 3-stage notification system (Admin approval, Email verified, Account approved) ✅
- **Build Status**: ✅ Production build successful (128 pages, 0 TypeScript errors)
- **Version**: v2.8.9

### Son Eklenen Özellikler (06.04.2026)
1. **AI Second Brain & Content Engineering Pipeline (v2.8.9)**:
   - 2 katmanlı AI içerik analiz pipeline'ı (n8n + Notion + Gemini 2.5 Pro + Apify)
   - Layer 1 — Triage: ~200 içerik linkini 9 kategoriye otomatik sınıflandırma (Notion'dan çek → Gemini ile kategorize → Notion'a yaz)
   - Layer 2 — SM Brain: Social Media içerikleri için 9 kategoride derin analiz (engagement, strategy, visual, copy, hashtag, posting, growth, content_knowledge, overall)
   - content_knowledge kategorisi: İçerik üreticisinin öğrettiği gerçek bilgiyi yapılandırılmış çıkartma (main_teaching, specific_tips, quotes_or_hooks, data_points, frameworks/formulas, industry_insight, knowledge_value_score)
   - Malta & Lettings bağlamı: Tüm AI analizleri küçük ada pazarı, kiralama sektörü ve € referanslarıyla yapılıyor
   - Apify multi-platform scraping: Instagram, Facebook, YouTube, TikTok
   - Supabase + pgvector RAG mimarisi tasarlandı (Layer 3 Knowledge Store + Layer 4 Brain Query — implementasyon bekliyor)
   - tsconfig.json: `"ignoreDeprecations": "6.0"` eklendi (TypeScript 7.0 baseUrl uyarısı fix)

### Son Eklenen Özellikler (02.04.2026)
1. **Dark Mode, PWA Install, RLS & UX Fixes (v2.8.8)**:
   - Teamwork delete RLS fix: `OR is_elevated_user()` — teamleader başkasının kaydını silebilir
   - PWA install prompt global fix: `beforeinstallprompt` module seviyesinde yakalanarak Edge/Opera desteği
   - PWAInstallButton: Agent + Teamleader dashboard'larına download butonu
   - Dark mode fix: 16 React-Select bileşenine `classNamePrefix="react-select"` eklendi
   - Dark mode fix: TeamRevenueClient + EditDealModal ~15+ `dark:` Tailwind classı eklendi
   - Teamleader dashboard'a ThemeToggle + PWAInstallButton eklendi
   - Client Name zorunluluğu kaldırıldı (Add New Deal formunda opsiyonel)
   - Build fix: Boss/Manager teamwork sayfalarına eksik props eklendi

### Önceki Eklenen Özellikler (25.03.2026)
1. **Blocked User Auth Enforcement (v2.8.7)**:
   - Sign-in + Auth callback + RoleGuard middleware'de blocked/denied/pending_admin status kontrolü
   - Profil sayfasında "Blocked" badge gösterimi
   - Access Denied sayfasında blocked kullanıcıya sadece "Sign Out" butonu

2. **Job Applications UX Sprint (v2.9.0)**:
   - Summary stats kartları (8 kart: 7 statü + 1 Hired, mor tema)
   - Status filter, Inline status edit, Bulk actions, Row tint, XLSX export, Debounced search
   - Hired Team Members tablosu: mor tema, pagination (20/sayfa)
   - Pie Chart — Statü Dağılımı (Recharts donut, 8 dilim)
   - PDF Rapor İndirme (jsPDF, Overview + Status Breakdown + Key Insights)
   - EditDealModal: Shortlet/Longlet toggle
   - Agent ↔ Teamleader bidirectional realtime sync

### Önceki Eklenen Özellikler (22.02.2026)
1. **Teamleader Bonus PDF Raporu & Agent Bonus Bildirimleri (v2.7.5)**:
   - Teamleader Bonuses sayfasına PDF rapor indirme butonu eklendi (jsPDF + autoTable)
   - PDF içeriği: Özet, Listing Fee kırılımı (ref_no/tarih/kira/listing fee), Aylık Team Bonus detayları, Grand Totals
   - Agent bonus bildirimi: Deal tamamlandığında (her iki taraf ödediğinde) agent bonus eşiği geçtiyse teamleader/manager/boss'a email + push notification
   - Collaboration With dropdown'unda sadece agent rolündeki kullanıcılar gösterilir
   - Agent dashboard'unda Profile kartı ilk sıraya taşındı
   - React hooks sıralama düzeltmesi (useState early return sonrası hata)

2. **Deal Documents & Collaboration Fix (v2.7.4)**:
   - Agent Collaboration Dropdown Fix: profiles tablosunda `id` yerine `user_id` kullanılacak şekilde düzeltildi
   - Deal Documents Upload: Revenue modal'larına Lease Agreement, Inventory List, Invoice-Owner, Invoice-Client yükleme
   - Paylaşımlı DealDocumentUpload bileşeni (Agent + Teamleader)
   - Supabase Storage: `Lease_agreements` bucket (ref_no ile organize)

3. **Hired Agents Document Upload (v2.7.3)**:
   - Applications sayfasında Hired teamleader doküman yükleme (Passport, CV, Selfie, Service Agreement)
   - Supabase Storage: `hired_agents` bucket (applicant_name ile organize)

4. **Agent Bonus Tracker (v2.7.2)**:
   - Revenue sayfasında Agent Bonus Tracker eklendi
   - Contract Bonus (≥6 deal): %50-%70 × ortalama kira
   - Agency Fee Bonus (<6 deal): €3,000→€150, €5,000→€300
   - Yearly Reward: €48,000 hedef → €2,500 bonus

3. **Bonuses & Performance Sayfası (v2.7.1)**:
   - Teamleader, Boss ve Manager dashboard'larına Bonuses kartı eklendi
   - 4 kademeli bonus sistemi: Tier 1 (€0-5K: 32%/0%), Tier 2 (€5K-10K: 37%/5%), Tier 3 (€10K-15K: 37%/7.5%), Tier 4 (€15K+: 37%/10%)
   - Personal rate, leaderRevenue bazında; team rate, totalRevenue bazında hesaplanır
   - Leadership Performance Chart (yatay bar grafik + sıralama tablosu)
   - Monthly Earnings Breakdown (stacked bar chart + line grafik)
   - Detailed Bonus Breakdown tablosu
   - Dış ajan ("Agent") filtreleme: isExternalAgentName() helper
   - Collaboration mantığı: collaboration_with doluysa rent %50 bölünür (takım içi/dışı fark etmez)
   - Listing fee DB'den okunur (listing_fee alanı)
   - Çift hesap desteği: LEADER_AGENT_ACCOUNTS map ile teamleader ve agent hesapları bağlantılandırılır
   - Deal tamamlanma tarihi: max(landlord_paid_date, client_paid_date)
   - Paylaşılan BonusesClient bileşeni, rol bazlı dashboard geri dönüş linki
   - Boss (/boss/bonuses) ve Manager (/manager/bonuses) sayfaları oluşturuldu

### Önceki Eklenen Özellikler (17.02.2026)
1. **Assign to Agent Feature**:
   - Teamleader/Manager/Boss, agent adına deal ekleyebilir (Add Deal modal)
   - Edit Deal modal ile deal'ları farklı agent'lara reassign edebilir
   - API: target_user_id ile elevated user desteği
   - RLS: is_elevated_user() fonksiyonu ile INSERT/UPDATE policy

2. **⚠️ Pending Migration**:
   - `supabase/migrations/20260217_fix_revenue_insert_policy.sql` Supabase SQL Editor'de çalıştırılmalı
   - Bu olmadan Assign to Agent özelliği RLS hatası verir

### Yeni Eklemeler (02.12.2025)
1. **Production Build & Type System Fixes ✅**
   - Available date field tüm type definitions'a eklendi (listings, teamwork_listings)
   - TypeScript type updates: `types/database.types.ts` comprehensive update
   - Type assertions: `any` kullanımı geçici çözüm olarak kabul edildi (Supabase CLI permission issue)
   - RLS policies: UPDATE policies teamwork tabloları için updated (DROP IF EXISTS pattern)
   - Database migrations: 4 SQL dosyası production'a deploy edildi
   - Build successful: 93 static pages generated, 0 TypeScript errors
   - Memory bank: activeContext.md ve progress.md comprehensive update

2. **Teamwork Auto-Sync System ✅**
   - Listing ve client güncellemeleri otomatik teamwork tablolarına sync
   - API endpoints: `/api/teamwork/listings/sync`, `/api/teamwork/clients/sync`
   - RLS UPDATE policies eklendi (authenticated users için)
   - Server-side batch update pattern (Promise.allSettled)
   - Non-critical sync: Try-catch, no throw on failure

3. **Available Date Timezone Fix ✅**
   - Problem: 1 gün fark (UTC midnight interpretation)
   - Solution: Date parsing'e 'T00:00:00' eklendi
   - Applied: Hem listings hem teamwork sayfalarında
   - Pattern: `new Date(date + 'T00:00:00').toLocaleDateString('en-GB')`

4. **Google Maps Integration Fix ✅**
   - Error handling: API key validation, setup instructions UI
   - API key configured: [GOOGLE_MAPS_API_KEY — use environment variable]
   - Error UI: Collapsible details, user-friendly messages
   - Script loading: onError handler, graceful fallback

5. **Client Data Cleanup ✅**
   - Nationalities: Parantez içi ifadeler kaldırıldı (regex pattern)
   - French consolidation: "French Guiana" → "France"
   - Deduplication: filter() + indexOf() pattern
   - Alphabetical sort: Clean dropdown UX

6. **UI Responsive Improvements ✅**
   - Add listing form: Modal responsive design (max-w-640px, overflow-y-auto)
   - Teamwork clients: Column reorder (People after Family/Sharing)
   - Mobile optimization: Padding, vertical margin, scrollable

### Yeni Eklemeler (24.11.2025)
1. **Email Verification & Notification System ✅**
   - PKCE authentication flow tamamlandı
   - 3 aşamalı email akışı: Sign-up → Email verify → Admin approve
   - Admin client ile service_role API access
   - Session management: email_confirmed_at kontrolü
   - UX improvements: "Verify Email" ekranı, "Waiting Approval" sayfası
   - Email templates: generateEmailVerifiedEmail(), admin approval, account approved

2. **BotID Security v1.5.10** (17.11.2025)
   - API protection with bot detection
   - Korunan rotalar: `/api/sensitive`, `/api/checkout`, `/team/*/activate`, `/api/user/*`
   - Server-side verification: `checkBotId()` pattern
   - Proxy rewrites otomatik yapılandırıldı

3. **PWA Enhancements** (17.11.2025)
   - Global component availability (ClientProviders'a taşındı)
   - Hydration bug fixes
   - Debug logging eklendi
   - Local development support enabled

### Belirtiler
- Tüm memory bank dosyaları 24.11.2025 tarihine güncellenmiş
- progress.md: Email Verification & Notification System eklendi
- systemPatterns.md: Email notification pattern'leri, PKCE flow, admin client pattern eklendi
- techContext.md: SMTP environment variables eklendi
- activeContext.md: Son 3 release dokumentlu (Email System + Push Notifications + BotID/PWA)

Bu sorular proje analizi ile cevaplandı. Memory bank TÜM değişiklikleri track ediyor.
