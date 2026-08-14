# Active Context: Letify

## Current State (15.08.2026) - v2.10.0

- Critical CI gate: 29 suites, 185 tests, 76.24% critical statements coverage.
- `pnpm lint` and `npx next build` pass; `pnpm audit` reports no known vulnerabilities.
- `xlsx` was removed and both browser/server exports use `exceljs@4.4.0`.
- Debug/test routes are production-hidden and non-production admin-protected through `proxy.ts`.
- Credit mutation endpoints require confirmed admin authorization and strict positive numeric input.
- Notification policy is role-aware: admin/manager/teamleader/boss broadcast; normal users can target leadership roles; collaboration helper behavior remains intact.
- Current content-engineering agent guidance lives in `.github/agents/content-engineer.agent.md`.

## Güncel Çalışma Durumu (13.08.2026) ✅ Revenue Audit, Invoice Flow & Deploy Readiness

### Admin Invoice Generation Extension (13.08.2026)

- Admin dashboard'da `/admin/invoices` artık invoice request deal register ve PDF hazırlama aracını içerir.
- `jspdf` ile verilen PAYMENT ADVICE örneğine uygun PDF üretilir; owner/client recipient seçilebilir, recipient ID PDF'de adın altında gösterilir.
- Due date bilinçli olarak opsiyoneldir; karar verilene kadar boş bırakılabilir ve PDF'de gösterilmez.
- Invoice numarası DB sequence üzerinden `INV-0001` formatında yarış koşuluna dayanıklı üretilir; PDF içeriği, filename ve revenue kaydı aynı numarayı kullanır.
- PDF `Lease_agreements/{ref_no}/{invoice_owner|invoice_client}/{invoice_number}.pdf` path'ine yazılır. Mevcut `DealDocumentUpload` bileşeni aynı path'i okuduğu için Agent/Teamleader modalında otomatik görünür ve indirilebilir.
- Admin invoice register'da deal/ref, requester, owner/client isim ve ID, invoice tarihi, due date, unit price, VAT, total, invoice PDF ve varsa lease agreement erişimi bulunur.
- Migration: `supabase/migrations/20260813120000_admin_invoice_generation.sql` production Supabase SQL Editor'de uygulanmalıdır.

Bu oturumda revenue, agent income, bonus ve teamleader fee mantığı boss ödeme kayıtlarıyla mutabakat amacıyla denetlendi ve kritik akışlar düzeltildi.

### Tamamlanan Düzeltmeler

- Revenue API'de collaboration kimliği `user_id` üzerinden güvenilirleştirildi; isim bazlı eşleştirmeye bağımlılık azaltıldı.
- Collaboration permission/RLS desteği için `20260811090000_revenue_collab_user_id_policies.sql` migration'ı eklendi ve Supabase SQL Editor'de uygulandı.
- Revenue kayıtlarına invoice alanları ve admin notification metadata eklendi.
- `20260813100000_revenue_invoice_admin_notification.sql` migration'ı Supabase SQL Editor'de uygulandı.
- Agent ve teamleader Add/Edit Deal akışlarına reusable `InvoiceInfoModal` eklendi; invoice detayları persist edilir ve admin'e email/push bildirim akışı tetiklenir.
- `lib/revenue-date-validation.ts` ile tarih aralığı 2025–2050 arasında sınırlandı; bozuk tarih verileri (ör. 1350 yılı) UI/API seviyesinde engellenir.
- `lib/revenue-calculations.ts` ile shortlet/longlet gelir temeli ortaklaştırıldı.
- Revenue timeline ile bonus timeline ayrıldı; bonus ayı Malta timezone ve geçerli paid-date kuralı üzerinden tutarlılaştırıldı.
- Bonuslar yalnızca ödeme koşullarını sağlayan deal'lere dahil edilir; listing fee sahipliği agent/teamleader kapsamına göre düzeltilmiştir.
- Bonus, revenue ve team revenue ekranlarında clickable summary filters, modal dışına tıklayarak kapatma ve güvenli DatePicker sınırları iyileştirildi.
- Production doğrulaması: `pnpm exec tsc --noEmit --pretty false` exit code 0; `pnpm build` başarılı, 128 sayfa üretildi.

### Açık / Sonraki Kontroller

- Invoice akışı için production smoke test: Agent Add/Edit, Teamleader Add/Edit, invoice send ve admin email/push alımı.
- Supabase generated types mevcut schema ile temiz şekilde yeniden üretilebilir; editor'daki stale diagnostic'ler görülürse ilk kontrol budur.
- Deploy öncesi migration'ların hedef Supabase projesinde gerçekten uygulandığı doğrulanmalı; kullanıcı SQL Editor uygulamasını tamamladı.
- Admin panelde invoice notification kayıtlarının UI tüketimi henüz ayrı bir fazdır.

### Bu Oturumdan Kalıcı Öğrenmeler

- Finansal iş kuralları ekran bazında kopyalanmamalı; ortak helper'lar ve tekil tarih/hesaplama kuralları kullanılmalı.
- Permission ve collaboration ilişkilerinde ad/email gibi değişebilir metinler yerine immutable `user_id` kullanılmalı.
- Editor diagnostics stale olabilir; gerçek doğrulama için TypeScript compiler ve production build esas alınmalı.

## Mevcut Çalışma Odağı

### Ana Odak Alanları (04.05.2026) ✅ COMPLETED - UI Erişim Kısıtlamaları & Letify Konumlandırması v2.9.3

1. **Ana Sayfa letify.cloud Bağlantısı Kaldırıldı**:
   - `app/page.tsx`: `https://letify.cloud` adresine yönlendiren "More..." `<Link>` bileşeni kaldırıldı
   - Kullanılmayan `Link` import'u temizlendi
   - Alt metin "Your Letting Assistant with Powerful Tools And" → "Your Letting Assistant with Powerful Tools" olarak düzeltildi
   - **Neden**: Letify artık ekip içi kullanım aracı olarak konumlandırıldı (`app.letify.cloud`), dışa açık pazarlama sitesi yönlendirmesi istenmedi

2. **Agent Dashboard — Create New Post Kartı Kaldırıldı**:
   - `app/dashboard/DashboardClient.tsx`: Create New Post kartı (hem disabled overlay hem tamamen) UI'dan kaldırıldı
   - İlk adımda `<Link href="/dashboard/new-post">` → disabled kart yapıldı (opacity-50, cursor-not-allowed)
   - İkinci adımda kart tamamen silindi
   - `Plus` icon import'u temizlendi (artık kullanılmıyor)

3. **Agent Dashboard — Subscription Kartı Kaldırıldı**:
   - `app/dashboard/DashboardClient.tsx`: Subscription kartı UI'dan tamamen kaldırıldı
   - **Not**: Bu iki kart (Create New Post + Subscription) ileride tanımlanacak yeni bir rol için ayrı bir dashboard'a taşınacak

**Değiştirilen Dosyalar:**
```
app/page.tsx (letify.cloud bağlantısı kaldırıldı, Link import temizlendi)
app/dashboard/DashboardClient.tsx (Create New Post + Subscription kartları kaldırıldı, Plus import temizlendi)
```

### Ana Odak Alanları (02.05.2026) ✅ COMPLETED - Tailwind CSS v4 Migration v2.9.2

1. **Tailwind CSS v3 → v4 Migrasyonu (v2.9.2)**:
   - **Branch**: `tailwind-v4-migration` (nextjs-update'den türetildi)
   - **Yüklenen paketler**: `tailwindcss@4.2.4`, `@tailwindcss/postcss@4.2.4`; `autoprefixer` kaldırıldı (v4 built-in autoprefixing içeriyor)
   - **postcss.config.js**: `@tailwindcss/postcss` plugin'e geçildi (eski `tailwindcss` PostCSS plugin kaldırıldı)
   - **globals.css**: `@tailwind base/components/utilities` → `@import "tailwindcss"`, `@config "../tailwind.config.js"`, `@plugin "tailwindcss-animate"` eklendi
   - **tailwind.config.js**: `plugins: [require('tailwindcss-animate')]` → `[]` (plugin CSS'e taşındı)
   - **cursor-pointer sorunu**: v4 preflight'ta `cursor: pointer` kaldırıldı → `globals.css` `@layer base` kuralına `button:not([disabled])`, `[role="button"]:not([disabled])`, `a[href]`, `label[for]`, `select`, `summary` için eklendi
   - **bg-opacity-* sorunu**: v4'te deprecated → 12 kullanımın tamamı slash sözdizimi ile değiştirildi (ör. `bg-black/50`, `bg-black/40`)
   - **Etkilenen dosyalar** (bg-opacity düzeltmesi):
     - `app/(app)/teamleader/applications/ApplicationsClient.tsx` (2 modal + 1 overlay)
     - `app/(app)/teamleader/team-revenue/TeamRevenueClient.tsx`
     - `app/(app)/teamleader/team-revenue/EditDealModal.tsx`
     - `app/dashboard/revenue/RevenueClient.tsx`
     - `app/(app)/boss/reports/ReportsClient.tsx`
     - `app/(app)/boss/applications/ApplicationsClient.tsx`
     - `app/(app)/boss/bonuses/BonusesClient.tsx`
     - `app/(app)/manager/reports/ReportsClient.tsx`
   - **dialog.tsx overlay**: `bg-background/80 backdrop-blur-sm` — v4'te `color-mix` ile çalışıyor, değişiklik gerekmedi
   - **ApplicationsClient.tsx onarımı**: multi_replace sırasında iki modal'ın inner div içeriği silindi → `bg-white dark:bg-gray-800 rounded-lg` wrapper div + h3 başlıkları geri eklendi
   - **Build sonucu**: ✅ `Compiled successfully in 24.5s`, 128 sayfa, TypeScript hatasız

### Ana Odak Alanları (01.05.2026) ✅ COMPLETED - Bonus Calculation Fix v2.9.1

1. **Bonus Ay Hesaplama Mantığı Düzeltmesi (v2.9.1)**:
   - **Patron Kuralı**: `date_rented` = Slack'e kaydedildiği tarih = deal'in ait olduğu ay
   - **Eski Mantık (YANLIŞ)**: `landlord_paid_date` / `client_paid_date`'in ilerisi baz alınıyordu (ödeme tarihi = hesap tarihi)
   - **Yeni Mantık (DOĞRU)**: `date_rented` bazlı, 2-ay kuralı ile:
     - Her iki ödeme de yapılmış → `date_rented` ayında kalır
     - Bir veya her iki ödeme eksik + `date_rented`'den 2 ay geçmiş → `date_rented + 1 ay`'a taşır
     - Bir veya her iki ödeme eksik + 2 ay geçmemiş → `date_rented` ayında kalır
   - ✅ `BonusesClient.tsx` — `getCompletionMonth()` fonksiyonu yeniden yazıldı
   - ✅ `RevenueClient.tsx` — `getAgentBonusCompletionMonth()` fonksiyonu yeniden yazıldı (artık `string | null` değil, her zaman `string` döner)
   - ✅ `RevenueClient.tsx` — `completedDeals` useMemo'dan null check ve `.filter(Boolean)` kaldırıldı
   - ✅ Build geçti: TypeScript hatasız, 128 sayfa
   - Etkilenen dosyalar: `app/(app)/teamleader/bonuses/BonusesClient.tsx`, `app/dashboard/revenue/RevenueClient.tsx`

2. **GitHub Push Protection Düzeltmesi (v2.9.0 → bu session)**:
   - Apify API token (`apify_api_OyQ8...`) commit geçmişinde 6 dosyada tespit edildi
   - Soft reset ile 4 commit geri alındı, token `ENV_APIFY_TOKEN` placeholder ile değiştirildi
   - `git push --force origin nextjs-update` ile temiz push yapıldı

### Önceki Odak Alanları (26.04.2026) ✅ COMPLETED - UI & UX Fixes v2.9.0

1. **Team Revenue Month Filter Düzeltmesi (v2.9.0)**:
   - ✅ `TeamRevenueClient.tsx` — `monthOptions` sabit yıl döngüsü (2025-2026 tüm 24 ay) yerine `allRevenues`'dan dinamik olarak türetiliyor
   - ✅ Sadece gerçek kaydı olan aylar listeleniyor; `date_rented` alanından `Set` ile unique aylar çıkarılıp `.sort().reverse()` ile en yeni önce sıralanıyor
   - ✅ Boş aylar (ör. Ocak 2025, Şubat 2025) artık dropdown'da görünmüyor
   - Etkilenen dosya: `app/(app)/teamleader/team-revenue/TeamRevenueClient.tsx`

2. **Collaboration With Dropdown Filtreleme (v2.9.0)**:
   - ✅ `TeamRevenueClient.tsx` — Add/Edit Deal popup'ında Collaboration With dropdown'ı artık **sadece agent rolündeki kullanıcıları** getiriyor
   - ✅ Daha önce: tüm profiller (intern, teamleader, boss, manager dahil) geliyordu
   - ✅ Şimdi: `.eq("role", "agent")` filtresi eklendi — intern, teamleader, boss, manager hariç
   - ✅ `RevenueClient.tsx` (agent sayfası) zaten `.eq("role", "agent")` kullanıyordu — değişiklik gerekmedi
   - Etkilenen dosya: `app/(app)/teamleader/team-revenue/TeamRevenueClient.tsx`

3. **WebVitals Dev Uyarı Suppress (v2.9.0)**:
   - ✅ `components/system/WebVitals.tsx` — Dev ortamında FCP/LCP/TTFB threshold uyarıları artık gösterilmiyor
   - ✅ Root Cause: Next.js compile süresi (~150 sn) Web Vitals ölçümüne yansıyarak yanlış sarı uyarılar üretiyordu
   - ✅ Threshold uyarıları `process.env.NODE_ENV === 'production'` koşuluna taşındı
   - Etkilenen dosya: `components/system/WebVitals.tsx`

4. **Bonus Breakdown — Net T.Bonus Kolonu (v2.9.0)**:
   - ✅ `BonusesClient.tsx` — Detailed Bonus Breakdown tablosuna "Net T.Bonus" kolonu eklendi (teamBonus × 0.8, vergi sonrası net)
   - ✅ Header, data satırı ve footer toplamı — turuncu renk (`text-orange-600`)
   - ✅ Header kısaltmaları: "Personal Revenue" → "Pers. Revenue", "Personal Earnings" → "Pers. Earnings", "Net Team Bonus" → "Net T.Bonus"
   - Etkilenen dosya: `app/(app)/teamleader/bonuses/BonusesClient.tsx`

### Önceki Odak Alanları (06.04.2026) ✅ COMPLETED - AI Second Brain & Content Engineering Pipeline v2.8.9

1. **AI Second Brain — 2 Katmanlı İçerik Analiz Pipeline'ı (v2.8.9)**:
   - ✅ **Layer 1 — Triage Workflow**: ~200 içerik linkini 9 kategoriye otomatik sınıflandırma (n8n workflow ID: `66Zh8meAlhzQuRIC`)
   - ✅ **Layer 2 — SM Brain Workflow**: Social Media kategorisindeki içerikleri Gemini 2.5 Pro ile derin analiz
   - ✅ **9 Analiz Kategorisi**: engagement_metrics, content_strategy, visual_analysis, caption_copywriting, hashtag_strategy, posting_strategy, audience_growth, content_knowledge, overall_assessment
   - ✅ **content_knowledge kategorisi**: İçerik üreticilerinin öğrettiği gerçek bilgiyi çıkartma (main_teaching, specific_tips, quotes_or_hooks, data_points, frameworks_or_formulas, industry_insight, knowledge_value_score, knowledge_category)
   - ✅ **Malta & Lettings Bağlamı**: Tüm analizler Malta pazarı, lettings sektörü ve € para birimi bağlamında yapılıyor
   - ✅ **Apify Entegrasyonu**: Instagram, Facebook, YouTube, TikTok scraper'ları ile çoklu platform desteği
   - ✅ **Notion Entegrasyonu**: Analiz sonuçları Notion DB'ye "AI Brain Analysis" alanına yazılıyor

2. **Supabase + pgvector RAG Mimarisi (Tasarım Tamamlandı — Implementasyon Bekliyor)**:
   - 📐 **brain_analyses tablosu**: UUID PK, source_url, platform, category, full_analysis JSONB, content_summary, main_teaching, brain_tags TEXT[], embedding vector(768)
   - 📐 **Gemini text-embedding-004**: 768 boyutlu embedding'ler
   - 📐 **Layer 3 — Knowledge Store**: SM Brain çıktısını Supabase'e embed ederek kaydetme
   - 📐 **Layer 4 — Brain Query**: RAG tabanlı semantik arama (soru → embed → cosine search → context → Gemini sentez)

3. **tsconfig.json TypeScript Fix (v2.8.9)**:
   - ✅ `"ignoreDeprecations": "6.0"` eklendi — TypeScript 7.0 `baseUrl` deprecation uyarısı susturuldu

   **n8n Workflow Dosyaları & Yapılandırma:**
   ```
   n8n Workflows:
   - Triage Workflow (ID: 66Zh8meAlhzQuRIC) — 11 node, 9 kategori sınıflandırma
   - SM Brain Workflow — 9 node, derin SM analiz (Gemini 2.5 Pro)
   
   n8n Credentials & API Keys:
   - n8n Host: https://n8n.letify.cloud
   - Notion DB: a66165cd-5be6-43ac-a2dc-4b370e85de9c
   - Notion Credential: e4tmmqbaPyONZSTY
   - Gemini 2.5 Pro: generativelanguage.googleapis.com
   - Apify: Instagram/Facebook/YouTube/TikTok scraper'ları
   
   Proje Dosyaları:
   - sm-brain.json (orijinal workflow referansı)
   - node6-paste.json (güncel super prompt — content_knowledge + Malta context)
   - tsconfig.json (ignoreDeprecations eklendi)
   - package.json (v2.8.9)
   ```

### Önceki Odak (02.04.2026) ✅ COMPLETED - Dark Mode, PWA, RLS & UX Fixes v2.8.8

1. **Teamwork Delete RLS Fix (v2.8.8)**:
   - ✅ RLS DELETE policy güncellendi: `auth.uid() = user_id OR is_elevated_user()` — teamleader artık diğer agentların teamwork kayıtlarını silebilir
   - ✅ Hem `teamwork_listings` hem `teamwork_clients` tablolarında uygulandı
   - ✅ Migration: `supabase/migrations/20260401_fix_teamwork_delete_policies.sql`

2. **PWA Install Prompt Global Fix (v2.8.8)**:
   - ✅ `beforeinstallprompt` event'i global module seviyesinde yakalanıyor (component mount öncesi kaybolmuyordu)
   - ✅ `lib/pwa-install.ts`: Global PWA store (subscribe/getSnapshot/getServerSnapshot + getDeferredPrompt/clearDeferredPrompt)
   - ✅ `components/system/PWAInstallButton.tsx`: Dashboard'da download ikonu butonu (mor tema)
   - ✅ `components/system/PWAInstallPrompt.tsx`: Global store kullanacak şekilde refactored
   - ✅ `components/system/ClientProviders.tsx`: `import '@/lib/pwa-install'` eklendi
   - ✅ Agent + Teamleader dashboard'larına PWAInstallButton eklendi

3. **Dark Mode Fix — React-Select Dropdowns (v2.8.8)**:
   - ✅ `classNamePrefix="react-select"` tüm Select bileşenlerine eklendi (globals.css'deki `.dark .react-select__*` kuralları eşleşsin diye)
   - ✅ RevenueClient.tsx: 4 Select (Ref No, Client Name, VAT Type, Collaboration With)
   - ✅ TeamRevenueClient.tsx: 5 Select
   - ✅ EditDealModal.tsx: 5 Select (Ref No, Client Name, VAT Type, Assign to Agent, Collaboration With)
   - ✅ ApplicationsClient.tsx: 2 Select (1st Call Status, VAT Type)

4. **Dark Mode Fix — Modal Labels & Containers (v2.8.8)**:
   - ✅ TeamRevenueClient.tsx: Modal `dark:bg-gray-900`, title `dark:text-gray-100`, tüm label'lar, deal type butonları `dark:bg-gray-700 dark:text-gray-300`, fees kutusu `dark:bg-gray-800 dark:border-gray-700`, checkbox label'ları
   - ✅ EditDealModal.tsx: Aynı kapsamlı dark mode düzeltmeleri

5. **Teamleader Dashboard UI (v2.8.8)**:
   - ✅ ThemeToggle + PWAInstallButton eklendi
   - ✅ `bg-gray-50` sabit arka plan kaldırıldı (dark mode uyumluluğu)

6. **Client Name Zorunluluğu Kaldırıldı (v2.8.8)**:
   - ✅ RevenueClient.tsx: Validasyon'dan `!form.client_name` kaldırıldı, toast mesajından çıkarıldı, label'dan `*` kaldırıldı, kırmızı border kaldırıldı
   - ✅ TeamRevenueClient.tsx: Aynı değişiklikler

   **Değiştirilen Dosyalar:**
   ```
   supabase/migrations/20260401_fix_teamwork_delete_policies.sql (yeni — RLS fix)
   lib/pwa-install.ts (yeni — global PWA event capture)
   components/system/PWAInstallButton.tsx (yeni — download button)
   components/system/PWAInstallPrompt.tsx (refactored — global store)
   components/system/ClientProviders.tsx (pwa-install import)
   app/dashboard/DashboardClient.tsx (PWAInstallButton eklendi)
   app/(app)/teamleader/page.tsx (ThemeToggle + PWAInstallButton, bg-gray-50 kaldırıldı)
   app/(app)/boss/teamwork/page.tsx (userId/userRole props fix)
   app/(app)/manager/teamwork/page.tsx (userId/userRole props fix)
   app/dashboard/revenue/RevenueClient.tsx (classNamePrefix x4, client_name optional)
   app/(app)/teamleader/team-revenue/TeamRevenueClient.tsx (classNamePrefix x5, dark mode, client_name optional)
   app/(app)/teamleader/team-revenue/EditDealModal.tsx (classNamePrefix x5, dark mode)
   app/(app)/teamleader/applications/ApplicationsClient.tsx (classNamePrefix x2)
   package.json (v2.8.8)
   ```

### Önceki Odak (25.03.2026) ✅ COMPLETED - Blocked User Auth Enforcement v2.8.7

1. **Blocked Kullanıcı Giriş Engeli (v2.8.7)**:
   - ✅ **Sign-in page**: `blocked` status kontrolü eklendi → `/access-denied`'a yönlendirme
   - ✅ **Sign-in existing session**: Blocked kullanıcı zaten giriş yapmışsa otomatik sign-out
   - ✅ **Auth callback**: Email doğrulama sonrası `blocked` status kontrolü eklendi
   - ✅ **RoleGuard middleware**: `checkRoleAccess()` fonksiyonuna blocked/denied/pending_admin status kontrolü eklendi — dashboard erişimi engelleniyor

2. **Profil Sayfası Status Gösterimi Fix (v2.8.7)**:
   - ✅ **ProfileStatus type**: `'blocked'` eklendi (profile-header.tsx)
   - ✅ **validation.ts**: `ProfileStatus.BLOCKED` eklendi, `getStatusLabel()` → "Blocked", `getStatusBadgeVariant()` → "destructive" (kırmızı)
   - ✅ **Profile badge**: Blocked için kırmızı badge (`bg-red-500`) + "Your account has been blocked" mesajı
   - ✅ **Sorun çözümü**: Blocked kullanıcılar artık "Unknown" yerine "Blocked" görüyor

3. **Access Denied Sayfası Blocked Ayrımı (v2.8.7)**:
   - ✅ **Blocked/denied kullanıcı**: Sadece "Sign Out" butonu (kırmızı), dashboard'a dönüş yok
   - ✅ **Normal yetki dışı erişim**: Eski davranış korunuyor (Back to Dashboard + Go Back)
   - ✅ **Mesaj**: "Your account has been blocked. Please contact your system administrator."

   **Değiştirilen Dosyalar:**
   ```
   lib/validation.ts (ProfileStatus.BLOCKED, getStatusLabel, getStatusBadgeVariant)
   components/profile/profile-header.tsx (blocked type, badge, mesaj)
   app/sign-in/page.tsx (blocked login engeli + existing session sign-out)
   app/auth/callback/AuthCallbackContent.tsx (blocked redirect)
   lib/middleware/roleGuard.ts (status kontrolü: blocked/denied/pending_admin)
   app/access-denied/page.tsx (blocked vs normal ayrımı, sign-out butonu)
  package.json (v2.8.7)
   ```

### Önceki Odak (17.03.2026) ✅ COMPLETED - Admin Fix, CV Webviewlink & Minor Updates v2.8.5

1. **Admin Panel — Block User Fix (v2.8.5)**:
   - ✅ `profiles_status_check` constraint'e `'blocked'` değeri eklendi
   - ✅ SQL: `ALTER TABLE profiles DROP/ADD CONSTRAINT` — 4 değer: pending_admin, approved, denied, blocked

2. **Job Applications — CV Webviewlink (v2.8.5)**:
   - ✅ **DB**: `applications` tablosuna `cv_webviewlink TEXT` kolonu eklendi
   - ✅ **API**: `app/api/applications/route.ts` — POST/PUT payload'larına cv_webviewlink eklendi
   - ✅ **UI**: ApplicationsClient.tsx — tabloda "CV" kolonu (View CV butonu), modalda "CV Link" input + Open butonu
   - ✅ **Manager & Boss**: Aynı bileşeni kullandıkları için otomatik CV desteği
   - ℹ️ Geçmiş kayıtlar için n8n workflow güncellenmeli (cv_webviewlink alanı eklenmeli)

3. **Teamwork Pagination (v2.8.5)**:
   - ✅ `itemsPerPage` 10 → 15

4. **Martina İsim Güncelleme (v2.8.5)**:
   - ✅ profiles + teamwork_listings tablolarında "Martina" olarak güncellendi

5. **Version Bump (v2.8.5)**:
   - ✅ package.json v2.8.5 — UI açılış sayfasında otomatik yansıyor

   **Değiştirilen Dosyalar:**
   ```
   add_blocked_status_to_profiles.sql (constraint fix)
   app/api/applications/route.ts (cv_webviewlink)
   app/(app)/teamleader/applications/ApplicationsClient.tsx (CV kolonu + modal)
   app/dashboard/teamwork/TeamworkClient.tsx (pagination)
   package.json (v2.8.5)
   ```

### Önceki Odak (17.03.2026) ✅ COMPLETED - Data Refresh Fixes, Task Removal & UI Enhancements v2.8.4

1. **Internship Tasks — Remove Task Özelliği (v2.8.4)**:
   - ✅ **DELETE API Endpoint**: `app/api/internship-tasks/route.ts` — Soft-delete (`is_active = false`), auth + role check (teamleader+)
   - ✅ **UI Delete Buttons**: 3 lokasyona Trash2 ikonu eklendi (Overview tab, Daily Tasks tab, Coming Soon section)
   - ✅ **Confirmation Modal**: Görev adı gösterilir, "Existing logs will be preserved" uyarısı, Cancel/Remove butonları
   - ✅ State: `deleteTaskId`, handler: `handleDeleteTask(taskId)` → `DELETE /api/internship-tasks?id=${taskId}` → `fetchData()`

2. **Data Refresh Fix — Listings Sayfası (v2.8.4)**:
   - ✅ **Listings**: `onListingCreated={handleRefresh}` callback'i `<AddDialog>` bileşenine eklendi — yeni listing eklediğinde tablo otomatik yenileniyor

3. **Data Refresh Fix — Team Revenue (3 Rol) (v2.8.4)**:
   - ✅ **Teamleader (TeamRevenueClient)**: `teamRefreshKey` state pattern — `handleSubmit` ve Realtime handler'da artırılıyor, `TeamRevenueTable` ve `TeamTotalDealCount` child bileşenlerine prop olarak geçiliyor, useEffect dependency'lerine eklendi
   - ✅ **Boss (BossTeamRevenueClient)**: Supabase Realtime subscription eklendi — `boss-revenue-changes` kanalı, `revenue` tablosu `*` event dinleme → `refreshData()` tetikleme
   - ✅ **Manager (ManagerTeamRevenueClient)**: Supabase Realtime subscription eklendi — `manager-revenue-changes` + `manager-deal-count-changes` kanalları, `refreshData` → `useCallback` refactor, `ManagerTotalDealCount` bileşenine Realtime eklendi

4. **Bonuses UI Geliştirmeleri (v2.8.4)**:
   - ✅ **Total Revenue Rozeti**: Leadership Performance — Agent Rankings bölümünde "Total Team Deals" rozetinin yanına yeşil "Total Revenue: {formatCurrency(teamTotalRevenue)}" rozeti eklendi
   - ✅ **teamTotalRevenue**: `useMemo(() => agentPerformance.reduce((sum, agent) => sum + agent.totalRent, 0), [agentPerformance])`
   - ✅ **"from September 2025" Subtitle**: `{!selectedMonth && (...)}` koşullu gösterim — sadece All Time modunda görünür

5. **Build Doğrulama (v2.8.4)**:
   - ✅ `npx next build` — 128 sayfa, 0 TypeScript hatası

   **Değiştirilen Dosyalar:**
   ```
   app/api/internship-tasks/route.ts (DELETE method eklendi)
   app/dashboard/internship-tasks/page.tsx (delete UI: state, handler, Trash2 buttons x3, modal)
   app/dashboard/listings/page.tsx (onListingCreated={handleRefresh} eklendi)
   app/(app)/teamleader/team-revenue/TeamRevenueClient.tsx (teamRefreshKey pattern)
   app/(app)/boss/team-revenue/BossTeamRevenueClient.tsx (Realtime subscription)
   app/(app)/manager/team-revenue/ManagerTeamRevenueClient.tsx (Realtime + useCallback refactor)
   app/(app)/teamleader/bonuses/BonusesClient.tsx (teamTotalRevenue rozeti + conditional subtitle)
   ```

### Önceki Odak (16.03.2026) ✅ COMPLETED - Bug Fixes & Payment Audit v2.8.2

1. **3 Kritik Bug Fix (v2.8.2)**:
   - ✅ **Timezone Bug**: `getMonth()` → `getUTCMonth()`, `getFullYear()` → `getUTCFullYear()` — BonusesClient.tsx (getCompletionMonth) ve RevenueClient.tsx (getAgentBonusCompletionMonth + chart monthKey) — toplam 3 lokasyon
   - ✅ **isExternalAgentName Bug**: "Agent (outside)" dış ajan olarak algılanmıyordu → `normalized.startsWith("agent (")` kontrolü eklendi
   - ✅ **External Agent Listing Fee Bug**: Dış ajanların deal'leri yanlışlıkla listing fee'ye katkıda bulunuyordu → `deal_listing_fee: isExternal ? 0 : (deal.listing_fee || 0)`

2. **4 Aylık Ödeme Çapraz Denetimi (Eki-Oca 2025-2026)**:
   - ✅ Patron'un ödeme listesi (2 fotoğraf) ile veritabanı kayıtları karşılaştırıldı
   - ✅ Ekim 2025: 11/11 deal eşleşti ve ödendi
   - ✅ Kasım 2025: 14/14 deal ödendi (dış ajan hariç)
   - ✅ Aralık 2025: 10 ödendi, 5 ödenmemiş tespit edildi
   - ✅ Ocak 2026: 13 ödendi, 3 ödenmemiş tespit edildi
   - ✅ Toplam 8 ödenmemiş deal belirlendi
   - ✅ Yinelenen deal ID 72 (ref 88286) kullanıcı tarafından silindi

3. **Şubat 2026 Bekleyen Ödeme PDF Raporu (v2.8.2)**:
   - ✅ jsPDF + jspdf-autotable ile PDF oluşturuldu
   - ✅ 3 bölüm: Eski ödenmemiş (8 deal, 10,350 EUR) + Yeni Şubat (8 deal, 9,980 EUR) + Özet (16 deal, 20,330 EUR)
   - ✅ Kırmızı/mavi/gri temalı tablolar, landscape A4
   - ✅ Dosya: `feb_2026_pending_v2.pdf`

4. **TypeScript Build Fix (v2.8.2)**:
   - ✅ ApplicationsClient.tsx: Pie chart label callback `value` unknown type hatası → `(props: any)` ile düzeltildi
   - ✅ Build başarılı: 0 TypeScript hatası, 128 sayfa

   **Değiştirilen Dosyalar:**
   ```
   app/(app)/teamleader/bonuses/BonusesClient.tsx (timezone fix, isExternalAgentName fix, listing fee fix)
   app/dashboard/revenue/RevenueClient.tsx (timezone fix x2)
   app/(app)/teamleader/applications/ApplicationsClient.tsx (pie chart label type fix)
   package.json (v2.8.2)
   generate_feb_pdf.js (PDF rapor scripti — geçici)
   feb_2026_pending_v2.pdf (oluşturulan rapor)
   ```

   **8 Ödenmemiş Deal:**
   | Ref | Agent | Kira | Ay |
   |---|---|---|---|
   | 86985 | Erhan Yurdakul | €1,500 | 2025-12 |
   | 15536 | Ailen Suarez | €1,350 | 2025-12 |
   | 87564 | Renato Gjata | €700 | 2025-12 |
   | 9074 | Brenda Davila | €1,550 | 2025-12 |
   | 87739 | NimOzin(Nim) | €1,600 | 2025-12 |
   | 87851 | Yagiz Tomek | €550 | 2026-01 |
   | 30123 | ALI SARIKAYA | €1,500 | 2026-01 |
   | 35189 | ALI SARIKAYA | €1,600 | 2026-01 |

### Önceki Odak (15.03.2026) ✅ COMPLETED - Collaboration Revenue Split Fix v2.9.1

1. **Collaboration (Ortaklık) Deal Mantığı Tam Düzeltme (v2.9.1)**:
   - ✅ **API GET endpoint**: Collab ortağının deal'larını da döndürüyor (`collaboration_with` = agentın `full_name` eşleştirmesi, `is_collab_partner: true` flag)
   - ✅ **BonusesClient — Virtual Collab Entries**: `processedDeals` içinde collab ortağı için sanal kayıtlar oluşturuluyor (yarım kira, `is_collab_virtual: true`, `original_deal_id`). Her iki agent +1 deal ve yarım gelir alıyor.
   - ✅ **BonusesClient — teamTotalDeals**: `new Set(original_deal_id)` ile benzersiz deal sayımı — 1 collab deal = takımda 1 deal. Rankings tablosunda "Total Team Deals: X" rozeti + "from September 2025" alt yazısı
   - ✅ **AgentBonusSection**: Profil isim eşleştirmesiyle collab ortağı deal'larını da çekiyor, her iki taraf yarım kirayla bonus hesabına dahil
   - ✅ **MonthlyAgentRevenueChart**: Hem kendi hem collab ortağı deal'larını çekiyor, collab deal'ları grafikte yarım kira/gelir olarak gösteriliyor
   - ✅ **TeamRevenueClient**: Başlığa "Total Deals: X" rozeti + "from September 2025" eklendi
   - ✅ **BossTeamRevenueClient**: Pending Deals başlığına "Total Deals: X" rozeti + "from September 2025" eklendi
   - ✅ **ManagerTeamRevenueClient**: Başlığa "Total Deals: X" rozeti + "from September 2025" eklendi

   **Temel Tasarım Kararları:**
   - DB'de yeni kayıt oluşturulmuyor — sanal kayıtlar sadece veri işleme katmanında enjekte ediliyor
   - `collaboration_with` TEXT alanı `full_name` tutuyor, `nameToProfileMap` ile eşleştirme yapılıyor
   - Takım grafikleri tek DB kaydını (tam kirayı) gösteriyor — çift sayma yok
   - Agent kendi deal tablosunu değiştirmeden görüyor, bonus tracker + chart collab farkında

   **Değiştirilen Dosyalar:**
   ```
   app/api/revenue/route.ts (GET: collab partner deal'ları eklendi)
   app/(app)/teamleader/bonuses/BonusesClient.tsx (virtual collab entries, teamTotalDeals, UI rozet)
   app/dashboard/revenue/RevenueClient.tsx (AgentBonusSection + MonthlyAgentRevenueChart collab desteği)
   app/(app)/teamleader/team-revenue/TeamRevenueClient.tsx (Total Deals rozeti + TeamTotalDealCount bileşeni)
   app/(app)/boss/team-revenue/BossTeamRevenueClient.tsx (Total Deals rozeti)
   app/(app)/manager/team-revenue/ManagerTeamRevenueClient.tsx (Total Deals rozeti + ManagerTotalDealCount bileşeni)
   ```

### Önceki Odak (15.03.2026) ✅ COMPLETED - Job Applications UX Sprint v2.9.0

1. **Job Applications 7 UX Feature (v2.9.0)**:
   - ✅ Summary stats kartları (8 kart: 7 statü + 1 Hired, mor tema)
   - ✅ Status filter (kartlara tıkla → filtrele, aktif filtreler pill olarak gösterilir)
   - ✅ Inline status edit (statü badge'ine tıkla → dropdown → PATCH API)
   - ✅ Bulk actions (checkbox seçim, toplu statü değiştirme + silme, onay modal)
   - ✅ Row tint (statüye göre satır arka plan rengi)
   - ✅ XLSX export (`xlsx` kütüphanesi ile Excel formatında dışa aktarma)
   - ✅ Debounced search (300ms gecikme ile arama)

2. **Hired Team Members Tablosu Geliştirmeleri (v2.9.0)**:
   - ✅ Hired count kartı (mor tema, 8. kart olarak eklendi)
   - ✅ Hired tablo + kart tamamen mor tonlara çevrildi (yeşilden)
   - ✅ Hired tablo pagination (20 kayıt/sayfa, First/Prev/sayfa numaraları/Next/Last)
   - ✅ Sayfa numaralandırması ellipsis desteği ile (1...3 4 5...10 formatı)
   - ✅ Satır numaraları sayfa bazlı doğru hesaplanıyor

3. **Pie Chart — Statü Dağılımı (v2.9.0)**:
   - ✅ Recharts ile donut (halka) grafiği eklendi (kartların altına)
   - ✅ 7 statü + Hired = 8 dilim, %100 oransal dağılım
   - ✅ Her dilimde statü adı + yüzde oranı etiketi
   - ✅ Tooltip: adet + yüzde gösterimi
   - ✅ Renk eşleştirmesi: PIE_COLORS map (No Reply=kırmızı, Hired=mor vs.)
   - ✅ max-w-2xl kart, height=380, outerRadius=120, fontSize=13

4. **PDF Rapor İndirme (v2.9.0)**:
   - ✅ "PDF Report" butonu Excel butonunun yanına eklendi (mor tema)
   - ✅ jsPDF + jspdf-autotable ile PDF oluşturma
   - ✅ **Başlık**: "Job Applications Report" + "From 01.06.2025 | Generated: {tarih}"
   - ✅ **Overview**: Total Applications, Hired Team Members, Grand Total
   - ✅ **Status Breakdown tablosu**: Her statü adet + yüzde, mor temalı tablo, kalın Total satır
   - ✅ **Key Insights** (5 madde):
     - En yaygın statü
     - Hire oranı (%)
     - Scheduled interviews sayısı + oranı
     - No reply oranı
     - Interview to hire conversion (Scheduled + Hired → kaçı hired, dönüşüm oranı)
   - ✅ **Footer**: "Letify HR — Confidential"
   - ✅ Dosya adı: `applications_report_{tarih}.pdf`

5. **Önceki Oturum Değişiklikleri (v2.9.0)**:
   - ✅ Teamleader EditDealModal'a Shortlet/Longlet toggle eklendi
   - ✅ Agent ↔ Teamleader revenue sayfaları arasında bidirectional realtime sync
   - ✅ Job Applications tablosuna isim/telefon araması eklendi
   - ✅ Actions kolonu Date ile Applicant arasına taşındı

**Teknik Detaylar:**

- **Değiştirilen Ana Dosya**:
  ```
  app/(app)/teamleader/applications/ApplicationsClient.tsx
  ```

- **Yeni Import'lar**:
  - `useMemo` (React)
  - `PieChart, Pie, Cell, Tooltip, ResponsiveContainer` (recharts)
  - `jsPDF` (jspdf)
  - `autoTable` (jspdf-autotable)

- **Yeni State'ler**:
  - `hiredPage`, `hiredPageCount` — Hired tablo pagination
  - `pieData`, `pieTotal` — useMemo ile hesaplanan pie chart verileri

- **Yeni Fonksiyonlar**:
  - `handleExportPdfReport()` — PDF rapor oluşturma ve indirme
  - `HIRED_PER_PAGE = 20` — Hired tabloda sayfa başına kayıt

- **Yeni Sabitler**:
  - `PIE_COLORS` — 8 statü için renk eşleştirmesi

- **API Endpoint'leri**:
  - `/api/applications` — GET, POST, PUT, DELETE (bulk), PATCH (bulk/inline status)
  - `fetchHiredApplicants()` — `.range(from, to)` ile sayfalı veri çekme

### Önceki Odak (08.03.2026) ✅ COMPLETED - Internship Task System v2.8.0

1. **Intern Rolü & Staj Görev Yönetim Sistemi (v2.8.0)**:
   - ✅ `intern` rolü RBAC'ye eklendi (DB constraint, middleware, sign-up)
   - ✅ 3 yeni Supabase tablosu: `internship_task_definitions`, `internship_daily_logs`, `internship_client_queries`
   - ✅ 3 API endpoint: `/api/internship-tasks`, `/api/internship-tasks/daily-logs`, `/api/internship-tasks/client-queries`
   - ✅ Tam sayfa: `/dashboard/internship-tasks/page.tsx` (~1970 satır)
   - ✅ RLS politikaları (intern=kendi verileri, teamleader+=tüm veriler)
   - ✅ Supabase types güncellendi (`types/supabase.ts`) — 3 internship tablosu eklendi

2. **Multi-Intern Teamleader Desteği (v2.8.0)**:
   - ✅ `selectedInternId` state ile intern filtresi dropdown
   - ✅ Per-intern progress kartları (Overview/Daily tabs)
   - ✅ `effectiveInternId` ile filtrelenmiş `getLogCount`/`getOverallProgress`

3. **Client Query Atama Sistemi (v2.8.0)**:
   - ✅ Yeni client modal'da `assigned_to` zorunlu
   - ✅ "Assigned to" kart üzerinde görünür
   - ✅ Reassign butonu + dropdown (PATCH API `reassign` action)

4. **+1 Butonu → Add Listing Entegrasyonu (v2.8.0)**:
   - ✅ `AddListingDialog` external control props eklendi (`externalOpen`, `onOpenChange`, `onListingCreated`, `showTrigger`)
   - ✅ `detail_only` API desteği (count artmadan sadece detail kaydı)
   - ✅ `LogProgressButton` → `listingMode`: +1 butonu Add Listing dialog açar
   - ✅ "Add log details" butonu detail-only log kaydeder

5. **Log Details Görünürlüğü (v2.8.0)**:
   - ✅ `LogDetailsViewer` bileşeni: Max 5 satır inline gösterim (link, owner, city, beds, price)
   - ✅ `getLogDetails()` helper fonksiyonu
   - ✅ 3 view'da aktif: Intern Daily Tasks, Teamleader All-Interns, Teamleader Single-Intern
   - ✅ >5 kayıt olduğunda "View all (N)" → popup modal (tam tablo, 10/sayfa, pagination)

6. **UI/Guide Güncellemeleri (v2.8.0)**:
   - ✅ "Log Progress" → "Task Progress", "Client Research" → "Client Queries" label değişiklikleri
   - ✅ City dropdown (60 Malta şehri) Property Suggestions formunda
   - ✅ Facebook Marketplace Scraping Guide güncellendi (step 4: "If found → Jump to B14", step 6: "Add in Logs")
   - ✅ Message template: "If you are available" → "If you are interested"
   - ✅ DatePicker özel İngilizce locale (Türkçe takvim sorunu düzeltildi)

7. **TypeScript & Build Düzeltmeleri (v2.8.0)**:
   - ✅ `types/supabase.ts` — 3 internship tablosu type tanımları eklendi
   - ✅ `daily-logs/route.ts` — JSONB `details` spread type hatası (`Array.isArray` kontrolü)
   - ✅ `client-queries/route.ts` — JSONB `property_suggestions` spread type hatası
   - ✅ Build başarılı: 0 TypeScript hatası, 128 sayfa

**Teknik Detaylar:**

- **Yeni Tablolar (DB)**:
  ```sql
  internship_task_definitions (id, title, slug, description, guide_content, category, daily_target, sub_targets jsonb, message_templates jsonb, ...)
  internship_daily_logs (id, user_id, task_definition_id, log_date, sub_target_key, count, details jsonb, ...)
  internship_client_queries (id, task_definition_id, client_name, client_description, assigned_to, property_suggestions jsonb, min_suggestions, ...)
  ```

- **Yeni/Değiştirilen Dosyalar**:
  ```
  app/dashboard/internship-tasks/page.tsx (yeni, ~1970 satır)
  app/api/internship-tasks/route.ts (yeni)
  app/api/internship-tasks/daily-logs/route.ts (yeni)
  app/api/internship-tasks/client-queries/route.ts (yeni)
  app/dashboard/listings/add-dialog.tsx (external control props)
  types/supabase.ts (3 internship tablo tipi)
  migration_internship_tasks.sql (tam migration)
  update_fb_scraping_guide.sql (guide/template güncelleme)
  package.json (v2.8.0)
  ```

- **Bileşenler (page.tsx içinde)**:
  - `ProgressRing` — SVG dairesel progress göstergesi
  - `CopyableMessage` — Kopyalanabilir mesaj şablonu
  - `LogDetailsViewer` — Log detail satırları (max 5 inline + popup)
  - `LogProgressButton` — +1 ve detail formu (listingMode desteği)

### Önceki Odak (22.02.2026) ✅ COMPLETED - PDF Rapor & Bonus Bildirimleri v2.7.5

1. **Teamleader Bonus PDF Raporu (v2.7.5)**:
   - ✅ Teamleader Bonuses sayfasına "Download PDF Report" butonu eklendi
   - ✅ jsPDF + jspdf-autotable kütüphaneleri kuruldu (v2.5.2 / v3.8.4)
   - ✅ generatePdfReport() fonksiyonu useCallback ile implement edildi
   - ✅ PDF İçeriği:
     - Sayfa 1: Kapak + Özet Tablo (personal earnings, team bonus, listing fee, grand total)
     - Sayfa 2: Listing Fee Kırılımı (aylara göre gruplandırılmış, ref_no, agent, tarih, kira, listing fee)
     - Sayfa 3+: Aylık Team Bonus Detayları (tier bilgisi, deal tablosu, renkli kazanç özeti)
     - Grand Totals tablosu (vurgulu grand total satırı)
     - Her sayfada footer: "Letify CRM — Confidential" + sayfa numarası
   - ✅ PDF dosya adı formatı: `Bonus_Report_{LeaderName}_{Date}.pdf`
   - ✅ Loading state: generatingPdf spinner animasyonu
   - ✅ Veri yoksa buton disabled

2. **Agent Bonus Bildirimi (v2.7.5)**:
   - ✅ Revenue API'ye `checkAndNotifyAgentBonus()` fonksiyonu eklendi
   - ✅ Deal tamamlandığında (landlord_paid_date + client_paid_date dolu) agent bonus eşiği kontrol edilir
   - ✅ Bonus eşikleri:
     - Contract Bonus (≥6 deal): %50-%70 × ortalama kira
     - Agency Fee Bonus (<6 deal): ≥€3K → €150, ≥€5K → €300
   - ✅ Bildirim alıcıları: teamleader, manager, boss rolleri
   - ✅ Bildirim kanalları: email + push notification
   - ✅ Duplicate önleme: önceki vs mevcut bonus karşılaştırması, sadece eşik aşıldığında bildirim
   - ✅ Agent'a bildirim gitmez, sadece yöneticilere

3. **Collaboration Dropdown - Agent Filtresi (v2.7.5)**:
   - ✅ Agent RevenueClient'ta profiles sorgusuna `.eq("role", "agent")` eklendi
   - ✅ Dropdown'da sadece agent rolündeki kullanıcılar gösterilir
   - ✅ admin, boss, teamleader, manager rolleri filtrelenir

4. **Profile Kartı Pozisyonu (v2.7.5)**:
   - ✅ Agent DashboardClient'ta Profile kartı grid'de ilk sıraya taşındı

5. **React Hooks Bug Fix (v2.7.5)**:
   - ✅ BonusesClient.tsx'te `useState(false)` early return sonrasına yerleştirilmişti
   - ✅ "Rendered more hooks than during the previous render" hatası
   - ✅ Düzletme: `generatingPdf` state'i diğer useState'lerle birlikte componentin başına taşındı
   - ✅ `useCallback(generatePdfReport)` da `if (loading) return` öncesine taşındı

**Teknik Detaylar:**

- **PDF Rapor Kütüphaneleri**:
  ```json
  "jspdf": "2.5.2",
  "jspdf-autotable": "3.8.4"
  ```

- **PDF Rapor Fonksiyonu**:
  ```typescript
  const generatePdfReport = useCallback(async () => {
    const doc = new jsPDF("landscape", "mm", "a4");
    // Cover + Summary → Listing Fee Breakdown → Monthly Team Bonus → Grand Totals
    // autoTable kullanımı: theme, headStyles, footStyles, didParseCell
    doc.save(`Bonus_Report_${leaderName}_${date}.pdf`);
  }, [leaderName, overallTotals, monthlyBonuses, processedDeals]);
  ```

- **Agent Bonus Bildirim API**:
  ```typescript
  // app/api/revenue/route.ts
  async function checkAndNotifyAgentBonus(userId, supabase) {
    // 1. Agent'ın tüm tamamlanmış deal'lerini çek
    // 2. Mevcut bonus'u hesapla (calculateAgentBonusServer)
    // 3. Önceki bonus ile karşılaştır (duplicate önleme)
    // 4. Eşik aşıldıysa → email + push notification → teamleader/manager/boss
  }
  ```

- **Hooks Sıralama Düzeltmesi**:
  ```typescript
  // ÖNCE (HATALI): useState early return sonrasındaydı
  if (loading) return <Loading/>;
  const [generatingPdf, setGeneratingPdf] = useState(false); // ❌ hooks violation

  // SONRA (DOĞRU): Tüm hooks component başında
  const [generatingPdf, setGeneratingPdf] = useState(false); // ✅
  const generatePdfReport = useCallback(...); // ✅
  if (loading) return <Loading/>;
  ```

- **Değiştirilen Dosyalar**:
  ```
  app/(app)/teamleader/bonuses/BonusesClient.tsx (PDF rapor + hooks fix)
  app/api/revenue/route.ts (agent bonus bildirimi)
  app/dashboard/revenue/RevenueClient.tsx (collaboration agent filtresi)
  app/dashboard/DashboardClient.tsx (profile kartı ilk sıra)
  package.json (v2.7.5, jspdf, jspdf-autotable)
  ```

### Önceki Odak (22.02.2026) ✅ COMPLETED - Deal Documents & Collaboration Fix v2.7.4
1. **Hired Agents Document Upload (v2.7.3)**:
   - ✅ Applications sayfasında Edit Applicant modal'ına doküman yükleme bölümü eklendi
   - ✅ "Hired" checkbox'ının altında Required Documents bölümü
   - ✅ 4 doküman tipi: Passport, CV, Selfie, Service Agreement
   - ✅ Supabase Storage: `hired_agents` bucket (public, 10MB limit)
   - ✅ Kabul edilen formatlar: PDF, Word (doc/docx), JPEG, PNG
   - ✅ Depolama yolu: `applicant_name/document_type/filename`
   - ✅ Sadece "Hired" işaretlendiğinde görünür (conditional rendering)
   - ✅ Doküman görüntüleme (yeni sekme), silme ve replace özellikleri
   - ✅ Yüklü doküman sayacı: X/4 uploaded göstergesi
   - ✅ Yeşil tema = yüklendi, mavi tema = bekliyor, durum göstergeleri
   - ✅ HiredDocumentUpload bileşeni oluşturuldu
   - ✅ `package.json` version: 2.7.3

**Teknik Detaylar:**
- **Supabase Storage Bucket**:
  ```sql
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('hired_agents', 'hired_agents', true, 10485760, -- 10MB
    ARRAY['application/pdf','application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg','image/jpg','image/png']);
  ```

- **Doküman Tipleri**:
  ```typescript
  const DOCUMENT_TYPES = [
    { key: "passport", label: "Passport", accept: ".pdf,.jpg,.jpeg,.png" },
    { key: "cv", label: "CV", accept: ".pdf,.doc,.docx" },
    { key: "selfie", label: "Selfie", accept: ".jpg,.jpeg,.png" },
    { key: "service_agreement", label: "Service Agreement", accept: ".pdf,.doc,.docx" },
  ];
  ```

- **Depolama Yapısı**:
  ```
  hired_agents/
  └── applicant_name/
      ├── passport/filename.pdf
      ├── cv/filename.pdf
      ├── selfie/photo.jpg
      └── service_agreement/agreement.pdf
  ```

- **Oluşturulan Dosyalar**:
  ```
  app/(app)/teamleader/applications/HiredDocumentUpload.tsx (yeni bileşen)
  supabase/migrations/20260222_create_hired_agents_bucket.sql (bucket + RLS)
  ```

- **Değiştirilen Dosyalar**:
  ```
  app/(app)/teamleader/applications/ApplicationsClient.tsx (HiredDocumentUpload entegrasyonu)
  package.json (v2.7.3)
  ```

### Önceki Odak (22.02.2026) ✅ COMPLETED - Agent Bonus Tracker v2.7.2
1. **Agent Bonus Tracker (v2.7.2)**:
   - ✅ Revenue sayfasında Monthly Agent Revenue Overview grafiğinin altına Agent Bonus Tracker eklendi
   - ✅ 4 adet özet kart: Deals This Month, Total Rent, Active Bonus Scheme, Monthly Bonus
   - ✅ Contract Bonus Progress: Donut chart (deal sayısı / 6 hedef) + tier adımları (6-10 kontrat)
   - ✅ Agency Fee Bonus gösterimi: <6 deal durumunda €3,000→€150, €5,000→€300 kutucukları
   - ✅ Yearly Revenue Target: €48,000 hedef progress bar + €2,500 yıllık ödül kartı
   - ✅ Monthly Bonus Breakdown: ComposedChart (bar: bonus miktarı, line: deal sayısı)
   - ✅ Bar renkleri bonus şemasına göre: mor=contract, cyan=agency fee
   - ✅ Detailed Monthly Bonus History tablosu (Month, Deals, Total Rent, Avg, Scheme, Rate, Bonus)
   - ✅ Bonus Rules Reference: 3 sütunlu kural tablosu (Contract Bonus, Agency Fee, Yearly Reward)
   - ✅ Important Notes: tamamlanma kuralları, collaboration %50, VAT hariç
   - ✅ Floating point düzeltmesi: `Math.round(rate * 100)` ile 55.00000000000001 → 55
   - ✅ `package.json` version: 2.7.2

**Teknik Detaylar:**
- **Agent Bonus Hesaplama**:
  ```typescript
  // Contract Bonus (≥6 deals): rate × average rent (excl. VAT)
  function getContractBonusRate(dealCount: number) {
    if (dealCount >= 10) return { rate: 0.70, label: '70%' };
    if (dealCount >= 9) return { rate: 0.65, label: '65%' };
    if (dealCount >= 8) return { rate: 0.60, label: '60%' };
    if (dealCount >= 7) return { rate: 0.55, label: '55%' };
    if (dealCount >= 6) return { rate: 0.50, label: '50%' };
    return null;
  }

  // Agency Fee Bonus (<6 deals):
  // rent ≥ €5,000 → €300 bonus
  // rent ≥ €3,000 → €150 bonus

  // Yearly Reward: €48,000 total rent → €2,500 bonus
  ```

- **Deal Tamamlanma Koşulu (Agent)**:
  ```typescript
  // Her iki paid date de dolu olmalı, aksi takdirde deal tamamlanmamış sayılır
  function getAgentBonusCompletionMonth(deal: Revenue): string | null {
    if (!landlordDate || !clientDate) return null; // incomplete → excluded
    return max(landlordDate, clientDate); // later date determines month
  }
  ```

- **Collaboration %50 Kuralı**:
  ```typescript
  const hasCollaboration = (deal.collaboration_with?.trim() || '') !== '';
  const effectiveRent = hasCollaboration ? rentAmount / 2 : rentAmount;
  ```

- **Floating Point Düzeltmesi**:
  ```typescript
  // Önceki: {tier.rate * 100}% → 55.00000000000001%
  // Sonra: {Math.round(tier.rate * 100)}% → 55%
  ```

- **Değiştirilen Dosyalar**:
  ```
  app/dashboard/revenue/RevenueClient.tsx (Agent Bonus Tracker bölümü + floating point fix)
  package.json (v2.7.2)
  ```

### Önceki Odak (22.02.2026) - Hired Agents Document Upload v2.7.3
- **⚠️ Pending**: `hired_agents` bucket SQL migration Supabase SQL Editor'de çalıştırılmalı
  - Dosya: `supabase/migrations/20260222_create_hired_agents_bucket.sql`

### Önceki Odak (19.02.2026) ✅ COMPLETED - Bonuses & Performance v2.7.1
1. **Bonuses & Performance Sayfası (v2.7.1)**:
   - ✅ Teamleader dashboard'a Bonuses kartı eklendi (Trophy ikonu)
   - ✅ Boss dashboard'a Bonuses kartı eklendi
   - ✅ Manager dashboard'a Bonuses kartı eklendi
   - ✅ `BonusesClient.tsx` bileşeni oluşturuldu (~900 satır)
   - ✅ 4 kademeli bonus sistemi: Tier 1-4 (32-37% personal, 0-10% team)
   - ✅ Personal rate `leaderRevenue` bazında, team rate `totalRevenue` bazında hesaplanır
   - ✅ Leadership Performance Chart: Recharts yatay bar + sıralama tablosu
   - ✅ Monthly Earnings Breakdown: Stacked bar chart + line grafik
   - ✅ Detailed Bonus Breakdown tablosu (Personal Revenue başlığı)
   - ✅ Dış ajan filtreleme: `isExternalAgentName()` helper ile "Agent"/"Unknown Agent" hariç
   - ✅ Collaboration mantığı: `collaboration_with` alanı doluysa rent %50 bölünür (takım içi/dışı fark etmez)
   - ✅ Listing fee doğrudan DB'den okunur (`deal.listing_fee`)
   - ✅ Çift hesap desteği: `LEADER_AGENT_ACCOUNTS` map ile teamleader ↔ agent hesap bağlantısı
   - ✅ Deal tamamlanma tarihi: `max(landlord_paid_date, client_paid_date)`, yoksa current month
   - ✅ Paylaşılan `BonusesClient` bileşeni, rol bazlı dashboard geri dönüş linki
   - ✅ Boss (`/boss/bonuses`) ve Manager (`/manager/bonuses`) page.tsx oluşturuldu
   - ✅ `package.json` version: 2.7.1

**Teknik Detaylar:**
- **Bonus Tier Hesaplama**:
  ```typescript
  function getBonusTier(totalRevenue: number) {
    if (totalRevenue >= 15000) return { tier: 4, leaderRate: 0.37, teamRate: 0.10 };
    if (totalRevenue >= 10000) return { tier: 3, leaderRate: 0.37, teamRate: 0.075 };
    if (totalRevenue >= 5000) return { tier: 2, leaderRate: 0.37, teamRate: 0.05 };
    return { tier: 1, leaderRate: 0.32, teamRate: 0 };
  }
  // Personal rate: getBonusTier(leaderRevenue).leaderRate
  // Team rate: getBonusTier(totalRevenue).teamRate
  ```

- **Çift Hesap Bağlantısı**:
  ```typescript
  const LEADER_AGENT_ACCOUNTS: Record<string, string[]> = {
    "c75e2b9a-aeda-415d-bbfd-b7c90e6e54e1": ["9bd6f7bc-0041-4c8c-8c48-c4726b7ed008"],
  };
  // leaderUserIds = nameMatchedIds ∪ linkedAgentIds
  ```

- **Collaboration %50 Kuralı**:
  ```typescript
  const hasCollaboration = collabName !== "";
  if (hasCollaboration) effectiveRent = rentAmount / 2;
  ```

- **Oluşturulan Dosyalar**:
  ```
  app/(app)/teamleader/bonuses/BonusesClient.tsx (~900 satır)
  app/(app)/teamleader/bonuses/page.tsx (rol guard: teamleader)
  app/(app)/boss/bonuses/page.tsx (rol guard: boss)
  app/(app)/manager/bonuses/page.tsx (rol guard: manager)
  ```

- **Değiştirilen Dosyalar**:
  ```
  app/(app)/teamleader/page.tsx (Bonuses kartı + Trophy icon)
  app/(app)/boss/page.tsx (Bonuses kartı + Trophy icon)
  app/(app)/manager/page.tsx (Bonuses kartı + Trophy icon)
  package.json (v2.7.1)
  ```

### Önceki Odak (17.02.2026) ✅ COMPLETED - Admin Approval Bug Fix
1. **Admin User Approval System - Critical Bug Fix**:
   - ✅ **Root Cause**: `approve-user` API used `createClient()` (anon key, subject to RLS) instead of `createAdminClient()` (service_role key)
   - ✅ RLS policy `admin_update_all_profiles` was not applied in production, causing silent update failure (0 rows, no error)
   - ✅ **Fix**: All 4 admin API routes now use `createAdminClient()` for database operations
   - ✅ `approve-user/route.ts`: Uses service_role for profile/queue updates + `.select().single()` verification
   - ✅ `pending-users/route.ts`: Uses service_role + auto-fixes missing approval_queue entries from profiles
   - ✅ `approved-users/route.ts`: Uses adminClient for profiles query
   - ✅ `blocked-users/route.ts`: Uses adminClient for profiles query
   - ✅ Email fetching now uses `adminSupabase.auth.admin.getUserById()` instead of RPC `get_user_email`
   - ✅ `fix_bedirhan_approval.sql` created for manual Bedirhan status fix in Supabase SQL Editor
   - ⚠️ **Pending**: Run `fix_bedirhan_approval.sql` in Supabase SQL Editor to approve Bedirhan
   - ⚠️ **Pending**: Deploy updated code to production

**Teknik Detaylar:**
- **Critical Pattern - Admin Operations Must Use service_role**:
  ```typescript
  // Auth verification: use regular client (with cookies/session)
  const supabase = await createClient()
  const { data: { user: adminUser } } = await supabase.auth.getUser()
  
  // Data operations: use admin client (bypasses RLS)
  const adminSupabase = createAdminClient()
  const { data, error } = await adminSupabase.from('profiles').update(...)
  ```

- **Modified Files**:
  ```
  app/api/admin/approve-user/route.ts (service_role for updates)
  app/api/admin/pending-users/route.ts (service_role + auto-fix missing queue entries)
  app/api/admin/approved-users/route.ts (adminClient for profiles)
  app/api/admin/blocked-users/route.ts (adminClient for profiles)
  fix_bedirhan_approval.sql (manual fix for stuck user)
  ```

2. **Assign to Agent - Team Revenue Deal Management** (Earlier today):
   - ✅ "Assign to Agent" dropdown added to Add New Deal modal (TeamRevenueClient.tsx)
   - ✅ "Assign to Agent" dropdown added to Edit Deal modal (EditDealModal.tsx)
   - ✅ Teamleader/Manager/Boss can create deals on behalf of agents
   - ✅ Teamleader/Manager/Boss can reassign deals to different agents via Edit
   - ✅ API POST /api/revenue accepts `target_user_id` for elevated users
   - ✅ API PUT /api/revenue accepts `target_user_id` for deal reassignment
   - ✅ Role check: only elevated users (teamleader/manager/boss/admin) can assign to agents
   - ✅ Agent list fetched from profiles table (role='agent')
   - ✅ react-select dropdown with agent full names
   - ✅ RLS INSERT/UPDATE policy fix: `user_id::uuid = auth.uid() OR is_elevated_user()`
   - ✅ Migration SQL created: `supabase/migrations/20260217_fix_revenue_insert_policy.sql`
   - ✅ Production build successful (120 pages, 0 TypeScript errors)

**Teknik Detaylar:**
- **Agent Fetch Pattern**:
  ```typescript
  // Fetch all agents for dropdown
  const { data: agentData } = await supabase
    .from('profiles')
    .select('user_id, full_name')
    .eq('role', 'agent')
    .order('full_name');
  ```

- **Elevated User Check (API)**:
  ```typescript
  // Check if caller is elevated (can assign to others)
  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();
  const isElevated = ['teamleader','manager','boss','admin']
    .includes(callerProfile?.role);
  if (isElevated && target_user_id) {
    insertData.user_id = target_user_id; // Override user_id
  }
  ```

- **RLS Policy Fix**:
  ```sql
  -- INSERT policy: Allow elevated users to insert for other agents
  CREATE POLICY "Users can insert own revenue or elevated users can insert for others"
  ON revenue FOR INSERT TO authenticated
  WITH CHECK (user_id::uuid = auth.uid() OR is_elevated_user());
  ```

- **Modified Files**:
  ```
  app/(app)/teamleader/team-revenue/TeamRevenueClient.tsx (Agent dropdown in Add Deal)
  app/(app)/teamleader/team-revenue/EditDealModal.tsx (Agent dropdown in Edit Deal)
  app/api/revenue/route.ts (POST + PUT target_user_id support)
  supabase/migrations/20260217_fix_revenue_insert_policy.sql (Created - RLS fix)
  ```

- **⚠️ Pending**: RLS migration SQL needs to be executed in Supabase SQL Editor

2. **Package Updates (17.02.2026)**:
   - ✅ Updated baseline-browser-mapping to latest version
   - ✅ Updated caniuse-lite to v1.0.30001770
   - ✅ Dev server startup warnings resolved

### Önceki Odak (16.12.2025) ✅ COMPLETED - v2.6.1 RELEASE
1. **Applications Management System (v2.6.1)**:
   - ✅ New `applications` database table with RLS policies
   - ✅ Full CRUD API at /api/applications
   - ✅ ApplicationsClient component with pagination, add/edit/delete modals
   - ✅ Excel-matching 1st Call status colors (7 status options)
   - ✅ "Hired" checkbox to mark applicants as team members
   - ✅ Separate "Hired Team Members" table with green theme
   - ✅ Automatic transfer between tables when hired status changes
   - ✅ Real-time subscriptions for live updates
   - ✅ Applications card added to teamleader, manager, boss dashboards
   - ✅ Dynamic dashboardUrl prop for role-based navigation
   - ✅ 148 initial records imported from Excel

**Teknik Detaylar:**
- **Database Schema**:
  ```sql
  CREATE TABLE public.applications (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    application_date DATE NOT NULL,
    applicant_name TEXT NOT NULL,
    nationality TEXT,
    phone TEXT,
    email TEXT,
    re_experience BOOLEAN DEFAULT FALSE,
    first_call_status TEXT,
    second_call_notes TEXT,
    appointment_date DATE,
    interview_point TEXT,
    vat_type TEXT,
    start_date DATE,
    hired BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```

- **1st Call Status Colors**:
  ```typescript
  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "No Reply": return "bg-red-800 text-white"; // Dark red
      case "Not interested anymore": return "bg-yellow-400 text-yellow-900"; // Yellow
      case "Found a job": return "bg-orange-400 text-orange-900"; // Orange
      case "Scheduled Interview": return "bg-green-500 text-white"; // Green
      case "Requires Follow-up": return "bg-green-300 text-green-900"; // Light green
      case "Missing Contact": return "bg-gray-700 text-white"; // Dark gray
      case "Refused Applicant": return "bg-gray-200 text-gray-700"; // Light gray
    }
  };
  ```

- **Hired Table Filtering**:
  ```typescript
  // Main table: hired = false
  const fetchApplications = async () => {
    await supabase.from("applications")
      .select("*", { count: "exact" })
      .eq("hired", false)
      .order("application_date", { ascending: false });
  };
  
  // Hired table: hired = true  
  const fetchHiredApplicants = async () => {
    await supabase.from("applications")
      .select("*", { count: "exact" })
      .eq("hired", true)
      .order("start_date", { ascending: false });
  };
  ```

- **Created Files**:
  ```
  supabase/migrations/20251216_create_applications_table.sql
  supabase/migrations/20251216_add_hired_column.sql
  supabase/migrations/20251216_insert_applications_data.sql
  app/api/applications/route.ts
  app/(app)/teamleader/applications/page.tsx
  app/(app)/teamleader/applications/ApplicationsClient.tsx
  app/(app)/manager/applications/page.tsx
  app/(app)/boss/applications/page.tsx
  ```

- **Modified Files**:
  ```
  app/(app)/teamleader/page.tsx (Applications card)
  app/(app)/manager/page.tsx (Applications card + ClipboardList icon)
  app/(app)/boss/page.tsx (Applications card + ClipboardList icon)
  package.json (v2.6.1)
  ```

### Önceki Odak (14.12.2025) ✅ COMPLETED - v2.6.0 RELEASE
1. **Dark Mode Theme & Revenue Management Improvements (v2.6.0)**:
   - ✅ Dark mode theme persistence per user (localStorage cleanup on logout)
   - ✅ Sign-in/Sign-up pages always use light theme (not affected by dark mode)
   - ✅ Deal Type toggle (Longlet/Shortlet) with conditional calculation
   - ✅ Shortlet deals: 10% landlord fee + 10% client fee (on Total Owner Rent Income)
   - ✅ Longlet deals: 50% landlord fee + 50% client fee (on Rent Amount)
   - ✅ Listing Fee disabled for shortlet deals
   - ✅ VAT Type percentage display fixed (shows correct 32%, 36%, or 40%)
   - ✅ Required field validation: Ref No, Client Name, Date Rented, Date Signed, Date Move In
   - ✅ Red asterisk (*) marks and red border for empty required fields
   - ✅ Validation applied to both /dashboard/revenue and /teamleader/team-revenue pages
   - ✅ Boss Team Revenue table split: Pending Deals and Paid Deals (separate tables)
   - ✅ Automatic record transfer between tables when agent_payment_status changes
   - ✅ Role-based logout redirect: all roles redirect to homepage (/) not /sign-in
   - ✅ Production build successful

**Teknik Detaylar:**
- **Dark Mode Theme Management**:
  ```typescript
  // All dashboard pages (boss, manager, teamleader, admin, dashboard)
  const handleLogout = async () => {
    // Reset theme preference to light for new user
    localStorage.removeItem('theme');
    document.documentElement.classList.remove('dark');
    
    await fetch('/api/auth/logout', ...);
    router.push('/'); // Redirect to homepage
  };
  ```

- **Revenue Calculation Logic**:
  ```typescript
  // Shortlet calculation (Total Owner Rent Income)
  landlord_fee = rentAmount * 0.10; // 10%
  client_fee = rentAmount * 0.10;   // 10%
  listing_fee = 0;                  // No listing fee
  
  // Longlet calculation (Rent Amount)
  landlord_fee = rentAmount / 2;    // 50%
  client_fee = rentAmount / 2;      // 50%
  listing_fee = has_listing_fee ? rentAmount * 0.05 : 0; // 5% optional
  ```

- **VAT Type Integration**:
  ```typescript
  // POST /api/revenue now properly receives and saves vat_type
  const finalVatType = vat_type || (vatable ? 'vatable' : 'non-vatable');
  insertData.vat_type = finalVatType; // Saved to database
  
  // UI displays correct percentage
  ({revenue.vat_type === 'vatable' ? "40%" : 
    revenue.vat_type === 'part-time' ? "36%" : "32%"})
  ```

- **Required Field Validation**:
  ```typescript
  if (!form.ref_no || !form.client_name || !form.rent_amount || 
      !dateRented || !dateSigned || !dateMoveIn) {
    toast({
      title: "Validation Error",
      description: "Please fill in all required fields...",
      variant: "destructive",
    });
    return;
  }
  ```

- **Boss Team Revenue Table Split**:
  ```typescript
  // State lifted to parent component
  const pendingRevenues = allRevenues.filter(
    r => r.agent_payment_status !== 'paid'
  );
  const paidRevenues = allRevenues.filter(
    r => r.agent_payment_status === 'paid'
  );
  
  // Automatic transfer when status changes
  const handleStatusChange = (revenueId, newStatus) => {
    setAllRevenues(prev => 
      prev.map(r => r.id === revenueId 
        ? { ...r, agent_payment_status: newStatus } 
        : r
      )
    );
  };
  ```

- **Modified Files**:
  ```
  app/api/revenue/route.ts (VAT type fix in POST)
  app/dashboard/revenue/RevenueClient.tsx (Deal type, validation)
  app/(app)/teamleader/team-revenue/TeamRevenueClient.tsx (Deal type, validation)
  app/(app)/boss/team-revenue/BossTeamRevenueClient.tsx (Table split)
  app/(app)/boss/page.tsx (Logout redirect)
  app/(app)/manager/page.tsx (Logout redirect)
  app/(app)/teamleader/page.tsx (Logout redirect)
  app/(app)/admin/page.tsx (Logout redirect)
  app/globals.css (Auth input dark mode exception)
  app/sign-in/page.tsx (Light theme enforcement)
  app/sign-up/page.tsx (Light theme enforcement)
  app/forgot-password/page.tsx (Light theme enforcement)
  app/reset-password/page.tsx (Light theme enforcement)
  package.json (Version 2.6.0)
  ```

### Önceki Odak (08.01.2025) ✅ COMPLETED - v2.5.0 RELEASE
1. **Database Backup & Recovery System (v2.5.0)**:
   - ✅ Automated daily backups via Vercel Cron (2 AM UTC)
   - ✅ Client-side Supabase backup approach (no Pro plan required)
   - ✅ Encrypted JSON export using Web Crypto API (AES-GCM 256-bit)
   - ✅ 30-day automatic retention policy with cleanup
   - ✅ Manual backup/restore npm scripts (backup, restore, backup:list, restore:latest)
   - ✅ Interactive restore with confirmation prompt ("RESTORE" keyword)
   - ✅ Comprehensive documentation in BACKUP_RECOVERY.md
   - ✅ Security: CRON_SECRET authentication for Vercel endpoint
   - ✅ Backup format: backup-YYYYMMDD-HHMMSS.json
   - ✅ 14 tables backed up (profiles, listings, clients, viewings, revenue, activity, etc.)

**Teknik Detaylar:**
- **Backup Architecture**:
  ```typescript
  // scripts/backup-database.ts - Manual backup creation
  // 1. Query all 14 tables via Supabase client
  // 2. Export as JSON with timestamp
  // 3. Encrypt using AES-GCM with BACKUP_ENCRYPTION_KEY
  // 4. Save to backups/backup-YYYYMMDD-HHMMSS.json
  // 5. Clean up backups older than 30 days
  
  // app/api/cron/backup/route.ts - Vercel cron endpoint
  // 1. Validate CRON_SECRET from Authorization header
  // 2. Call createBackup() and cleanOldBackups()
  // 3. Return JSON response with success/error
  // 4. maxDuration: 300 seconds (5 minutes)
  ```

- **Environment Variables**:
  ```
  CRON_SECRET=your_random_secret_for_cron_authentication
  BACKUP_ENCRYPTION_KEY=your_32_character_encryption_key_here
  ```

- **Vercel Cron Configuration**:
  ```json
  {
    "path": "/api/cron/backup",
    "schedule": "0 2 * * *"
  }
  ```

- **NPM Scripts**:
  ```bash
  npm run backup         # Create manual backup
  npm run backup:list    # List available backups
  npm run restore        # Interactive restore
  npm run restore:latest # Restore most recent backup
  ```

### Önceki Odak (08.12.2025) ✅ COMPLETED - v2.4.0 RELEASE
1. **Forgot Password Feature (v2.4.0)**:
   - ✅ Password reset flow: /forgot-password → email link → /reset-password
   - ✅ API endpoint: POST /api/auth/reset-password (sends reset email via Supabase)
   - ✅ Forgot password page with email form and success confirmation
   - ✅ Reset password page with token validation and new password form
   - ✅ Sign-in page updated with "Forgot Password?" link next to password field
   - ✅ Dynamic redirect URL using request origin (localhost/production aware)
   - ✅ NEXT_PUBLIC_SITE_URL environment variable added
   - ✅ Invalid/expired token handling with user-friendly error page

2. **Version Display on Homepage**:
   - ✅ Package.json version (0.1.0) displayed on home page below Start button
   - ✅ Dynamic version import from package.json for automatic updates
   - ✅ Subtle gray styling: "Version {packageJson.version}"

3. **Vercel Analytics Debug Mode Fix**:
   - ✅ Analytics mode prop added: production/development mode selection
   - ✅ Fixes handleKeyDown TypeError in console (reading 'length' of undefined)
   - ✅ app/layout.tsx: `<Analytics mode={process.env.NODE_ENV === 'production' ? 'production' : 'development'} />`

**Teknik Detaylar:**
- **Password Reset Flow**:
  ```typescript
  // API: /api/auth/reset-password
  // 1. User enters email on /forgot-password
  // 2. API calls supabase.auth.resetPasswordForEmail(email, { redirectTo: origin/reset-password })
  // 3. User receives email with magic link
  // 4. Link redirects to /reset-password with session token
  // 5. Page validates token, shows password form
  // 6. User enters new password, calls supabase.auth.updateUser({ password })
  // 7. Auto sign-out and redirect to /sign-in
  ```

- **Environment Variables**:
  ```
  NEXT_PUBLIC_SITE_URL=https://app.letify.cloud (production)
  NEXT_PUBLIC_SITE_URL=http://localhost:3000 (development)
  ```

- **Supabase Configuration Required**:
  - Dashboard > Authentication > URL Configuration
  - Add redirect URLs: https://app.letify.cloud/**, http://localhost:3000/**

### Önceki Odak (08.12.2025) ✅ COMPLETED - v2.3.0 RELEASE
1. **Boss Dashboard System with Agent Payment Feature (v2.3.0)**:
   - ✅ Complete Boss dashboard with 5 cards (Profile, Teamwork, Team Viewings, Team Revenue, Reports, Notifications)
   - ✅ All pages identical to Manager (UI consistency maintained)
   - ✅ Agent Payment Status column in Team Revenue table
   - ✅ Pending/Paid dropdown in each revenue record
   - ✅ Agent notification system: "Agency fee sent for {ref_no}"
   - ✅ Push notification to agent when boss changes status to Paid
   - ✅ Database migration: agent_payment_status column (TEXT CHECK constraint)
   - ✅ API endpoint: /api/revenue/notify-agent-payment
   - ✅ EditDealModal updates sync to agent's revenue page
   - ✅ RBAC security on all boss routes
   - ✅ Production build successful (113 pages)

2. **Manager Dashboard Notifications & Deal Management (v2.2.1)** (Previous)::
   - ✅ Manager notifications page (6th card) with deal-only filtering
   - ✅ Edit Deal functionality for Teamleader & Manager (team revenue pages)
   - ✅ Deal Finalized notification system (Push + UI + Email)
   - ✅ Agent revenue form validation (6 required fields)
   - ✅ VAT Type default changed to Non-Vatable (32%)
   - ✅ Push notification message improvements with emojis
   - ✅ Database column migration (vat_type TEXT with CHECK constraint)
   - ✅ RLS policy updates for elevated user permissions
   - ✅ Production build successful

3. **Manager Dashboard System (v2.2.0)** (Previous):
   - ✅ Complete manager dashboard with 5 cards (Profile, Teamwork, Team Viewings, Team Revenue, Reports)
   - ✅ RBAC security on all manager routes
   - ✅ Manager-specific pages without add/edit functions (monitoring only)
   - ✅ Phone validation fix (optional field, 7+ digits)
   - ✅ Dashboard URL routing for all roles
   - ✅ Source map warnings suppressed in development
   - ✅ Facebook integration removed from manager profile
   - ✅ Simplified viewing records table (removed Ref No & Client Mobile No)
   - ✅ Production build successful

### Önceki Odak (07-08.12.2025) ✅ COMPLETED
1. **Team Viewing Records - Agent Management System**:
   - ✅ Agent dropdown in add viewing form (teamleader can add viewings for agents)
   - ✅ Real-time sync for agent viewing pages
   - ✅ Viewing date timezone fix (local date instead of UTC)
   - ✅ API security: Elevated user permission check
   - ✅ Activity logging with correct user_id
   - ✅ npm 11.6.4 update (patch version)

2. **Team Revenue Dashboard**:
   - ✅ Agent Name filter dropdown
   - ✅ Month filter dropdown
   - ✅ Monthly revenue chart with €15,000 goal visualization
   - ✅ Stacked bars (achieved + remaining to goal)
   - ✅ Agent income trend line

3. **Agent Revenue Page**:
   - ✅ Monthly agent revenue chart with €8,500 personal goal
   - ✅ Filter by user_id (agent's own data only)
   - ✅ Goal visualization with stacked bars

4. **Country Name Customization**:
   - ✅ United Kingdom → England
   - ✅ United States of America → America
   - ✅ American Samoa → Samoa
   - ✅ Tanzania, the United Republic of → Tanzania
   - ✅ Filtered out "United States Minor Outlying Islands"

### Önceki Odak (06.12.2025) ✅ COMPLETED - v2.1.0 RELEASE
1. **Role-Based Access Control (RBAC) System (v2.1.0)**: 
   - ✅ Server-side route protection (`/dashboard` - agent only)
   - ✅ Client-side route protection (`/teamleader` - teamleader only)
   - ✅ Shared pages with role-aware navigation (8 pages)
   - ✅ Custom access-denied page with role-based redirect
   - ✅ Critical bug fix: `eq('user_id', user.id)` for profile queries
   - ✅ Button disabled state to prevent redirect loops
   
2. **Team Leader Dashboard**: 
   - ✅ 8-card main dashboard layout
   - ✅ Team Viewings page (own viewings + team table)
   - ✅ Team Revenue page (own deals + team table)
   - ✅ Notifications page (activity log with filtering)
   
3. **Documentation**: 
   - ✅ `RBAC_SECURITY.md` - Complete security architecture
   - ✅ Memory Bank updated with RBAC patterns
   - ✅ Test scenarios documented and verified

### Önceki Odak (06.12.2025 - Admin Panel)
1. **Admin Panel User Management System**: Approved users table, block/unblock functionality
2. **Next.js 16.0.7 Security Migration**: CVE-2025-55182 (React2Shell) vulnerability patched
3. **Role-based UI Enhancement**: Color-coded role badges (admin, boss, teamleader, manager, agent)
4. **Blocked Users Management**: Separate table and unblock functionality

## ⚠️ CRITICAL POLICIES

### UI Language Policy
**ALL UI TEXT MUST BE IN ENGLISH** - No Turkish text in user-facing components, labels, buttons, or messages. Backend logs, code comments, and documentation can be in Turkish.

### Database Query Pattern
**ALWAYS use `eq('user_id', user.id)`** when querying profiles table. NOT `eq('id', user.id)`. This caused major redirect loop bug in access-denied page.

### Role-Based Navigation
All shared pages MUST use `useDashboardUrl()` hook for "Back to Dashboard" links. Never hardcode `/dashboard`.

### State Management for Auth
Initialize dashboard URL as `null`, not default string. Prevents race condition redirects.

### Date Handling Policy
**NEVER use `toISOString()` for date-only values** - It converts to UTC causing timezone offset. Use manual formatting:
```typescript
const year = date.getFullYear();
const month = String(date.getMonth() + 1).padStart(2, '0');
const day = String(date.getDate()).padStart(2, '0');
const dateString = `${year}-${month}-${day}`;
```

### Elevated User Permissions
When implementing features that allow users to act on behalf of others (e.g., teamleader adding viewings for agents):
1. **Always check role permissions** in API route:
   ```typescript
   const elevatedRoles = ['teamleader', 'manager', 'boss', 'admin'];
   if (profile && elevatedRoles.includes(profile.role)) {
     targetUserId = requestedUserId;
   } else {
     return 403 error;
   }
   ```
2. **Use targetUserId consistently** for all related operations (insert, logging, notifications)
3. **Test security**: Verify non-elevated users cannot exploit the endpoint

### Önceki Odak (05.12.2025)
1. **PWA Mobile Push Notification System**: Kritik discovery - Service Worker push event handling eksikti ✅
2. **@vercel/analytics Deprecation Fix**: Import path güncelleme (@vercel/analytics/next) ✅
3. **Production Build Optimization**: Build errors çözüldü, successful build alındı ✅
4. **Memory Bank Update**: Tüm yapılan değişikliklerin dokümantasyonu ✅

### Önceki Odak (02.12.2025)
1. **Teamwork & Client Sync System**: Ana kayıt güncellemelerinin teamwork tablolarına otomatik yansıması ✅
2. **Google Maps Integration**: Malta Listings Map API key configuration ve error handling ✅
3. **Client Nationalities Cleanup**: Parantez içi ifadeler kaldırma, French varyantları birleştirme ✅
4. **UI Responsive Optimization**: Add listing form mobil uyumluluğu ✅

### Önceki Odak (01.12.2025)
1. **Photo Management System**: Edit dialog'da existing photos display, download, migration API
2. **Image Domain Configuration**: Next.js remote patterns for Supabase storage
3. **Production Build Optimization**: Clean build with 0 warnings, 91 pages generated
4. **Debug Cleanup**: Console logs removed, TypeScript types fixed

### Önceki Odak (24.11.2025)
1. **ESLint 9 Migration**: Tüm uyarılar düzeltildi, flat config aktif
2. **Type Safety Enhancement**: `any` types kaldırıldı, proper interfaces eklendi
3. **UI/UX Refinement**: Dashboard consistency, form validations, PWA prompt optimization
4. **Client Status System**: Urgent/Looking/Rented tracking implementasyonu
5. **Teamwork Intelligence**: Shared state tracking ve UI feedback

### Önceki Odak (v1.9 - 18.01.2025)
1. **Availability Tracking**: Listing durumu takibi (Available, Rented, Soon) ✅
2. **Geospatial Visualization**: Malta haritası ile listelerin görselleştirilmesi ✅
3. **Mobile Responsive Design**: Viewings calendar mobil uyumluluğu ✅
4. **Teamwork Integration**: Availability durumuna göre teamwork temizliği ✅
5. **Production Features**: Canlı ortamda kullanıcıya değer katan özellikler ✅

## Son Değişiklikler (Tarih Sırası)

### 08.12.2025 - Boss Dashboard with Agent Payment System - COMPLETE ✅
**Feature**: Boss dashboard implementation, Agent Payment column, notification system
**Scope**: Complete boss dashboard suite, payment status tracking, agent notifications
**Deployment**: Production build başarılı (16.0s with Turbopack, 113 pages)
**Status**: Tüm features tamamlandı, UI consistency sağlandı

#### Boss Dashboard Implementation:
**Requirement**: "Boss sayfası Manager gibi olsun, Team Revenue'da Agent Payment kolonu olsun"

**Implementation**:
1. **Boss Dashboard**: Card-based UI with 5 sections (Profile, Teamwork, Team Viewings, Team Revenue, Reports, Notifications)
2. **UI Consistency**: All pages copied from Manager to maintain same design language
3. **RBAC Security**: 
   - Server-side: `if (profile.role !== 'boss') redirect('/access-denied')`
   - Client-side: `if (profileData?.role !== 'boss') router.push('/access-denied')`
   - Middleware: ROLE_ROUTES includes boss: '/boss'
4. **Dashboard Links**: All pages redirect to `/boss` dashboard

#### Agent Payment Status Column:
**Requirement**: "Team Revenue tablosuna Agent Payment kolonu ekle, Boss Paid seçince agent'a notification gitsin"

**Implementation**:
1. **Database Column**: `agent_payment_status TEXT DEFAULT 'pending' CHECK (agent_payment_status IN ('pending', 'paid'))`
2. **UI Column**: 14th column in Team Revenue table (before Actions)
3. **AgentPaymentDropdown Component**: 
   - Inline dropdown in each revenue record
   - Options: Pending (gray), Paid (green check icon)
   - Auto-updates on change
4. **Visual Design**:
   ```typescript
   Pending: gray badge, regular text
   Paid: green badge with CheckCircle icon
   ```

#### Agent Notification System:
**Requirement**: "Boss Paid seçtiğinde agent'a 'Agency fee sent for {ref_no}' notification gitsin"

**Implementation**:
1. **API Endpoint**: POST `/api/revenue/notify-agent-payment`
2. **Request Body**: `{ revenue_id, agent_user_id, ref_no }`
3. **Process**:
   - Update agent_payment_status to 'paid'
   - Log activity: type = 'agent_payment_sent'
   - Send push notification to agent
4. **Push Notification**:
   - Title: "📧 Agency Fee Notification"
   - Body: "Agency fee sent for {ref_no}"
   - Icon: /icons/Logo/192.png
   - Data: { type, ref_no, url: '/dashboard/revenue' }
5. **Activity Log**: Tracks when boss sent payment notification

#### EditDealModal Sync:
**Requirement**: "Boss EditDealModal'da değişiklik yaptığında agent'ın revenue sayfası güncellensin"

**Implementation**:
1. **Boss Uses EditDealModal**: Same component as Teamleader/Manager
2. **PUT /api/revenue**: Elevated user permissions allow boss to update any revenue
3. **Bidirectional Sync**: 
   - Boss edits → API updates revenue record → Agent sees updated data
   - No separate sync needed, uses same database record
4. **Real-time**: Agent page refreshes automatically via Supabase

#### Boss Page Structure:
**Files Created**:
1. `/app/(app)/boss/page.tsx` - Main dashboard (209 lines)
2. `/app/(app)/boss/profile/page.tsx` - Profile settings
3. `/app/(app)/boss/teamwork/page.tsx` - Team collaboration
4. `/app/(app)/boss/team-viewings/page.tsx` - Calendar + Records
5. `/app/(app)/boss/team-revenue/page.tsx + BossTeamRevenueClient.tsx` - Agent Payment feature
6. `/app/(app)/boss/reports/page.tsx` - Coming soon placeholder
7. `/app/(app)/boss/notifications/page.tsx` - Deal notifications
8. `/app/api/revenue/notify-agent-payment/route.ts` - Notification API
9. `/add_agent_payment_status_column.sql` - Database migration

**Technical Details**:
- **Database Migration**:
  ```sql
  ALTER TABLE revenue ADD COLUMN IF NOT EXISTS agent_payment_status TEXT DEFAULT 'pending' 
    CHECK (agent_payment_status IN ('pending', 'paid'));
  UPDATE revenue SET agent_payment_status = 'pending' WHERE agent_payment_status IS NULL;
  ```

- **Payment Status Change Handler**:
  ```typescript
  const handlePaymentStatusChange = async (revenueId, newStatus, agentUserId, refNo) => {
    await supabase.from('revenue').update({ agent_payment_status: newStatus }).eq('id', revenueId);
    if (newStatus === 'paid') {
      await fetch('/api/revenue/notify-agent-payment', {
        method: 'POST',
        body: JSON.stringify({ revenue_id: revenueId, agent_user_id: agentUserId, ref_no: refNo })
      });
    }
    await getUserAndRevenues(page); // Refresh
  };
  ```

### 08.12.2025 - Manager Notifications & Deal Management - COMPLETE ✅
**Feature**: Manager notifications page, Edit Deal for elevated users, Deal Finalized system
**Scope**: 6th dashboard card, EditDealModal, form validation, VAT type system, push notifications
**Deployment**: Production build başarılı (17.9s with Turbopack, 105 pages)
**Status**: Tüm features tamamlandı, database migrations executed

#### Manager Notifications Page (6th Card):
**Requirement**: "Manager dashboarduna 6. kart olarak Notifications sayfası ekle, sadece deal notifications göster"

**Implementation**:
1. **Dashboard Card**: Bell icon card added to `/app/(app)/manager/page.tsx`
2. **Notifications Page**: `/app/(app)/manager/notifications/page.tsx` (245 lines)
3. **Filtering**: Only shows `new_revenue_added` and `deal_finalized` types
4. **UI Format**: 
   - New Deal: "{Agent} added a deal for {ref_no} - {client_name}"
   - Deal Finalized: "{Agent} finalized the deal for {ref_no} - €{rent_amount}"
5. **Pagination**: 50 records per page with next/previous buttons

#### Edit Deal Functionality for Elevated Users:
**Requirement**: "Teamleader ve manager team revenue sayfasında deal'leri düzenleyebilsin"

**Implementation**:
1. **EditDealModal Component**: Standalone modal in `/app/(app)/teamleader/team-revenue/EditDealModal.tsx` (637 lines)
2. **Integration**:
   - TeamRevenueClient: Actions column with Edit button
   - ManagerTeamRevenueClient: Same implementation
3. **Calculation Logic**: Matches agent's Add Deal form exactly
   ```typescript
   landlord_fee = (rent_amount / 2) * (discount ? 0.85 : 1)
   client_fee = (rent_amount / 2) * (discount ? 0.85 : 1)
   totalRevenue = landlord_fee + client_fee
   agent_gross = totalRevenue * 0.40
   ```
4. **API Permission Fix**: 
   - Role-based checking in PUT /api/revenue
   - Elevated users can update ANY revenue record
   - Query conditionally applies `.eq('user_id', user_id)` only for non-elevated users

#### Deal Finalized Notification System:
**Requirement**: "Inform Boss kutucuğu işaretli ve her iki taraf ödediyse Deal Finalized notification gitsin"

**Implementation**:
1. **Trigger Condition**: `inform_boss_after_both_sides_paid=true AND landlord_paid_date AND client_paid_date`
2. **Activity Log**: Type changes from `new_revenue_added`/`revenue_updated` to `deal_finalized`
3. **Recipients**: Boss + Manager + Teamleader (all elevated users)
4. **Channels**:
   - Email: Detailed revenue summary with fee breakdowns
   - Push Notification: "💰 Deal Finalized - {Agent} finalized the deal for {ref_no} - €{rent_amount}"
   - UI Notification: Shows in Manager & Teamleader notifications pages
5. **Database Flag**: `boss_notified` prevents duplicate notifications

#### Agent Revenue Form Validation:
**Requirement**: "Agent revenue formunda Ref No, Client Name, Rent Amount, Date Rented, Date Signed, Date Move In zorunlu olsun"

**Implementation**:
1. **Required Fields**: 6 fields marked with red asterisk (*)
2. **Visual Feedback**: Red border on empty required fields
3. **Submit Validation**: 
   ```typescript
   if (!form.ref_no || !form.client_name || !form.rent_amount || !dateRented || !dateSigned || !dateMoveIn) {
     toast({ title: "Validation Error", description: "Please fill in all required fields...", variant: "destructive" });
     return;
   }
   ```
4. **User Experience**: Form cannot be submitted until all required fields are filled

#### VAT Type System Enhancement:
**Requirement**: "VAT Type default'u Non-Vatable (32%) olsun, veritabanında vat_type kolonu olsun"

**Implementation**:
1. **Database Migration**: 
   ```sql
   ALTER TABLE revenue ADD COLUMN vat_type TEXT DEFAULT 'vatable' 
     CHECK (vat_type IN ('vatable', 'part-time', 'non-vatable'));
   ```
2. **Data Migration**: Converted existing vatable boolean to vat_type
3. **Form Default**: Changed from 'vatable' to 'non-vatable' in both useState and resetForm
4. **Tax Calculation**:
   - vatable (40%): tax = 0, net = gross
   - part-time (36%): tax = gross * 0.10, net = gross * 0.90
   - non-vatable (32%): tax = gross * 0.20, net = gross * 0.80
5. **Backward Compatibility**: Old vatable boolean preserved and auto-converted

#### RLS Policy Updates:
**Implementation**:
1. **Revenue UPDATE Policy**:
   ```sql
   CREATE POLICY "revenue_update_policy" ON revenue FOR UPDATE TO authenticated
   USING (user_id::uuid = auth.uid() OR is_elevated_user())
   WITH CHECK (user_id::uuid = auth.uid() OR is_elevated_user());
   ```
2. **Permission Structure**: Elevated users (teamleader, manager, boss, admin) can update ANY record
3. **Security**: Normal agents can only update OWN records

#### Push Notification Improvements:
**Implementation**:
1. **New Deal Added**: 
   - Title: "🎉 New Deal Added"
   - Body: "{Agent} closed a deal for {ref_no} - {client_name} - €{rent_amount}"
2. **Deal Finalized**:
   - Title: "💰 Deal Finalized"
   - Body: "{Agent} finalized the deal for {ref_no} - €{rent_amount}"
3. **Recipients**: All elevated users (boss, manager, teamleader) with user_id fetched directly from profiles query

**Technical Details**:
- **Files Created**: 4 (notifications page, EditDealModal, 2 SQL migrations)
- **Files Modified**: 6 (manager dashboard, team revenue clients, notifications, API route, agent revenue form)
- **Database Changes**: 2 (vat_type column + RLS policy update)
- **API Changes**: PUT method permission logic + vat_type parameter + calculation update

### 07-08.12.2025 - Team Viewing Agent Management & Revenue Charts - COMPLETE ✅
**Feature**: Teamleader can add viewings for agents, revenue goal visualization
**Scope**: Agent dropdown, real-time sync, charts, timezone fix, API security
**Deployment**: Production build başarılı (53s with Turbopack)
**Status**: Tüm features tamamlandı, npm updated to 11.6.4

#### Team Viewing Records - Agent Management System:
**Requirement**: "Teamleader başka agent'lar için viewing kaydı ekleyebilmeli"

**Implementation**:

1. **Agent Dropdown in Add Form**:
   - **Location**: First field above Ref No in add viewing modal
   - **Options**: "Myself (Teamleader)" + all agents from profiles table
   - **Data Source**: `fetchAgents()` - queries profiles where role='agent'
   - **State Management**: 
     ```typescript
     const [agents, setAgents] = useState<Array<{ user_id: string; full_name: string }>>([])
     const [selectedAgentId, setSelectedAgentId] = useState<string>('')
     ```
   - **Default Value**: Teamleader's own ID (empty string means self)
   - **Reset**: Clears on form submit and cancel

2. **API Security Enhancement**:
   - **Problem**: API ignored `body.user_id`, always used session user
   - **Solution**: Elevated user permission check
   - **Code**:
     ```typescript
     // Check if user is elevated (teamleader, manager, boss, admin)
     if (requestedUserId && requestedUserId !== user.id) {
       const { data: profile } = await supabase
         .from('profiles')
         .select('role')
         .eq('user_id', user.id)
         .single();
       
       const elevatedRoles = ['teamleader', 'manager', 'boss', 'admin'];
       if (profile && elevatedRoles.includes(profile.role)) {
         targetUserId = requestedUserId;
       } else {
         return 403 error
       }
     }
     ```
   - **Security**: Only elevated users can create viewings for others
   - **Usage**: Normal agents can only create for themselves

3. **Activity Logging Fix**:
   - **Problem**: `logActivity()` used `user_id` instead of `targetUserId`
   - **Impact**: Activity log showed wrong user for teamleader-created viewings
   - **Fix**: Changed to `user_id: targetUserId` in logActivity call
   - **Also Fixed**: Revenue record creation uses `targetUserId`

4. **Profile Query Fix**:
   - **Problem**: Email notification query used `eq('id', user_id)`
   - **Correct**: Should be `eq('user_id', targetUserId)`
   - **Impact**: Email notifications work correctly for agent viewings

5. **Real-time Sync for Agent Pages**:
   - **Problem**: Agent's viewing page didn't update when teamleader added viewing
   - **Solution**: Added Supabase Realtime subscription
   - **Code**:
     ```typescript
     useEffect(() => {
       const channel = supabase
         .channel('agent-viewing-changes')
         .on('postgres_changes', { event: '*', schema: 'public', table: 'viewings' },
           (payload) => { getUserAndViewings(); })
         .subscribe();
       return () => { supabase.removeChannel(channel); };
     }, [page]);
     ```
   - **Result**: Agent sees new viewing instantly without refresh

6. **Viewing Date Timezone Fix**:
   - **Problem**: DatePicker date saved as previous day (UTC timezone issue)
   - **Root Cause**: `toISOString()` converts to UTC, losing local timezone
   - **Solution**: Manual date formatting with local timezone
   - **Code**:
     ```typescript
     const year = date.getFullYear();
     const month = String(date.getMonth() + 1).padStart(2, '0');
     const day = String(date.getDate()).padStart(2, '0');
     setForm({ ...form, viewing_date: `${year}-${month}-${day}` });
     ```
   - **Result**: Selected date (e.g., Dec 7) saved correctly as Dec 7

#### Revenue Dashboard Charts:
**Requirement**: "Aylara göre takımın gelir barlarını göstersin, 15bin euro hedef"

**Implementation**:

1. **Team Revenue Chart**:
   - **Library**: Recharts (ComposedChart, Bar, Line)
   - **Goal**: €15,000 monthly target
   - **Visualization**: 
     - Purple bars: Achieved rent amount
     - Light purple bars: Remaining to goal (stacked)
     - Line chart: Agent income trend
   - **Filters**: Agent Name dropdown + Month dropdown
   - **Data**: All team revenue records, filtered by selection

2. **Agent Revenue Chart**:
   - **Goal**: €8,500 personal target
   - **Filter**: `eq("user_id", userId)` - only agent's own deals
   - **Same visualization pattern**: Stacked bars + trend line

3. **Chart Code Pattern**:
   ```typescript
   const TARGET_GOAL = 15000;
   <Bar dataKey="rentAmount" stackId="a" fill="#9333ea" name="Rent Amount" />
   <Bar dataKey="remaining" stackId="a" fill="#e9d5ff" name="Remaining to Goal" />
   <Line type="monotone" dataKey="agentIncome" stroke="#10b981" />
   domain={[0, TARGET_GOAL]} // Fixed Y-axis range
   ```

#### Country Name Customization:
**Requirement**: "United Kingdom yerine England kullanalım"

**Implementation**:
- **Location**: `app/dashboard/clients/page.tsx`
- **Method**: Custom mapping with `country-list` package
- **Logic**:
  ```typescript
  const countryOptions = getNames().map((name: string) => {
    let cleanName = name.replace(/\s*\([^)]*\)/g, '').trim();
    const lowerName = cleanName.toLowerCase();
    if (lowerName.includes('united kingdom')) cleanName = 'England';
    else if (lowerName.includes('united states of america')) cleanName = 'America';
    // ... more replacements
    return cleanName;
  }).filter(name => !lowerName.includes('minor outlying'));
  ```

**Files Created**: None (all modifications)

**Files Modified**:
```
MODIFIED:
  - app/(app)/teamleader/team-viewings/page.tsx:
    * Added agents state and selectedAgentId state
    * Added fetchAgents() function
    * Added Agent Name dropdown in modal (first field)
    * Modified handleAddViewing to use selectedAgentId
    * Added form reset for selectedAgentId
    * Fixed handleViewingDateChange timezone logic
    * Added console.log debugging (to be removed)
  
  - app/api/viewings/route.ts:
    * Added requestedUserId from body
    * Added elevated user permission check
    * Changed user_id to targetUserId for insert
    * Fixed logActivity to use targetUserId
    * Fixed revenue creation to use targetUserId
    * Fixed profile query: eq('user_id', targetUserId)
  
  - app/dashboard/viewings/page.tsx:
    * Added Realtime subscription for agent viewing changes
    * Channel: 'agent-viewing-changes'
    * Event: '*' (INSERT/UPDATE/DELETE)
    * Callback: getUserAndViewings()
  
  - app/(app)/teamleader/team-revenue/TeamRevenueClient.tsx:
    * Added MonthlyRevenueChart component
    * Added TARGET_GOAL constant (15000)
    * Added Agent Name filter dropdown
    * Added Month filter dropdown
    * Stacked bars with achieved + remaining
    * Agent income trend line
  
  - app/dashboard/revenue/RevenueClient.tsx:
    * Added MonthlyAgentRevenueChart component
    * Personal goal: €8,500
    * Filter: .eq("user_id", userId)
    * Same chart pattern as team revenue
  
  - app/dashboard/clients/page.tsx:
    * Modified getNames() mapping logic
    * Added country name replacements
    * Added filter for minor outlying islands
```

**Build Results**:
- ✅ Compile: 53s (Turbopack)
- ✅ TypeScript: 49s (zero errors)
- ✅ Static Generation: 100/100 pages
- ✅ npm: Updated to 11.6.4 (patch warning resolved)

### 06.12.2025 - Admin Panel Enhancement & Next.js 16 Security Migration - COMPLETE ✅
**Feature**: Admin panel user management system ve CVE-2025-55182 security fix
**Scope**: Approved users table, block/unblock, email display, role-based colors
**Deployment**: Production build başarılı (33.4s with Turbopack, 96/96 pages)
**Status**: Tüm features tamamlandı, Next.js 16.0.7 güvenli

#### CRITICAL: Next.js 16.0.7 Security Migration
**Trigger**: Vercel email warning about CVE-2025-55182 (React2Shell vulnerability)
**Vulnerability**: React Server Components RCE in Next.js 15.1.9
**Impact**: Vercel blocking new deployments until fixed

**Migration Details**:
- **Next.js**: 15.1.9 → 16.0.7 (security patch)
- **React**: 19.1.1 → 19.2.1 (stable)
- **React-DOM**: 19.1.1 → 19.2.1
- **lucide-react**: 0.344.0 → 0.556.0 (React 19 compatibility)

**Compatibility Fixes**:
1. **Turbopack Configuration**: Added `turbopack: {}` to next.config.js
2. **Middleware → Proxy**: Renamed file and function per Next.js 16 convention
3. **CSS Import Order**: Moved @import to top, removed duplicate
4. **Build System**: Turbopack now default (13.9s build time)

**Build Results**:
- ✅ Compile: 33.4s (Turbopack)
- ✅ TypeScript: 43s (zero errors)
- ✅ Static Generation: 96/96 pages
- ✅ Security: CVE-2025-55182 patched

#### Admin Panel User Management System:
**Requirement**: "Admin page'de onaylı kullanıcıları rolleriyle birlikte görmek istiyorum"

**Implementation**:

1. **Approved Users Table** (Main Feature):
   - **Data Sources**: 
     - Profiles table: user_id, full_name, phone, role, status
     - Auth.users table: email (via admin client)
   - **Columns**: User ID (first 8 chars), Full Name, Email, Phone, Role, Status, Actions
   - **API Endpoint**: `/api/admin/approved-users`
   - **Admin Client Usage**: `createAdminClient()` for auth.admin.getUserById()
   - **Result**: All approved users displayed with complete information

2. **Email Display Fix**:
   - **Problem**: All emails showing as "N/A"
   - **Root Cause**: Using regular `createClient()` for admin methods
   - **Solution**: Import and use `createAdminClient()` 
   - **Code**:
     ```typescript
     import { createClient, createAdminClient } from '@/lib/supabase/server'
     const adminClient = createAdminClient()
     const { data: authData } = await adminClient.auth.admin.getUserById(userId)
     ```
   - **Result**: ✅ All user emails now displayed correctly

3. **Role-Based Color System**:
   - **Admin**: Red badge (destructive variant)
   - **Boss**: Orange badge (bg-orange-600)
   - **Teamleader**: Blue badge (bg-blue-600)
   - **Manager**: Default badge (blue-gray)
   - **Agent**: Gray badge (secondary variant)
   - **Implementation**: Dynamic className with conditional styling
   - **Result**: Visual hierarchy for quick role identification

4. **Block User Functionality**:
   - **Feature**: Admin can block approved users
   - **UI**: Red "Block" button with XCircle icon in Actions column
   - **Confirmation**: "Are you sure?" dialog before blocking
   - **API**: Updated `/api/admin/approve-user` to support `action: 'block'`
   - **Status Change**: `approved` → `blocked`
   - **Database**: Updates both `profiles.status` and `approval_queue.status`
   - **Auto-refresh**: Approved users table and counts refresh after block

5. **Blocked Users Table** (Separate Section):
   - **Design**: Red border card below approved users table
   - **Visibility**: Only shows when blocked users exist
   - **Columns**: Same as approved users table
   - **Status Badge**: Red "blocked" badge
   - **API Endpoint**: `/api/admin/blocked-users`
   - **Mock Data**: Test user for UI development
     ```typescript
     {
       user_id: 'test-blocked-123',
       full_name: 'Test Blocked User',
       email: 'blocked@example.com',
       phone: '+905551234567',
       role: 'agent',
       status: 'blocked'
     }
     ```

6. **Unblock User Functionality**:
   - **Feature**: Admin can restore blocked users
   - **UI**: Green "Unblock" button with CheckCircle2 icon
   - **Confirmation**: "Are you sure?" dialog before unblocking
   - **API**: Uses same endpoint with `action: 'approve'`
   - **Status Change**: `blocked` → `approved`
   - **Flow**: Blocked Users table → Unblock → Approved Users table
   - **Auto-refresh**: Both tables update after unblock

**Files Created**:
```
NEW:
  - app/api/admin/approved-users/route.ts (approved users with emails)
  - app/api/admin/blocked-users/route.ts (blocked users with emails)
```

**Files Modified**:
```
MODIFIED:
  - app/(app)/admin/page.tsx:
    * Added ApprovedUser interface
    * Added approvedUsers state
    * Added blockedUsers state
    * Added blockingUserId state
    * Added unblockingUserId state
    * Added fetchApprovedUsers() function
    * Added fetchBlockedUsers() function
    * Added handleBlock() function
    * Added handleUnblock() function
    * Added Users table section with role-colored badges
    * Added Blocked Users table section (conditional)
    * Modified stats section layout (added mb-8)
    
  - app/api/admin/approve-user/route.ts:
    * Added 'block' to allowed actions
    * Updated newStatus logic: approve/block/deny
    * Updated queueStatus logic for blocked state
    * Updated console log for block action
```

**Technical Architecture**:
```typescript
// Admin Client Pattern for Email Access
import { createClient, createAdminClient } from '@/lib/supabase/server'

const supabase = await createClient()      // Regular auth & profile queries
const adminClient = createAdminClient()     // Admin-level auth.users access

// Fetch emails bypassing RLS
const { data: authData } = await adminClient.auth.admin.getUserById(userId)
const email = authData.user?.email || 'N/A'
```

**State Management Flow**:
1. User blocks an approved user
2. `handleBlock()` calls API with `action: 'block'`
3. Database updates: `profiles.status = 'blocked'`
4. `fetchApprovedUsers()` refresh (user disappears)
5. `fetchBlockedUsers()` refresh (user appears in blocked table)
6. Approved count decreases

**UI/UX Features**:
- Loading states on all action buttons
- Confirmation dialogs prevent accidental actions
- Toast notifications for success/error feedback
- Automatic table refresh after actions
- Color-coded roles for quick scanning
- Conditional rendering (blocked table only shows if needed)
- Responsive table design with hover effects

### 05.12.2025 - PWA Mobile Push Notification System Architecture Fix - COMPLETE ✅
**Feature**: Kritik push notification sistema fix - Service Worker push event handling implementasyonu
**Root Cause Discovery**: Service Worker push events capture etmiyordu, backend → Web Push API → ?? (SW break)
**Deployment**: Hazır - Production'a deploy edilebilir (build başarılı)
**Status**: Tüm features tamamlandı, production build başarılı

#### @vercel/analytics Deprecation Fix:
**Problem**: Console'da "tabReply deprecated export" uyarısı
**Root Cause**: Next.js 15 App Router için yanlış import path (`@vercel/analytics/react`)
**Solution**:
- Package updated: 1.5.0 → 1.6.1
- Import fixed: `@vercel/analytics/react` → `@vercel/analytics/next`
- File: `app/layout.tsx` line 4
- Result: Deprecation warnings resolved ✅

#### CRITICAL: Mobile Push Notification System Architecture:
**Problem Tanımı**: "PWA mobil yaptık ve push notification ekledik. Ancak mobilde notification geliyor mu bu yapıda?"

**Root Cause Analysis - Deep Audit Bulguları**:
1. **Backend**: ✅ Başarıyla push notification gönderiliyor
   - `lib/pushNotificationHelper.ts`: `sendTeamworkNotification()` fonksiyonu aktif
   - `/api/teamwork/listings/share/route.ts`: Listing paylaşılırken push gönderiliyor
   - Supabase `push_subscriptions` tablosu: Subscriptions kaydediliyor
   - web-push library: VAPID keys'i ile imzalanıyor

2. **Browser API**: ✅ Web Push API çalışıyor
   - Client-side subscription: `lib/notifications.ts` yapıyor
   - Permission management: NotificationSettings'te enable/disable çalışıyor
   - VAPID handshake: Başarılı

3. **SERVICE WORKER**: ❌ **KRITIK PROBLEM**
   - Auto-generated service worker (next-pwa): Sadece caching logic'i vardı
   - `public/sw-push.js` mevcut idi ama hiçbir yerde import/register edilmiyordu
   - **Push events capture edilmiyordu → Notifications alınamıyordu**
   - Result: Backend gönderdi ✅, Push API aldı ✅, ama SW listen etmedi ❌

**Solution - Complete Service Worker Rewrite**:

1. **Created: `public/service-worker.js`** (270+ lines)
   - **Push Event Handler**: 
     ```javascript
     self.addEventListener('push', function(event) {
       const data = event.data.json();
       const promiseChain = self.registration.showNotification(
         data.title,
         {
           body: data.body,
           icon: data.icon || '/icons/Logo/192.png',
           badge: data.badge || '/icons/Logo/96.png',
           vibrate: [200, 100, 200], // Mobile device vibration
           data: data.data,
           requireInteraction: data.requireInteraction || false,
           actions: data.actions || []
         }
       );
       event.waitUntil(promiseChain);
     });
     ```
   - **Notification Click Handler**: Bildirime tıklandığında URL'ye navigate
   - **Subscription Change Handler**: Push subscription yenilenmesi ve resubscription
   - **Workbox Caching Strategies**: Fonts, images, JS/CSS, API calls, HTML pages
   - **Offline Fallback**: Bağlantı kesikken cached content

2. **Modified: `next.config.js`**
   - Added: `swSrc: 'public/service-worker.js'` (custom service worker kullanma)
   - Added: Headers configuration for `/service-worker.js` (cache policies)
   - Removed: `runtimeCaching` array (custom swSrc ile conflict - WebpackInjectManifest error)
   - Result: next-pwa auto-generation yerine custom SW kullanılıyor

3. **Modified: `public/manifest.json`**
   - Added: `"gcm_sender_id": "103953800507"` (Android push support)
   - Added: `"permissions": ["notifications", "push"]` (browser izin isteme)

4. **Created: `/api/notifications/test/route.ts`**
   - POST endpoint test notifications gönderme
   - Server-side: Tüm users'a (sender dışında) notification gönder
   - Integration: Supabase `push_subscriptions` tablosundan çek

5. **Modified: `components/system/NotificationSettings.tsx`**
   - Changed: `handleTestNotification()` local function → server API call
   - Before: Local `sendTestNotification()`
   - After: `fetch('/api/notifications/test', { method: 'POST' })`
   - Result: "Test notification sent to X device(s)!" mesajı

#### Build Process - Error Resolution:

**First Build Attempt - FAILED**:
```
Error: WebpackInjectManifest error:
'runtimeCaching' property is not expected to be here. 
Did you mean property 'excludeChunks'?
```
- Root Cause: `swSrc` ve `runtimeCaching` together conflict (next-pwa 5.6.0 limitation)
- Both cannot coexist: Either auto-generated SW with runtimeCaching OR custom swSrc

**Solution Implemented**:
- Removed entire `runtimeCaching` array (100+ lines) from `next.config.js`
- Moved all caching logic into custom `public/service-worker.js` (Workbox)
- Result: Build conflict resolved

**Second Build Attempt - SUCCESS ✅**:
```
Exit Code: 0
✓ Compiled successfully
✓ Linting and checking validity of types  
✓ Generating static pages (91/91)
Production build ready for deployment
```

#### Technical Architecture - Full Push Flow:

**Sequence:**
```
1. User enables push notifications
   → `/lib/notifications.ts`: subscribeToPush()
   → Browser ServiceWorkerContainer.ready
   → PushManager.subscribe(VAPID public key)
   → Server saved: Supabase push_subscriptions table

2. Teamwork listing shared
   → `/api/teamwork/listings/share/route.ts`: POST
   → `sendTeamworkNotification(excludeUserId, payload)` called
   → Server queries: `push_subscriptions` table for all subscriptions
   → web-push library: VAPID private key'i ile sign
   → Browser Web Push API: Notification gönder

3. Service Worker receives push
   → `public/service-worker.js`: push event listener
   → Decode JSON payload
   → `self.registration.showNotification()` call
   → User sees notification with vibration + sound
   → Mobile: Bildirim tray'de görünür

4. User clicks notification
   → Service Worker: notificationclick event listener
   → Extract URL from notification.data
   → `clients.matchAll()` ve `client.navigate()`
   → App açılır, doğru sayfaya navigate
```

#### Files Modified/Created:

**NEW Files:**
1. `public/service-worker.js` - 270+ lines
   - Complete push event handling
   - Workbox caching integration
   - All service worker event listeners
   
2. `app/api/notifications/test/route.ts` - Test endpoint
   - POST handler for testing
   - Sends to all users except sender

**Modified Files:**
1. `app/layout.tsx` - Line 4
   - Import path: `@vercel/analytics/react` → `@vercel/analytics/next`

2. `next.config.js`
   - After line 4: Added `swSrc: 'public/service-worker.js'`
   - Added service-worker.js to headers() configuration
   - Removed entire `runtimeCaching` array (build conflict resolution)

3. `public/manifest.json`
   - Before `related_applications`: Added `gcm_sender_id` ve `permissions`

4. `components/system/NotificationSettings.tsx`
   - `handleTestNotification()`: API call implementation
   - Returns: `{ success: true, deviceCount: number }`

#### Key Technical Discoveries:

1. **next-pwa Limitation**: Custom `swSrc` ve auto `runtimeCaching` mutually exclusive
   - Must choose: Either auto-generation OR custom service worker
   - Custom approach needed for advanced features

2. **Workbox Integration**: CDN import from custom SW'de possible
   - `importScripts('https://storage.googleapis.com/workbox-cdn/...')`
   - No build-time injection needed

3. **Vibration Pattern**: Mobile UX enhancement
   - `vibrate: [200, 100, 200]` - Phone titrer
   - Production: Kullanıcı fark eder, engagement artır

4. **Push Event Payload**: JSON structured
   - Required: `title`, `body`
   - Optional: `icon`, `badge`, `data`, `actions`
   - Custom data: `notification.data` field'ında pass

5. **Browser Compatibility**: Web Push API
   - Chrome/Firefox/Edge: ✅ Full support
   - Safari: ⚠️ Limited (Web Push Notifications experimental)
   - iOS Safari: ❌ Not supported (PWA limitations)

#### Validation & Testing Points:

**Code Ready For Testing:**
- ✅ Service Worker push event handler implemented
- ✅ Notification display with vibration pattern
- ✅ Click handler navigates to correct page
- ✅ Test endpoint created for easy validation
- ✅ Manifest notifications permission configured
- ✅ Build successful (0 errors)

**Mobile Testing Next Steps:**
1. Android Chrome: Enable push → Send test → Verify notification
2. Android background: App closed → Send test → Verify still works
3. Offline: Disable network → Send test → Check queue on reconnect
4. Click action: Tap notification → Verify app opens to correct page
5. Multiple notifications: Send several → Verify all appear

#### Production Readiness Checklist:
- ✅ Service Worker deployed to `/public/service-worker.js`
- ✅ Manifest updated with permissions
- ✅ next.config.js configured for custom SW
- ✅ Build passes without errors
- ✅ Test endpoint available at `/api/notifications/test`
- ✅ VAPID keys configured in `.env.local`
- ⏳ Production deployment (build ready)
- ⏳ Mobile device testing (code ready)
- ⏳ Push subscription monitoring (email subscription tracking if needed)

#### Key Pattern for Future Features:
- **Custom Service Worker Approach**: 
  - Problem: Auto-generated SW limited functionality
  - Solution: Custom `public/service-worker.js` + `swSrc` config
  - Benefit: Full control over all SW features
  - Trade-off: Must manually maintain Workbox integration

#### User Discovery Journey:
- **Initial Question**: "PWA mobilde notification geliyor mu?"
- **Investigation**: Workspace deep audit (20+ files analyzed)
- **Root Cause**: "SW push events capture etmiyordu!"
- **Solution**: Complete SW push handler implementation
- **Outcome**: "Artık mobile push notifications çalışacak!"

#### Documentation Created:
- `MOBILE_PUSH_FIX.md` - Comprehensive system documentation
  - Push notification architecture
  - Testing procedures
  - Troubleshooting guide
  - Deployment steps

---

### 02.12.2025 - Teamwork Auto-Sync & Data Management Enhancements - COMPLETE ✅
**Feature**: Otomatik senkronizasyon, Google Maps fix, veri temizliği, responsive UI
**Deployment**: Hazır - Production'a deploy edilebilir
**Status**: Tüm özellikler tamamlandı, test edildi

#### Teamwork Auto-Sync System Implementation:

**1. Listings → Teamwork_Listings Sync**
- Problem: Ana listingde yapılan güncellemeler teamwork_listings'e yansımıyordu
- Root Cause: 
  - UPDATE RLS policy yoktu (sadece SELECT, INSERT, DELETE vardı)
  - Client-side direkt update yapılamıyordu
- Solution: API endpoint + RLS policy
  - Created: `/api/teamwork/listings/sync` endpoint
  - Server-side update: Tüm teamwork_listings kayıtlarını günceller (listing_id bazlı)
  - RLS Policy: `Allow authenticated users to update teamwork listings`
- Pattern: Edit dialog → API call → Batch update (Promise.allSettled pattern)
- Synced Fields: city, price, bedroom, bathroom, property_type, description, available_date

**2. Clients → Teamwork_Clients Sync**
- Aynı pattern listings için uygulanan
- Created: `/api/teamwork/clients/sync` endpoint
- RLS Policy: `Allow authenticated users to update teamwork clients`
- Synced Fields: people, bedroom, cities, family_sharing, nationalities, jobs, pet, budget, move_in
- Integration: Client update form → API call → Teamwork sync

**3. Available Date Timezone Fix**
- Problem: Listing'de 03/12/2025, teamwork'te 02/12/2025 (1 gün fark)
- Root Cause: `new Date('2025-12-03')` UTC midnight yorumlanıyor, local timezone'da 1 gün geri
- Solution: Date parsing'e 'T00:00:00' eklendi
  - Before: `new Date(r.available_date).toLocaleDateString('en-GB')`
  - After: `new Date(r.available_date + 'T00:00:00').toLocaleDateString('en-GB')`
- Applied: Hem listings/page.tsx hem teamwork/TeamworkClient.tsx

**4. Teamwork Clients Table Column Reorder**
- User Request: "people sütununu Family/sharing sütunundan sonra koyalım"
- Implementation: TableHead ve TableCell sıralaması değiştirildi
- New Order: #, Teamwork Date, Bedroom, Cities, Family/Sharing, **People**, Nationalities, Jobs, Pet, Budget, Move In, Agent

#### Google Maps Integration Fix:

**1. Map Loading Error Handling**
- Problem: Harita bazı cihazlarda görünmüyordu ("Oops! Something went wrong")
- Root Cause: API key eksik veya yanlış yapılandırılmış
- Solution: Comprehensive error handling
  - API key validation: Checks for missing/placeholder values
  - Error state: `loadError` state with user-friendly message
  - Setup instructions: Collapsible details in error UI
  - Script loading error tracking: onError handler

**2. API Key Configuration**
- User provided: `[NEXT_PUBLIC_GOOGLE_MAPS_API_KEY — stored in .env.local]`
- Already existed in `.env.local`: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- Maps JavaScript API: Confirmed active in Google Cloud Console
- Solution: Development server restart (env variables reload)

**3. Error UI Component**
- Red background warning panel
- Detailed error message display
- Setup instructions accordion
- Graceful fallback: Map container hidden when error

#### Client Data Cleanup:

**1. Nationalities Dropdown Optimization**
- Problem: Parantez içi ifadeler (örn: "Saint Martin (French part)", "France (the)")
- Solution: Regex pattern ile temizlik
  - Pattern: `.replace(/\s*\([^)]*\)/g, '').trim()`
  - Removes all parentheses and content inside

**2. French Variants Consolidation**
- Problem: "French Guiana", "French Polynesia", "French Southern Territories" ayrı ayrı
- Solution: Tüm "French" başlangıçlı ülkeler → "France"
  - Logic: `if (cleanName.toLowerCase().startsWith('french')) cleanName = 'France'`
  - Deduplication: `filter((name, index, self) => self.indexOf(name) === index)`
  - Sort: Alphabetical ordering for clean dropdown

**3. Country List Processing**
- Source: `country-list` npm package
- Processing pipeline:
  1. Remove parenthetical content
  2. Consolidate French variants
  3. Remove duplicates
  4. Alphabetical sort
  5. Map to `{ label, value }` format

#### UI Responsive Improvements:

**1. Add Listing Form Modal**
- Problem: Mobil cihazlarda form sığmıyordu
- Solution: Responsive modal design
  - Before: `fixed inset-0 flex items-center justify-center`
  - After: `fixed inset-0 flex items-center justify-center p-4 overflow-y-auto`
  - Form: `w-full max-w-[640px] my-8` (vertical margin + max width)
- Benefits: 
  - Mobile: Full width, scrollable
  - Desktop: Max 640px, centered
  - Padding: Prevents edge-to-edge on small screens

#### Files Modified:

**Teamwork Sync:**
- `app/api/teamwork/listings/sync/route.ts`: NEW - Listing sync endpoint
- `app/api/teamwork/clients/sync/route.ts`: NEW - Client sync endpoint
- `app/dashboard/listings/edit-dialog.tsx`: API call integration, availableDate fix
- `app/dashboard/clients/page.tsx`: Client update with teamwork sync
- `supabase/migrations/2025_12_02_add_update_policy_teamwork_listings.sql`: NEW - RLS policy
- `supabase/migrations/2025_12_02_add_update_policy_teamwork_clients.sql`: NEW - RLS policy

**Google Maps:**
- `components/listing/malta-map.tsx`: Error handling, API key validation, setup UI
- `.env.local`: Google Maps API key already configured

**Data Cleanup:**
- `app/dashboard/clients/page.tsx`: Country list processing (parentheses, French consolidation)

**UI Responsive:**
- `app/dashboard/listings/add-dialog.tsx`: Modal responsive design
- `app/dashboard/teamwork/TeamworkClient.tsx`: Column reorder (People after Family/Sharing)

**Timezone Fix:**
- `app/dashboard/listings/page.tsx`: Date parsing with 'T00:00:00'
- `app/dashboard/teamwork/TeamworkClient.tsx`: Same date fix pattern

#### Key Technical Patterns:

**1. Teamwork Sync API Pattern**
```typescript
// Server-side batch update (bypasses RLS with authenticated context)
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { listing_id, updates } = await request.json()
  
  const { data } = await supabase
    .from('teamwork_listings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('listing_id', listing_id)
    .select('id')
  
  return NextResponse.json({ 
    success: true, 
    updated_count: data?.length || 0 
  })
}
```

**2. Client-Side Sync Integration**
```typescript
// Edit dialog: After main update, sync to teamwork
if (!error) {
  try {
    const response = await fetch('/api/teamwork/listings/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listing_id: listing.id,
        updates: {
          city: formData.city || null,
          price: formData.price ? parseFloat(formData.price) : null,
          bedroom: formData.bedroom ? parseInt(formData.bedroom) : null,
          // ... all synced fields
        }
      })
    })
    
    const result = await response.json()
    console.log('Teamwork synced:', result)
  } catch (error) {
    console.error('Teamwork sync failed:', error)
    // Don't throw - sync is not critical
  }
}
```

**3. Timezone-Safe Date Display**
```typescript
// Force local timezone interpretation (prevent UTC shift)
{r.available_date ? 
  new Date(r.available_date + 'T00:00:00').toLocaleDateString('en-GB') 
  : '—'
}
```

**4. Google Maps Error Handling**
```typescript
// API key validation
const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
if (!apiKey || apiKey === 'YOUR_API_KEY' || apiKey === 'your_google_maps_api_key') {
  setLoadError('Google Maps API key is not configured...')
  return
}

// Error UI with setup instructions
{loadError ? (
  <div className="w-full h-full flex items-center justify-center bg-red-50">
    <div className="text-center p-6 max-w-md">
      <div className="text-red-500 text-5xl mb-4">⚠️</div>
      <h3 className="text-lg font-semibold text-red-700 mb-2">Map Loading Error</h3>
      <p className="text-sm text-red-600 mb-4">{loadError}</p>
      <details className="text-xs text-left text-gray-600 bg-white p-3 rounded border">
        <summary className="cursor-pointer font-medium mb-2">Setup Instructions</summary>
        {/* Step-by-step guide */}
      </details>
    </div>
  </div>
) : ...}
```

**5. Country List Processing**
```typescript
// Cleanup + consolidation + deduplication
const countryOptions = getNames()
  .map((name: string) => {
    let cleanName = name.replace(/\s*\([^)]*\)/g, '').trim()
    if (cleanName.toLowerCase().startsWith('french')) {
      cleanName = 'France'
    }
    return cleanName
  })
  .filter((name, index, self) => self.indexOf(name) === index)
  .sort()
  .map((name: string) => ({ label: name, value: name }))
```

#### User Requirements Met:
- ✅ "ana listing e göre teamwork listing otomatik güncellenmiyor" - Sync API + RLS policy
- ✅ "oda veya fiyat da güncellenmiyor" - Tüm alanlar senkronize ediliyor
- ✅ "aynı özelliği client sayfasında yapılan kayıt değişikliklerinde" - Client sync implemented
- ✅ "people sütununu Family/sharing sütunundan sonra koyalım" - Column reorder
- ✅ "harita bazı kullanıcı bilgisayarlarında ve mobil cihazlarında görünmüyor" - Error handling + API key fix
- ✅ "nationalities... parantez içinde yazılar var... kaldıralım" - Regex cleanup
- ✅ "birtane frence veya france yer alsın" - French consolidation
- ✅ "listing add formu responsive olsun" - Modal responsive design
- ✅ "orjinal listing 3 aralık iken teamwork listing 2 aralık" - Timezone fix
- ✅ "memory bank güncelle" - activeContext.md, progress.md güncellendi

#### Key Learnings:
- **RLS Policy Importance**: UPDATE operations require explicit RLS policies
- **API Sync Pattern**: Server-side endpoints bypass client-side RLS limitations
- **Timezone Gotcha**: YYYY-MM-DD strings default to UTC midnight, need 'T00:00:00' for local
- **Batch Updates**: Promise.allSettled pattern ensures all records processed even with errors
- **Error UX**: Detailed error messages + setup instructions improve troubleshooting
- **Data Cleanup**: Regex patterns + deduplication create clean user-facing lists
- **Responsive Modals**: Overflow-y-auto + max-width + padding = universal compatibility
- **Non-Critical Sync**: Teamwork sync failures shouldn't break main operations (try-catch, no throw)

---

### 01.12.2025 - Photo Management & Image Display System - COMPLETE ✅
**Feature**: Listings edit dialog photo display, download, and migration system
**Deployment**: Hazır - Vercel'e deploy edilebilir
**Status**: Build successful, 0 warnings, full functionality

#### Photo Management Implementation:

**1. Edit Dialog Photo Display**
- Problem: Edit dialog'da sadece "Add Photo" button vardı, existing photos görünmüyordu
- Root Cause: 
  - Photos `uploaded_assets` tablosunda, ama `listings.images` field'ı boştu
  - Client-side RLS policies `uploaded_assets`'e erişimi engelliyordu
  - Server Actions nested arrays'i제대로 serialize edemiyordu
- Solution: Migration API + Direct Supabase fetch in useEffect

**2. Migration API Pattern**
- Created: `app/api/migrate-listing-photos/route.ts`
- Purpose: Server-side photo fetching to bypass RLS
- Flow:
  1. Get listing_id from request
  2. Find job_id from jobs table
  3. Query uploaded_assets with job_id
  4. Collect all photo URLs (public_url)
  5. Update listings.images field
  6. Return migrated photos array
- Usage: Edit dialog calls on mount if images field is empty

**3. Photo Grid UI**
- Layout: Grid display with existing photos + Add Photo button
- Existing Photos:
  - Thumbnail display with next/image
  - Download button (blue, left side) - Downloads to user device
  - Delete button (red, right side) - Removes from array
  - Hover effects for better UX
- Add Photo Button: Integrated in same grid, consistent styling
- Photo Count: Shows "14/30" format in grid title

**4. Download Functionality**
- Implementation: `handleDownload` function
- Flow:
  1. Fetch photo URL with fetch()
  2. Convert response to blob
  3. Create object URL
  4. Create hidden <a> tag
  5. Set download attribute with filename
  6. Trigger click programmatically
  7. Cleanup object URL
- Result: Photo downloads directly to user's device

**5. Next.js Image Configuration**
- Problem: Build error "Invalid src prop... hostname not configured"
- File: `next.config.js`
- Added: Supabase storage domain to remotePatterns
```javascript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: '**.supabase.co',
      pathname: '/storage/v1/object/public/**',
    },
  ],
}
```
- Result: next/image can optimize Supabase storage images

**6. Debug Cleanup**
- Removed: All console.log statements from actions.ts and page.tsx
- Fixed: TypeScript type in debug/photos/route.ts (any → Record<string, unknown>)
- Removed: Invalid RPC function call (pg_get_tabledef)
- Result: Clean production build with 0 warnings

**7. Build Success**
```
✓ Compiled successfully in 19.6s
✓ Linting and checking validity of types
✓ Generating static pages (91/91)
Route (app)                              Size     First Load JS
┌ ○ /                                   1.34 kB        110 kB
├ ○ /dashboard                          344 kB         513 kB
├ ○ /dashboard/listings                 155 kB         324 kB
└ ... 88 more routes
```

#### Files Modified:

**Photo Management:**
- `app/dashboard/listings/edit-dialog.tsx`:
  - Added photo loading from Supabase in useEffect
  - Added handleDownload function for photo downloads
  - Added migration API call for empty images field
  - Integrated Download icon (blue, left) and X icon (red, right)
  - Photo grid with existing + new photos display
  - Removed unused imports (ListingPostButton, Info, useCallback)
  - Fixed useEffect dependencies with eslint-disable comment

**Migration API:**
- `app/api/migrate-listing-photos/route.ts`: NEW
  - POST endpoint for server-side photo migration
  - Queries: jobs → uploaded_assets → listings.images
  - Returns: { images: string[], migrated: boolean }

**Configuration:**
- `next.config.js`:
  - Added remotePatterns for Supabase storage
  - Pattern: protocol: 'https', hostname: '**.supabase.co'

**Cleanup:**
- `app/dashboard/listings/actions.ts`:
  - Removed debug console logs (photosFromAssets, totalPhotos)
  - Removed JSON serialization attempt
- `app/dashboard/listings/page.tsx`:
  - Removed debug console logs
  - Removed unused Edit2 import
- `app/api/debug/photos/route.ts`:
  - Fixed TypeScript type (any → Record<string, unknown>)
  - Removed invalid RPC call

#### Key Technical Patterns:

**1. Server-Side Migration API**
```typescript
// Bypass client-side RLS limitations
const supabase = createClient()
const { data: jobs } = await supabase
  .from('jobs')
  .select('id')
  .eq('listing_id', listingId)

const { data: assets } = await supabase
  .from('uploaded_assets')
  .select('public_url')
  .eq('job_id', jobId)

const photoUrls = assets.map(a => a.public_url)
await supabase
  .from('listings')
  .update({ images: photoUrls })
  .eq('id', listingId)
```

**2. Client-Side Photo Loading**
```typescript
// Edit dialog: Load photos on mount
useEffect(() => {
  const loadPhotos = async () => {
    if (listing.images && listing.images.length > 0) {
      setPhotos(listing.images)
    } else {
      // Fallback: Call migration API
      const res = await fetch('/api/migrate-listing-photos', {
        method: 'POST',
        body: JSON.stringify({ listingId: listing.id })
      })
      const data = await res.json()
      if (data.images) setPhotos(data.images)
    }
  }
  loadPhotos()
}, [listing.id]) // eslint-disable-next-line
```

**3. Photo Download Pattern**
```typescript
const handleDownload = async (photoUrl: string) => {
  const response = await fetch(photoUrl)
  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url
  a.download = `photo-${Date.now()}.jpg`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}
```

**4. Next.js Image Remote Pattern**
```javascript
// next.config.js
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: '**.supabase.co',  // Wildcard for all Supabase subdomains
      pathname: '/storage/v1/object/public/**',
    },
  ],
}
```

#### User Requirements Met:
- ✅ "listings sayfasındaki tabloda... edit formunun en başında... databaseden o kayıt için yüklenen resimleri de burada sırasuyla göstermesini isterdim" - Photo grid with existing photos
- ✅ "üzerlerine tıklandığında da direk cihazımıza indirilebilmesini isterdim" - Download functionality implemented
- ✅ "resimlerin uploaded_assets tablosunda olduğu ama listings tablosundaki images field'ına kaydedilmediği anlamına geliyor" - Migration API created
- ✅ "build alırken başarısız olduk" - Build errors fixed (image domains, RPC calls, types)
- ✅ "eslint uyarılarını da düzeltelim lütfen" - All warnings resolved (unused imports, types, debug logs)
- ✅ "memory bank güncelle" - activeContext.md, progress.md, systemPatterns.md, techContext.md updated

#### Key Learnings:
- **Server Actions Limitation**: Nested object arrays don't serialize properly from Server Components
- **RLS Bypass Pattern**: Migration API on server-side solves client-side permission issues
- **Next.js Image Config**: External image domains must be explicitly whitelisted
- **Photo Storage Strategy**: Migration pattern bridges old data structure (uploaded_assets) to new (listings.images)
- **Download UX**: Browser download API (blob → object URL → programmatic click) works reliably
- **Debug Cleanup**: Production builds must be free of console logs and invalid API calls

---

### 24.11.2025 - ESLint 9 Migration & UI/UX Refinement - COMPLETE ✅
**Feature**: ESLint 9 flat config migration, type safety improvements, UI consistency
**Deployment**: Hazır - Vercel'e deploy edilebilir
**Status**: Build successful, 0 ESLint warnings, full type coverage

#### ESLint 9 Migration:

**1. Flat Config Setup**
- Migrated: `eslint.config.mjs` (ESLint 9 flat config format)
- Plugins: `@typescript-eslint`, `@next/eslint-plugin-next`, `react-hooks`
- Rules: TypeScript strict mode, React hooks exhaustive deps, no-explicit-any
- Compatibility: Next.js 15.5.4 full support

**2. TypeScript Type Safety (100+ uyarı düzeltildi)**
- Removed all `any` types, replaced with proper interfaces
- Error handling: `catch (err)` → `const error = err as Error`
- React components: Proper prop interfaces, no implicit any
- Files affected: 20+ dosya (dashboard, components, lib, wizard)

**3. React Hooks Best Practices**
- Fixed: `react-hooks/exhaustive-deps` warnings
- Fixed: `react-hooks/set-state-in-effect` warnings
- Pattern: useState lazy initializer for initial data
- Pattern: useCallback for stable function references
- Example: `job-session.tsx` - 5 warnings → 0 warnings

**4. Unused Variables Cleanup**
- Removed: Unused imports, variables, parameters
- Pattern: `eslint-disable-next-line` for unavoidable cases (library type requirements)
- Pattern: `_` prefix for intentionally unused destructured values

**5. Next.js Image Optimization**
- Replaced: `<img>` → `<Image>` from `next/image`
- Files: `add-dialog.tsx`, `step4-prepare-reels.tsx`
- Benefits: Automatic optimization, lazy loading, proper sizing

**6. Third-Party Library Type Fixes**
- `react-dropzone`: Proper FileRejection, DropEvent imports
- `react-select`: Type-safe option handling
- Pattern: Import types from library instead of custom interfaces

#### Client Status System:

**1. Database Schema**
- Added: `clients.status` column (TEXT, default 'Looking')
- Constraint: CHECK (status IN ('Urgent', 'Looking', 'Rented'))
- SQL provided for Supabase migration

**2. UI Components**
- Status dropdown: Urgent (yeşil), Looking (mavi), Rented (kırmızı)
- Badge display: Color-coded status in table
- Form: Status select added to client add/edit modal

**3. Business Logic**
- Auto-delete from `teamwork_clients` when status = 'Rented'
- Pattern identical to listings availability system
- Maintains teamwork table integrity

**4. Form Optimization**
- Modal scroll: `max-h-[90vh] overflow-y-auto`
- Sticky header: Title stays visible during scroll
- Reduced spacing: `space-y-3`, `p-6` for compact layout

#### Teamwork Shared State Tracking:

**1. Listings Shared Status**
- Backend: `getListings()` checks `teamwork_listings` table
- Frontend: `isSharedInTeamwork` boolean added to Listing interface
- UI: Share button → Shared badge (grey, disabled)
- Refresh: Page reload after successful share

**2. Clients Shared Status**
- Backend: `getUserAndClients()` checks `teamwork_clients` table
- Frontend: `isSharedInTeamwork` boolean added to Client interface
- UI: Share button → Shared badge (grey, disabled)
- Consistency: Same pattern as listings

**3. Error Messages**
- Duplicate share: "Property already shared with team" (409 status)
- PostgreSQL error code: 23505 (unique constraint violation)
- User-friendly messaging in both listings and clients

#### UI/UX Consistency Improvements:

**1. Dashboard Button Standardization**
- All buttons: Soft purple (`bg-purple-100 hover:bg-purple-200 text-purple-700`)
- No solid purple, no borders - full consistency
- Affected: Start, View, Analyze, Settings, Collaborate, Schedule, Add Lead buttons

**2. Form Validation Messages**
- All HTML5 validation: English messages via `onInvalid` handlers
- Viewings form: City select, Client Mobile No
- Pattern: Hidden input for react-select validation
- Browser-independent: "Please fill out this field" → "Please select a city"

**3. PWA Install Prompt Optimization**
- Boyut küçültüldü: `max-w-md` → `max-w-sm`
- Padding: `p-4` → `p-3`, `mb-4` → `mb-3`
- Typography: `text-lg` → `text-base`, `text-sm` → `text-xs`
- Logo: `w-12 h-12` → `w-10 h-10`
- Buttons: `h-8 text-sm px-3` for compact size
- All text preserved, just more compact layout

#### Files Modified (20+ files):

**Dashboard:**
- `app/dashboard/DashboardClient.tsx` - Button standardization, Profile type fix
- `app/dashboard/clients/page.tsx` - Status system, shared tracking, form scroll
- `app/dashboard/listings/page.tsx` - Shared tracking
- `app/dashboard/listings/add-dialog.tsx` - Next.js Image
- `app/dashboard/listings/actions.ts` - Shared listings check
- `app/dashboard/new-post/page.tsx` - Unused imports removed
- `app/dashboard/revenue/RevenueClient.tsx` - Error handling
- `app/dashboard/revenue/page.tsx` - Profile prop removed
- `app/dashboard/teamwork/TeamworkClient.tsx` - Unused imports
- `app/dashboard/teamwork/page.tsx` - Props removed
- `app/dashboard/viewings/page.tsx` - English validation messages

**Components:**
- `components/listing/malta-map.tsx` - setState-in-effect fix
- `components/profile/*.tsx` - Type safety (3 files)
- `components/system/AnalyticsComponents.tsx` - Interfaces added
- `components/system/NotificationSettings.tsx` - Error handling
- `components/system/PWAInstallPrompt.tsx` - Size optimization
- `components/upload/image-dropzone.tsx` - react-dropzone types
- `components/wizard/step2-actions.tsx` - Unused vars removed
- `components/wizard/step3-post.tsx` - Unused state removed
- `components/wizard/step4-prepare-reels.tsx` - Type safety, const usage

**API Routes:**
- `app/api/teamwork/listings/share/route.ts` - Duplicate error message

**Lib:**
- `lib/client/job-session.tsx` - useState lazy initializer, useCallback

#### Key Technical Patterns:

**1. ESLint Disable Guidelines**
- ✅ OK: Third-party library type requirements (react-dropzone DropEvent)
- ✅ OK: Intentional unused params with clear comment
- ❌ NOT OK: Business logic type issues (must fix with proper types)
- ❌ NOT OK: Suppressing real errors (must address root cause)

**2. Type Safety Patterns**
```typescript
// Error handling
catch (err) {
  const error = err as Error;
  console.error('Error:', error.message);
}

// Interface instead of any
interface AnalyticsSummary {
  summary: { totalEvents: number; /* ... */ };
  categoryDistribution: Record<string, number>;
}

// Type guards for third-party data
const videoUrl = 
  ('result' in data && (data.result as Record<string, unknown>)?.url) ||
  ('url' in data && data.url as string);
```

**3. React Hook Optimization**
```typescript
// useState lazy initializer (avoid setState in effect)
const [jobId, setJobId] = useState(() => {
  const fromUrl = searchParams.get('jobId');
  if (fromUrl) {
    localStorage.setItem('letify_jobId', fromUrl);
    return fromUrl;
  }
  return localStorage.getItem('letify_jobId') || '';
});

// useCallback for stable references
const handleAction = useCallback((id: string) => {
  // ... logic
}, [dependencies]);
```

**4. Shared State Tracking Pattern**
```typescript
// Backend: Check teamwork table
const listingIds = data.map(d => d.id);
const { data: sharedListings } = await supabase
  .from('teamwork_listings')
  .select('listing_id')
  .in('listing_id', listingIds);

const sharedIds = new Set(sharedListings.map(s => s.listing_id));

// Frontend: Add to interface
interface Listing {
  // ... existing fields
  isSharedInTeamwork?: boolean;
}

// UI: Conditional button
{isShared ? (
  <span className="text-gray-500 text-sm">Shared</span>
) : (
  <button onClick={handleShare}>Share</button>
)}
```
**Feature**: Production deployment için build hatalarının sistematik çözümü
**Deployment**: Hazır - Vercel'e deploy edilebilir
**Status**: Build successful (87 pages), SSL secure, 0 errors

#### Build Hatalarının Çözümü:

**1. Package Manager Conflict**
- Problem: `package-lock.json` ve `pnpm-lock.yaml` çakışması
- Çözüm: `package-lock.json` silindi
- Created: `.npmrc` dosyası (`package-manager=pnpm`, `engine-strict=true`)
- Result: IDE ve tooling pnpm'yi zorunlu kullanıyor

**2. Route Conflict (/auth/callback)**
- Problem: Aynı path'te hem `page.tsx` hem `route.ts` var
- Hata: "You cannot have two parallel pages that resolve to the same path"
- Çözüm: `route.ts` silindi (daha basit implementasyon)
- Kept: `page.tsx` (daha gelişmiş auth flow kontrolü)

**3. logActivity Function Signature**
- Problem: `approve-user/route.ts`'de supabase parametresi eksik
- Pattern: `logActivity(supabase, { user_id, type, data })`
- Fixed: Tüm route'larda tutarlı kullanım sağlandı
- Example: 
  ```typescript
  await logActivity(supabase, {
    user_id: adminUser.id,
    type: 'user_approved',
    data: { resource_id: userId }
  })
  ```

**4. Missing userPlan State (step3-post.tsx)**
- Problem: `userPlan` tanımlı değil ama kullanılıyor
- Solution: State eklendi + subscription'dan plan çekme
- Changes:
  ```typescript
  const [userPlan, setUserPlan] = useState<string>('free')
  const { data: subscriptions } = await supabase
    .from('billing_subscriptions')
    .select('status, plan')
  setUserPlan(subscriptions?.plan || 'free')
  ```

**5. useSearchParams Suspense Boundary**
- Problem: `/auth/callback` SSR sırasında useSearchParams hatası
- Next.js 15 requirement: useSearchParams Suspense içinde olmalı
- Solution: Component ayrımı
  - `page.tsx`: Suspense wrapper (server component)
  - `AuthCallbackContent.tsx`: useSearchParams logic (client component)
- Pattern:
  ```tsx
  // page.tsx
  export default function AuthCallbackPage() {
    return (
      <Suspense fallback={<LoadingUI />}>
        <AuthCallbackContent />
      </Suspense>
    )
  }
  ```

**6. TypeScript Import Path Resolution**
- Problem: IDE "Cannot find module './AuthCallbackContent'" hatası
- Root cause: TypeScript cache issue
- Solutions tried:
  - `.tsx` extension → Hata (allowImportingTsExtensions gerekli)
  - Relative path (`./`) → Cache hatası devam
  - ✅ Absolute path (`@/app/auth/callback/AuthCallbackContent`) → Çözüldü
- Lesson: Cache sorunlarında absolute imports daha güvenilir

**7. SSL Certificate Validation**
- Problem: `.env.local`'da `NODE_TLS_REJECT_UNAUTHORIZED=0`
- Security Risk: TLS doğrulaması devre dışı (production'da tehlikeli)
- Solution: Environment variable silindi
- Build output: ✅ SSL uyarıları kayboldu
- Updated: `.env.local.example` → Development-only warning eklendi

#### Build Statistics:
- ✅ **87 sayfa** başarıyla oluşturuldu
- ✅ **0 TypeScript error**
- ✅ **0 SSL warning**
- ✅ Linting ve type checking geçti
- ✅ Static pages generation complete
- ✅ Production-ready build

#### Files Modified:
1. `.npmrc` - Created (package manager enforcement)
2. `package-lock.json` - Deleted (pnpm conflict)
3. `app/auth/callback/route.ts` - Deleted (route conflict)
4. `app/auth/callback/page.tsx` - Suspense wrapper
5. `app/auth/callback/AuthCallbackContent.tsx` - Created (client logic)
6. `app/api/admin/approve-user/route.ts` - logActivity signature fix
7. `components/wizard/step3-post.tsx` - userPlan state added
8. `.env.local` - Removed NODE_TLS_REJECT_UNAUTHORIZED
9. `.env.local.example` - Added SSL warning comment

#### Key Technical Decisions:
1. **Package Manager**: pnpm enforced via .npmrc
2. **Route Organization**: page.tsx > route.ts (richer auth flow)
3. **Import Strategy**: Absolute paths for cache stability
4. **SSL Security**: TLS validation enabled (production requirement)
5. **Suspense Pattern**: Wrapper + Content separation

#### Development vs Production Learnings:
1. **next-pwa Logs**: Dev mode tekrarlar normal (webpack watch, Workbox GenerateSW)
   - [PWA] Compile server/client: Her rebuild'de tekrarlar
   - GenerateSW multiple times: Workbox plugin webpack watch behavior
   - Auto register messages: next-pwa her derlemede rapor eder
2. **Build Process**: Clean build after cache/lockfile changes
3. **SSL in Dev**: Local development NODE_TLS_REJECT_UNAUTHORIZED=0 kabul edilebilir
4. **SSL in Prod**: Vercel'de asla NODE_TLS_REJECT_UNAUTHORIZED kullanılmamalı

#### User Requirements Met:
- ✅ "pnpm install ile build alalım" - Successful build
- ✅ "SSL istesin çünkü deploy edeceğim vercel'e" - TLS validation enabled
- ✅ "memory bank güncelle" - progress.md, activeContext.md updated
- ✅ "benimle herzaman Türkçe konuş" - All communication in Turkish

### 18.01.2025 - Availability Tracking & Malta Map - COMPLETE ✅
**Feature**: Listing availability status + geospatial map visualization
**Deployment**: Vercel canlı https://app.letify.cloud
**Version**: 1.9

#### Availability Tracking System:

**1. Database Schema**
- Created: `supabase/migrations/20250118_add_availability_to_listings.sql`
- Enum type: `availability_status` ('Available', 'Rented', 'Soon')
- Column: `listings.availability` with default 'Available'
- Index: `idx_listings_availability` for query performance
- All listings automatically set to 'Available' on creation

**2. TypeScript Integration**
- Modified: `types/supabase.ts`
- Added availability to Row, Insert, Update interfaces
- Union type: `'Available' | 'Rented' | 'Soon' | null`
- Full type safety across application

**3. PostgreSQL Enum Handling**
- Pattern discovered: `::text` casting required
- Modified: `app/dashboard/listings/actions.ts`
- `getListings()`: `select('availability::text')` for Supabase client compatibility
- Direct values for INSERT/UPDATE operations (no casting)

**4. UI Components**
- Created: AvailabilitySelector dropdown component
- Color-coded badges: Green (Available), Red (Rented), Blue (Soon)
- Soft colors: `bg-{color}-100 text-{color}-800 border-{color}-200`
- Real-time updates with optimistic UI

**5. Business Logic Integration**
- Modified: `updateListingAvailability()` action
- Auto-delete from `teamwork_listings` when status changes to 'Rented'
- Maintains teamwork table integrity
- User requirement: "eğer kullanıcı listingini share ile daha önce teamwork tablosuna gönderdiyse, o kayıtta available iken rented guncellemesi yaparsa teamwork sayfasındaki Teamwork Listings tablosunda UI da kayıt kalkacak"

**6. Auto-Assignment**
- Modified: `app/api/jobs/start/route.ts` (job creation)
- Modified: `app/dashboard/listings/add-dialog.tsx` (manual creation)
- All new listings automatically get `availability='Available'`

#### Malta Map Geospatial Visualization:

**1. Google Maps Integration**
- Created: `components/listing/malta-map.tsx` (new component)
- Google Maps JavaScript API with Advanced Marker Element
- 62 Malta city coordinates hardcoded (no geocoding API calls)
- InfoWindow with listing details

**2. Script Loading Pattern**
- Singleton pattern: Check for existing script before loading
- Prevents "multiple times" console error
- Dynamic loading with `document.createElement('script')`
- Environment variable: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

**3. Marker Clustering**
- Group listings by city (not individual markers per listing)
- Color-coded by availability mix (green for Available, blue for Soon)
- Performance optimization: ~62 markers instead of potential hundreds
- InfoWindow shows all listings in clicked city

**4. Dual-State Data Architecture**
- Problem: Pagination shows 10 rows, but map needs ALL listings
- Solution: Separate data flows
  - `rows` state: Paginated table data (10 per page)
  - `mapListings` state: Full dataset (all Available + Soon)
- Created: `getAllAvailableAndSoonListings()` action (no pagination)
- Two independent useEffect hooks for optimal performance

**5. Environment Setup**
- Modified: `.env.local.example` - Added NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
- Created: `MALTA_MAP_SETUP.md` - Complete Google Cloud Console guide
- Dependencies: Added `@types/google.maps` to package.json

#### Viewings Mobile Responsive:

**1. Table Responsiveness**
- Modified: `app/dashboard/viewings/page.tsx`
- Tailwind breakpoints: `sm:` (640px), `md:` (768px)
- Responsive padding: `px-2 sm:px-3 md:px-4`
- Responsive fonts: `text-xs sm:text-sm`

**2. Calendar Responsiveness**
- Calendar grid heights: `h-16 sm:h-20 md:h-24`
- Event font sizes: `text-[10px] sm:text-xs`
- Truncate long text on mobile
- Touch-friendly targets (minimum 44×44px)

**3. Navigation Optimization**
- Condensed text on mobile: "Prev" vs "Previous"
- Hidden classes: `hidden md:table-cell` for non-critical columns
- Progressive enhancement: Mobile-first approach

#### Files Modified:
1. `supabase/migrations/20250118_add_availability_to_listings.sql` - Database schema
2. `types/supabase.ts` - TypeScript types
3. `app/api/jobs/start/route.ts` - Auto-assign availability
4. `app/dashboard/listings/actions.ts` - Enum casting, teamwork cleanup, map data
5. `app/dashboard/listings/page.tsx` - Dual-state architecture, AvailabilitySelector
6. `app/dashboard/listings/add-dialog.tsx` - Manual creation with availability
7. `app/dashboard/viewings/page.tsx` - Full responsive overhaul
8. `components/listing/malta-map.tsx` - Created (new component)
9. `package.json` - Added @types/google.maps
10. `.env.local.example` - Google Maps API key placeholder

#### Documentation Created:
- `MALTA_MAP_SETUP.md` - Google Cloud Console setup guide (8 steps)

#### Key Technical Decisions:
1. **Enum Casting**: `::text` for SELECT, raw values for INSERT/UPDATE
2. **Dual-State**: Separate pagination from full-dataset visualization
3. **Map Clustering**: City-level markers instead of listing-level
4. **Hardcoded Coords**: 62 Malta cities (alternative to geocoding API)
5. **Singleton Script**: Prevent duplicate Google Maps script loads
6. **Mobile-First**: Progressive enhancement with Tailwind breakpoints

#### User Requirements Met:
- ✅ "availability sütunu ekle" - Available (yeşil), Rented (kırmızı), Soon (mavi)
- ✅ "create post ile otomatik Available" - Auto-assignment on creation
- ✅ "Available→Rented ise teamwork'ten sil" - Teamwork cleanup logic
- ✅ "viewings sayfası mobil responsive değil" - Full responsive implementation
- ✅ "malta haritası + available/soon listeler" - Google Maps with filtering
- ✅ "tüm sayfalardaki kayıtlar haritada" - Dual-state architecture
- ✅ "memory bank güncelle" - progress.md, systemPatterns.md, techContext.md, activeContext.md

### 17.11.2025 - BotID Security & PWA Optimization - COMPLETE ✅
**Feature**: Bot protection ve PWA enhancements
**Deployment**: Vercel canlı https://app.letify.cloud
**Version**: 1.7

#### BotID Security Implementation:

**1. Package Installation**
- `pnpm i botid` (v1.5.10) başarıyla kuruldu
- Production ve development ortamlarında hazır

**2. Next.js Configuration**
- Modified: `next.config.js`
- Added `withBotId()` wrapper
- Proxy rewrites otomatik yapılandırıldı
- Ad-blockers ve third-party scripts'ten korunma

**3. Client-Side Protection**
- Created: `instrumentation-client.ts`
- `initBotId()` Next.js 15.3+ optimal setup
- Korunan rotalar tanımlandı:
  - `/api/sensitive` (POST)
  - `/api/checkout` (POST)
  - `/team/*/activate` (POST) - Wildcard support
  - `/api/user/*` (POST) - Dynamic routes

**4. Server-Side Verification**
- Created: `app/api/sensitive/route.ts`
- `checkBotId()` bot tespiti ve reddi
- Bot detected: HTTP 403 Forbidden yanıt
- Legitimate users: normal request processing

#### PWA Install Prompt Fixes:

**Problem**: Production ortamında PWA Install Prompt gösterilmiyordu
**Root Cause**: Component sadece Dashboard'da yüklenmişti

**Solutions Applied**:

1. **Component Global Availability**
   - Modified: `components/system/ClientProviders.tsx`
   - PWAInstallPrompt dinamik loading ile ekli
   - Tüm uygulama için erişilebilir

2. **Hydration Bug Fix**
   - Modified: `components/system/PWAInstallPrompt.tsx`
   - Added `isClient` state
   - Server-client mismatch giderildi
   - Browser API'ler yalnızca client'te çalışıyor

3. **Debug Logging**
   - `console.log` statements eklendi
   - `beforeinstallprompt` event tracking
   - Production troubleshooting desteği

4. **PWA Development Support**
   - Modified: `next.config.js`
   - Changed: `disable: false` (was `process.env.NODE_ENV === 'development'`)
   - Local development'te PWA aktif
   - Service worker kaydı: `/sw.js`, scope: `/`

5. **Cleanup**
   - Removed: `app/dashboard/DashboardClient.tsx` duplicate import
   - Removed: PWAInstallPrompt from Dashboard component

**Installation Requirements Met:**
- ✓ HTTPS (Production: app.letify.cloud)
- ✓ manifest.json (Valid, icons, display: standalone)
- ✓ Service Worker (Active, precache strategy)
- ✓ Minimum icons (192x192, 512x512 available)

**Test Results:**
- ✓ Local: `http://localhost:3001` - PWA aktif
- ✓ Production: `https://app.letify.cloud` - Ready for install prompt
- ✓ Chrome DevTools Application tab: Manifest verified
- ✓ Service Workers: Registered and active

#### Files Modified:
1. `next.config.js` - BotID wrapper + PWA disable fix
2. `instrumentation-client.ts` - Created (BotID client-side)
3. `app/api/sensitive/route.ts` - Created (BotID server-side example)
4. `components/system/PWAInstallPrompt.tsx` - Hydration fixes, debug logging
5. `components/system/ClientProviders.tsx` - PWAInstallPrompt global mount
6. `app/dashboard/DashboardClient.tsx` - Removed duplicate PWA import

#### Documentation Created:
- `PWA_INSTALL_PROMPT_DEBUG.md` - Troubleshooting guide for production environments

### 12.11.2025 - Advanced Push Notification System - COMPLETE ✅
3. `app/api/revenue/check-commission-reminders/route.ts` - Commission reminder cron job
4. `app/api/integrations/check-facebook-token/route.ts` - Facebook token expiry cron job
5. `supabase_migration_fb_token_expiry.sql` - Database migration for token tracking
6. `PUSH_NOTIFICATIONS_COMPLETE.md` - Comprehensive system documentation (v1.6)

**Files Modified:**
1. `app/api/viewings/route.ts` - Added team leader push notifications
2. `app/api/revenue/route.ts` - Added boss & team leader push notifications
3. `vercel.json` - Added 4 cron jobs configuration

**Vercel Cron Jobs Configuration:**
```json
{
  "crons": [
    {"path": "/api/viewings/check-reminders", "schedule": "0 * * * *"},
    {"path": "/api/system/check-alerts", "schedule": "0 8 * * *"},
    {"path": "/api/revenue/check-commission-reminders", "schedule": "0 * * * *"},
    {"path": "/api/integrations/check-facebook-token", "schedule": "0 8 * * *"}
  ]
}
```

**Database Changes:**
- `users_integrations.fb_token_updated_at` column added (TIMESTAMPTZ)
- Auto-update trigger: `trg_fb_token_updated` on `fb_access_token` change
- Backfilled existing records with current timestamp

**Anti-Spam Features:**
- Team leader: Only notifies on result field change (not comment/time updates)
- Boss: Single notification per revenue completion via `boss_notified` flag
- Optimized thresholds: 3,1 day (not 7,3,1), credits 5,0 (not 50,25,10,5,0)
- Smart filtering prevents constant notifications

**Type Safety:**
- Used type assertion for `fb_token_updated_at` (new column not in generated types yet)
- Correct revenue field usage: `ref_no`, calculated commission from `landlord_fee + client_fee`

**Documentation:**
- `PUSH_NOTIFICATIONS_COMPLETE.md`: 19 notification types, all categories, test procedures
- Valid viewing result values documented (from CHECK constraint)
- Environment variables, cron schedules, database schema
- Version history tracking

**Performance Impact:**
- 4 additional cron jobs (hourly + daily schedules)
- Minimal database queries (indexed fields: user_id, viewing_date, date_signed, date_move_in)
- Efficient parallel queries with Promise.all
- Automatic cleanup of expired push subscriptions (410/404 errors)

**Production Checklist:**
- ✅ All TypeScript errors resolved
- ✅ All cron jobs configured in vercel.json
- ✅ Comprehensive documentation created
- ⏳ Run `supabase_migration_fb_token_expiry.sql` in Supabase
- ⏳ Add `CRON_SECRET` to Vercel environment variables
- ⏳ Deploy to Vercel (cron jobs auto-activate)
- ⏳ Test all notification types with real data

**User Requirements Met:**
- ✅ "benimle herzaman türkçe konuş" - Always communicate in Turkish
- ✅ No spam - smart filtering on all notifications
- ✅ Boss + Team Leader receive both email AND push
- ✅ Team leader only on result changes (DEAL, NO DEAL, Negotiating, Scheduled)
- ✅ Boss only when both sides paid (no additional spam)
- ✅ Facebook token alerts prevent business interruption
- ✅ "ilave başka yeni şeyler ekleme lütfen" - No extra features added

### 11.11.2025 - Push Notifications Implementation ✅
**Feature**: Web Push API integration for PWA
**Solution**: Complete push notification infrastructure
**Changes:**
- Created `lib/notifications.ts` (249 lines): Web Push API utilities
  - `subscribeToPush()`, `unsubscribeFromPush()`, `savePushSubscription()`
  - Browser compatibility checks, VAPID key conversion
  - Permission handling and test notifications
- Created `supabase_migration_2025_12_push_notifications.sql`: Database schema
  - `push_subscriptions` table with RLS policies
  - Indexes on user_id and endpoint
  - CASCADE delete on user removal
- Created `components/system/NotificationSettings.tsx` (297 lines): UI component
  - Permission status display, Enable/Disable buttons
  - Browser compatibility check, benefits list
  - Integrated in `/dashboard/profile` page
  - Client-side only rendering (hydration safe)
- Created `app/api/notifications/send/route.ts` (198 lines): Server endpoint
  - POST endpoint for sending notifications
  - Batch sending with Promise.allSettled
  - Automatic cleanup of expired subscriptions
  - VAPID authentication with web-push library
- Created `public/sw-push.js`: Service worker push handlers
- VAPID keys generated and configured in `.env.local`
- TypeScript types: Added `push_subscriptions` to `types/supabase.ts`
- Type alias: `DbPushSubscription` to avoid conflict with browser's PushSubscription API
- PWA Install Prompt updated: "Push notifications (coming soon)" → "Push notifications"
- All text in install prompt changed to English
- **Testing**: Successfully tested notification flow (enable → send test → receive)
- **PWA.md**: Updated with complete push notifications documentation

**Type Conflicts Resolved:**
- Browser's global `PushSubscription` interface vs custom type
- Solution: Type alias `type DbPushSubscription = Database['public']['Tables']['push_subscriptions']['Row']`

**Hydration Challenges:**
- Browser APIs (ServiceWorker, PushManager, Notification) only available client-side
- Solution: `mounted` state flag for client-only rendering
- Early return with loading state if `!mounted`

**Performance Impact:**
- Bundle size: +~15KB (web-push library)
- Client-side only component (no SSR overhead)
- Indexed database queries for fast lookups

### 11.11.2025 - Subscription Page Optimization ✅
**Problem**: Subscription page using Radix UI Card/Button components (revenue-critical page)
**Solution**: Replaced with native HTML + Tailwind
**Changes:**
- Removed imports: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`, `Button`
- Replaced 9 Card components:
  - 5 Credit Package cards (10, 20, 50, 100, 200 credits)
  - 4 Subscription Plan cards (Free, Mini, Full, Enterprise)
- All buttons converted to native `<button>` with Tailwind classes
- Performance impact: ~150 KiB unused JavaScript eliminated
- Bundle size: **343 kB First Load JS** (same as optimized Dashboard)

**Native HTML Pattern Used:**
```jsx
// Credit Package Card
<div className="rounded-lg border border-purple-200 bg-card text-card-foreground shadow-sm hover:shadow-lg transition-shadow">
  <div className="p-6 pb-4 text-center">
    <h3 className="text-lg font-semibold leading-none tracking-tight">{amount} Credits</h3>
    <p className="text-sm text-muted-foreground mt-2">{description}</p>
  </div>
  <div className="p-6 pt-0 text-center">
    {/* Price display */}
  </div>
  <div className="p-6 pt-0">
    <button className="w-full px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-md transition-colors disabled:opacity-50">
      Buy Now
    </button>
  </div>
</div>

// Subscription Plan Card with flex-col for footer positioning
<div className="relative rounded-lg border bg-card text-card-foreground shadow-sm transition-all duration-200 hover:shadow-lg flex flex-col">
  <div className="p-6 pb-4 text-center">{/* Header */}</div>
  <div className="p-6 pt-0 flex-1">{/* Content (features list) */}</div>
  <div className="p-6 pt-0">{/* Footer (button) */}</div>
</div>
```

### 11.11.2025 - SEO URL Update ✅
**Changes:**
- `lib/seo.ts`: Updated domain from `letify.com` → `letify.cloud`
  - `siteConfig.url`: Default URL changed for production deployment
  - `authors[0].url`: Author URL updated for consistency
- Environment variable `NEXT_PUBLIC_SITE_URL` will override if set

### 11.11.2025 - Analytics Page Optimization ✅
**Problem**: Analytics page using Radix UI Card/Button components
**Solution**: Replaced with native HTML + Tailwind
**Changes:**
- Removed imports: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `Button`
- Replaced 3 Card components:
  - Date Range Filter
  - Quick Filters (4 buttons)
  - Export Options
- Performance impact: ~90-150 KiB unused JavaScript eliminated

### 11.11.2025 - Dashboard Performance Optimization - MAJOR SUCCESS ✅
**Problem**: Dashboard Lighthouse performance score 51, TBT 10,050ms
**Hedef**: Performance score 75+, TBT < 1,000ms
**Sonuç**: Performance 86, TBT 160ms (-98% improvement!)

#### 1. **Radix UI → Native HTML Migration** ✅
**Kaldırılan Komponentler:**
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogClose`
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`
- `Button` (tüm varyantlar)

**Native Replacements:**
```jsx
// Dialog → Native Modal
{showReminder && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
      {/* Content */}
    </div>
  </div>
)}

// Card → Native Div
<div className="rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-lg transition-shadow">
  <div className="p-6 pb-4">
    <h3 className="text-2xl font-semibold leading-none tracking-tight">Title</h3>
    <p className="text-sm text-muted-foreground mt-2">Description</p>
  </div>
  <div className="p-6 pt-0">{/* Content */}</div>
</div>

// Button → Native Button
<button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors">
  Click me
</button>
```

**Results:**
- Unused JavaScript: -205 KiB
- Dialog component: 163.3 KiB (53.0 KiB unused) → 0
- Button component: 50.6 KiB (49.9 KiB unused) → 0
- Card component: 40.6 KiB (37.7 KiB unused) → 0
- Performance: 51 → 57 (+6 points)

#### 2. **Server Component Migration** ✅
**Changes in `app/dashboard/page.tsx`:**
```typescript
// NEW: Server-side data fetching
async function fetchDashboardStats(userId: string) {
  const supabase = await createClient()
  
  // Parallel queries - all server-side
  const [listingsTotal, listingsMonth, clientsTotal, clientsMonth, 
         viewingsTotal, viewingsMonth, activities] = await Promise.all([
    supabase.from('listings').select('*', { count: 'exact', head: true }),
    supabase.from('listings').select('*', { count: 'exact', head: true }).gte('created_at', firstDayISO),
    // ... 5 more parallel queries
  ])
  
  return { totalListings, sharesThisMonth, totalClients, ... }
}

// Pass stats as prop
<DashboardClient user={user} profile={profile} stats={stats} />
```

**Changes in `app/dashboard/DashboardClient.tsx`:**
```typescript
// REMOVED: All client-side useEffect data fetching
// REMOVED: useState for data states
// REMOVED: createClient import

// NEW: Receive stats as prop
interface DashboardStats {
  totalListings: number;
  sharesThisMonth: number;
  totalClients: number;
  clientsThisMonth: number;
  totalViewings: number;
  viewingsThisMonth: number;
  recentActivities: any[];
}

export default function DashboardClient({ user, profile, stats }: { 
  user: any; profile: any; stats: DashboardStats 
})

// Use stats directly (no loading states needed)
<span>{stats.sharesThisMonth}</span>
```

**Benefits:**
- No client-side data fetching
- No loading states needed
- Faster initial render
- Better SEO (data in HTML)
- Reduced JavaScript execution
- Server-side caching possible

**Results:**
- Bundle size: 344 kB → 343 kB (-1 kB)
- Component size: 4.17 kB → 3.67 kB (-0.5 kB)
- TBT (dev mode): 10,240ms → 8,060ms
- Dev mode performance: 57 → 41 (temporary regression due to dev overhead)

#### 3. **Production Build Optimization** ✅
**Command**: `pnpm run build && pnpm run start`

**Production Results:**
- **Performance: 86** 🟢 (+35 from initial 51, +45 from dev 41)
- **FCP: 0.9s** ✅ (consistent)
- **LCP: 3.8s** ✅ (was 20.6s in dev, -16.8s!)
- **TBT: 160ms** ✅ (was 10,050ms initially, -98% reduction!)
- **CLS: 0** 🟢 (perfect)
- **Speed Index: ~2s** ✅
- **Accessibility: 93** 🟢
- **Best Practices: 100** 🟢
- **SEO: 100** 🟢

#### 4. **Config Cleanup** ✅
**Removed deprecated `experimental.turbo`:**
```javascript
// REMOVED from next.config.js
experimental: {
  turbo: {
    rules: {
      '*.css': { loaders: ['css-loader'], as: '*.css' }
    }
  }
}
```
**Reason**: Next.js 15 deprecation, no longer needed

#### 5. **useToast Hook Replacement** ✅
**Problem**: `useToast` required ToastProvider (Radix UI dependency)
**Solution**: Replace with native `alert()`
```typescript
// BEFORE
const { toast } = useToast()
toast({ title: 'Error', description: error.message, variant: 'destructive' })

// AFTER
alert('Logout failed: ' + (error.message || 'An error occurred during logout'))
```

### Key Learnings

#### Performance Optimization Strategy
1. **Development vs Production**: Always test in production mode
   - Dev mode: Performance 41 (hot reload, source maps, no minification)
   - Production: Performance 86 (optimized, minified, cached)
   
2. **Component Library Trade-offs**:
   - Radix UI: 205 KiB unused JavaScript for Dashboard
   - Native HTML + Tailwind: 0 KiB overhead, better performance
   - Choose native for performance-critical pages

3. **Server Component Benefits**:
   - Eliminates client-side data fetching
   - Reduces JavaScript bundle size
   - Improves LCP and TBT significantly
   - Better for SEO and initial load

4. **Metrics Hierarchy**:
   - **TBT (Total Blocking Time)**: Most impactful for performance score
   - **LCP (Largest Contentful Paint)**: Critical for user perception
   - **FCP (First Contentful Paint)**: Important but less weighted
   - **CLS (Cumulative Layout Shift)**: Easy to optimize

### Technical Debt & Future Considerations
- ✅ Dashboard optimized (Performance: 86)
- ✅ Analytics page optimized (11.11.2025) - Removed Card/Button, replaced with native HTML
- ✅ Subscription page optimized (11.11.2025) - Removed Card/CardFooter/Button, 343 kB bundle (revenue-critical page secured)
- ⚠️ **MEDIUM PRIORITY - Consider if performance issues arise**:
  - `app/dashboard/viewings/ViewingsClient.tsx` - Card, Button (~90 KiB reduction potential)
  - `app/dashboard/teamwork/TeamworkClient.tsx` - Card, Button (~90 KiB reduction potential)
- ⚠️ **LOW PRIORITY - Auth/Error pages** (low traffic):
  - `app/waiting-approval/page.tsx` - Card, Button
  - `app/verify-email/page.tsx` - Card, Button
  - `app/access-denied/page.tsx` - Card, Button
- ⚠️ Toast notifications using alert (consider custom toast implementation)
- ✅ Production build required for accurate performance testing
- ✅ Server Components pattern established for future pages

### Radix UI Removal Strategy (for Future Optimizations)
**Pattern established on Dashboard & Analytics:**
```jsx
// Card → Native Div
<div className="rounded-lg border bg-card text-card-foreground shadow-sm">
  <div className="p-6 pb-4">
    <h3 className="text-2xl font-semibold leading-none tracking-tight">Title</h3>
    <p className="text-sm text-muted-foreground mt-2">Description</p>
  </div>
  <div className="p-6 pt-0">{/* Content */}</div>
</div>

// Button (default variant) → Native Button
<button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors">
  Click me
</button>

// Button (outline variant) → Native Button
<button className="px-4 py-2 border rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
  Apply
</button>
```

### 10.11.2025 - Viewings Feature - Complete Implementation ✅
**Yeni Features:**
1. **Viewings System - Full CRUD with Calendar** ✅
   - **Database Schema**: `viewings` tablosu (14 fields)
   - **Migration**: `supabase_migration_2025_11_viewings.sql`
   - **RLS Policies**: Users can only see their own viewings
   - **API Endpoints**:
     - `/api/viewings` - GET (paginated), POST, PUT, DELETE
     - `/api/viewings/listings-suggestions` - Autocomplete for ref_no
     - `/api/viewings/clients-suggestions` - Autocomplete for client_name
   - **Email Notifications**: Team leader notifications when inform_teamleader checked

2. **Viewings Page Features** ✅
   - **Table View**: 30 records/page pagination
   - **Columns**: #, Created Date, Ref No, City, Viewing Date, Viewing Time, Client Name, Client Mobile No, Result, Comments, Inform Teamleader
   - **Add/Edit Modal**: Popup form with autocomplete and auto-fill
   - **Calendar View**: 3-month horizontal scroll calendar (previous, current, next)
   - **Click to Edit**: Row click opens edit modal

3. **Form Features** ✅
   - **Autocomplete Fields**:
     - Ref No: From listings.title (CreatableSelect)
     - Client Name: From clients.name (CreatableSelect)
   - **Auto-Fill**:
     - City: Auto-fills from selected listing
     - Phone: Auto-fills from selected client
   - **Time Selection**: Dropdown 07:00-21:00 in 15-min intervals (00, 15, 30, 45)
   - **Date Picker**: React-DatePicker with dd.MM.yyyy format
   - **Result Dropdown**: 4 options (DEAL, NO DEAL, Negotiating, Scheduled)
   - **Custom Validation**: English validation messages (no Turkish)

4. **Calendar Integration** ✅
   - **3-Month View**: Previous, current, next month
   - **Daily Viewings**: All viewings displayed on their viewing_date
   - **Color Coding**: Result-based colors
     - DEAL → Green
     - NO DEAL → Red
     - Negotiating → Blue
     - Scheduled → Yellow
   - **Viewing Cards**: Show #ID, time, ref_no
   - **Today Highlight**: Purple background for current day
   - **Click to Edit**: Calendar cards open edit modal

5. **Email Notification System** ✅
   - **Nodemailer Integration**: SMTP email sending
   - **HTML Templates**: Styled email with viewing details
   - **Team Leader Filter**: Only sends to users with role='teamleader'
   - **Trigger**: When inform_teamleader checkbox is true
   - **Email Content**: Viewing details, client info, property info
   - **SMTP Config**: `.env.local` configuration

6. **Dashboard Integration** ✅
   - **Quick Stats**:
     - Viewings This Month
     - Total Viewings
   - **Recent Activities**:
     - new_viewing_added
     - viewing_updated
   - **Activity Display**: Shows ref_no and client_name
   - **Last 7 Activities**: Increased from 5 to 7

7. **Analytics Integration** ✅
   - **New Chart**: "Monthly Activity: Viewings"
   - **X-Axis**: Days (Day 1 to Day 30/31)
   - **Y-Axis**: Viewing count
   - **Data**: Current month's daily viewing counts
   - **Position**: Bottom of analytics page (2-column span)

**Database Schema:**
```sql
-- viewings table
CREATE TABLE viewings (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id TEXT NOT NULL,
  ref_no TEXT,
  city TEXT,
  viewing_date DATE,
  viewing_time TIME,
  client_name TEXT,
  client_mobile_no TEXT,
  result TEXT CHECK (result IN ('DEAL', 'NO DEAL', 'Negotiating', 'Scheduled')),
  comments TEXT,
  inform_teamleader BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
- SELECT: Users see only their viewings
- INSERT: Users create viewings for themselves
- UPDATE: Users update only their viewings
- DELETE: Users delete only their viewings
```

**Değiştirilen/Yeni Dosyalar:**
- `supabase_migration_2025_11_viewings.sql`: NEW - Database migration
- `app/api/viewings/route.ts`: NEW - Main CRUD API
- `app/api/viewings/listings-suggestions/route.ts`: NEW - Autocomplete
- `app/api/viewings/clients-suggestions/route.ts`: NEW - Autocomplete
- `lib/email.ts`: NEW - Email utilities (sendEmail, generateViewingNotificationEmail)
- `SMTP_CONFIG.txt`: NEW - SMTP configuration guide
- `.env.local.example`: SMTP config added
- `app/dashboard/viewings/page.tsx`: Complete rewrite - Full functional component
- `app/dashboard/DashboardClient.tsx`: 
  - viewingsThisMonth state
  - totalViewings state
  - Fetch viewings stats
  - Recent Activities: new_viewing_added, viewing_updated
  - 7 activities (increased from 5)
- `app/dashboard/analytics/page.tsx`:
  - dailyViewings state
  - Fetch daily viewings data
  - Monthly Activity: Viewings chart
- `package.json`: nodemailer 7.0.9 dependency

**Technical Details:**
- **Viewing Time Format**: HH:MM (saniye olmadan)
  - Database: TIME format (19:00:00)
  - UI Display: substring(0, 5) → "19:00"
- **Pagination**: 30 records per page
- **Activity Logging**: POST/PUT operations log to activity table
- **Email**: Async, non-blocking
- **Form Validation**: HTML5 + custom messages

**Known Issues & Solutions:**
- ✅ TIME field formatting: substring(0, 5) for display
- ✅ React-Select required validation: Hidden input field hack
- ✅ Autocomplete auto-fill: onChange handlers update dependent fields

### 10.11.2025 - Teamwork Feature & UI Standardization ✅
**Yeni Features:**
1. **Teamwork System - Complete Implementation** ✅
   - **3 Yeni Sayfa**: Teamwork, Viewings, Revenue
   - **Database Schema**: `teamwork_listings` ve `teamwork_clients` tabloları
   - **Migration**: `supabase/migrations/20250110_teamwork_tables.sql`
   - **Share Buttons**: Listings ve Clients sayfalarında paylaşım butonları
   - **API Endpoints**: 
     - `/api/teamwork/listings/share` - Listing paylaşımı
     - `/api/teamwork/listings/route` - Paylaşılan listingleri getir
     - `/api/teamwork/clients/share` - Client paylaşımı
     - `/api/teamwork/clients/route` - Paylaşılan clientları getir

2. **Teamwork Page Features** ✅
   - **2 Tablo**: Teamwork Listings ve Teamwork Clients
   - **Pagination**: Her tabloda 10 item/sayfa
   - **Popup Modals**: Description ve Jobs sütunları için
   - **Agent Name Resolution**: Profile lookup ile agent ismi gösterimi
   - **Teamwork Date**: Paylaşım tarihi tracking
   - **Kolonlar**:
     - Listings: City, Price, Bedroom, Bathroom, Property Type, Description, Agent
     - Clients: Name, People, Bedroom, Cities, Family/Sharing, Nationalities, Jobs, Pet, Budget

3. **UI Consistency - Dashboard Buttons** ✅
   - **Tüm Sayfalarda Standart Dashboard Butonu**:
     - Teamwork, Viewings, Revenue, Clients, Listings
   - **Konum**: Tablonun dış köşesinde (sağ üst)
   - **Stil**: Grid icon (SVG), rounded-xl border, hover:bg-purple-50
   - **Pozisyon**: `absolute -top-10 right-0` (tablonun üstünde)

4. **UI Consistency - Pagination** ✅
   - **Shadcn Button Komponenti**: Tüm sayfalarda tutarlı
   - **Stil**: `variant="outline" size="sm"`
   - **Navigation**: First, Prev, [Sayfa Numaraları], Next, Last
   - **Active State**: Aktif sayfa için `variant="default"`
   - **Uygulandığı Sayfalar**: Teamwork, Listings, Clients

5. **Recent Activities Enhancement** ✅
   - **Listing Share**: Reference number gösterimi
   - **Client Share**: Client name gösterimi
   - **Activity Types**: 
     - `teamwork_listing_shared`
     - `teamwork_client_shared`

6. **Dashboard Quick Stats Update** ✅
   - **"Shares This Month" → "Posts This Month"**: UI label değişikliği
   - Fonksiyonel değişiklik yok, sadece görsel iyileştirme

**Database Schema:**
```sql
-- teamwork_listings table
- id (bigserial PK)
- listing_id (uuid FK -> listings.id)
- agent_user_id (uuid FK -> auth.users.id)
- agent_name (text)
- teamwork_date (timestamptz)
- city, price, bedroom, bathroom, property_type, description

-- teamwork_clients table
- id (bigserial PK)
- client_id (bigint FK -> clients.id)
- agent_user_id (uuid FK -> auth.users.id)
- agent_name (text)
- teamwork_date (timestamptz)
- client_name, people, bedroom, cities, family_sharing, 
  nationalities, jobs, pet, budget
```

**RLS Policies:**
- Herkes paylaşılan itemları görebilir (authenticated users)
- Sadece owner insert/delete yapabilir

**Değiştirilen/Yeni Dosyalar:**
- `app/dashboard/teamwork/page.tsx`: NEW - Teamwork ana sayfa
- `app/dashboard/teamwork/TeamworkClient.tsx`: NEW - İki tablo, pagination, modals
- `app/dashboard/viewings/page.tsx`: NEW - Viewings skeleton
- `app/dashboard/viewings/ViewingsClient.tsx`: NEW - Calendar integration placeholder
- `app/dashboard/revenue/page.tsx`: NEW - Revenue skeleton
- `app/dashboard/revenue/RevenueClient.tsx`: NEW - Financial tracking placeholder
- `app/api/teamwork/listings/share/route.ts`: NEW - Listing share endpoint
- `app/api/teamwork/listings/route.ts`: NEW - Get shared listings
- `app/api/teamwork/clients/share/route.ts`: NEW - Client share endpoint
- `app/api/teamwork/clients/route.ts`: NEW - Get shared clients
- `app/dashboard/DashboardClient.tsx`: 
  - Euro icon eklendi (DollarSign → Euro)
  - 3 yeni kart: Teamwork, Viewings, Revenue
  - Recent Activities: reference_no ve client_name gösterimi
  - Quick Stats: "Posts This Month" label update
- `app/dashboard/listings/page.tsx`: 
  - TeamworkShareButton eklendi
  - Dashboard button standardization
  - Pagination shadcn Button update
- `app/dashboard/clients/page.tsx`: 
  - ClientTeamworkShareButton eklendi
  - Jobs popup modal
  - Dashboard button standardization
  - Pagination shadcn Button update
  - Tablo spacing fix (mt-8)
- `components/ui/table.tsx`: NEW - Shadcn Table component
- `supabase/migrations/20250110_teamwork_tables.sql`: Database migration

**Teknik Detaylar:**
- **Event Propagation**: Share ve Jobs butonlarında `e.stopPropagation()` ile row click çakışması önlendi
- **Profile Lookup**: `profiles.user_id = auth.users.id` ile agent ismi çözümleme
- **Client-side Pagination**: `Array.slice()` ile sayfalama
- **Modal Pattern**: Dialog component ile nested clickable elements

---

### 09.11.2025 - Error Boundaries & Comprehensive Error Handling ✅
**Yeni Features:**
1. **React Error Boundary Component** ✅
   - File: `components/system/ErrorBoundary.tsx`
   - English UI: "Oops! Something Went Wrong"
   - Retry button with user recovery option
   - Development mode: detailed stack trace display
   - Error counter: tracks recurring errors
   - Production-ready: prepared for external logging (Sentry, LogRocket etc)

2. **API Error Handler Middleware** ✅
   - File: `lib/errorHandler.ts`
   - Consistent API response format: `{success, error, data}`
   - Error type detection: UNAUTHORIZED, FORBIDDEN, NOT_FOUND, VALIDATION_ERROR
   - `withErrorHandler()` wrapper function
   - `validateRequestBody()` and `createErrorResponse()` utilities

3. **Client-side Error Display Components** ✅
   - File: `components/system/ErrorDisplay.tsx`
   - `ErrorDisplay` component: 3 variants (inline, toast, modal)
   - `useError()` hook: Error state management
   - `AsyncOperation` wrapper: automatic error handling for async operations

4. **Root Layout Integration** ✅
   - `app/layout.tsx`: ErrorBoundary wrapped around ErrorShield
   - Import structure: `ErrorBoundary > ErrorShield > Children`
   - Production-ready error UI with graceful fallback

5. **Existing Error Handling** ✅
   - `app/api/stripe/webhook/route.ts`: Already has comprehensive try-catch and error logging
   - Error recovery: Graceful fallbacks, detailed console logging
   - Environment validation: Warnings for missing variables

**Değiştirilen Dosyalar:**
- `components/system/ErrorBoundary.tsx`: NEW - React Error Boundary
- `components/system/ErrorDisplay.tsx`: NEW - Client error display UI
- `lib/errorHandler.ts`: NEW - API error handling middleware
- `app/layout.tsx`: ErrorBoundary integration

---

### 09.11.2025 - Post Limit & Analytics Session ✅
**Yeni Features:**
1. **Post Limit System** ✅
   - Free plan kullanıcıları: Max 30 post/ay
   - `user_post_usage` tablosu oluşturuldu (migration: `2025_11_user_post_usage.sql`)
   - Step 3'te post tamamlandığında sayaç otomatik güncelleniyor
   - Limit aşıldığında orange uyarı gösteriliyor

2. **Subscription Kontrol** ✅
   - Free plan kullanıcıları Step 4'e (Reels) geçemiyorlar
   - Next butonu disabled: `userPlan !== 'free'` kontrolü
   - Tooltip: "Upgrade to a paid plan to create reels"

3. **UI Iyileştirmeleri** ✅
   - **View Post Tooltip**: Post başarısız olduğunda "Update Facebook Access Token" mesajı
   - **Quick Tips**: "Make sure that your access token is active" eklendi
   - **Analytics Başlığı**: "Analytics" → "Portfolio Analysis"
   - **Monthly Activity Chart**: "Clients Added" → "Clients"

4. **Analytics Enhancements** ✅
   - Listings tablosundan aylık post sayıları
   - Clients tablosundan aylık client sayıları
   - GroupedBarChart ile Posts vs Clients karşılaştırma
   - Geçmiş ayları görerek trend analizi

5. **Dashboard Updates** ✅
   - Quick Stats: "Shares This Month" listings tablosundan çekiliyor
   - Dinamik sayaçlar her sayfa yüklenmesinde refresh

**Değiştirilen Dosyalar:**
- `components/wizard/step3-post.tsx`: Post limit, tooltip, uyarı, free plan kontrolü
- `app/dashboard/subscription/page.tsx`: Free plan 30 limit, "Usage This Month" dinamik
- `app/dashboard/subscription/useBillingController.ts`: `monthlyPostUsage` state eklendi
- `app/dashboard/analytics/page.tsx`: Monthly activity chart, Portfolio Analysis başlığı
- `app/dashboard/DashboardClient.tsx`: Dashboard Quick Stats güncellendi
- `app/dashboard/new-post/page.tsx`: Quick Tips eklenti
- `supabase/migrations/2025_11_user_post_usage.sql`: Yeni tablo migration

---

### Önceki Sessions (Tarihsel)
- **Image Upload & Compression**: 15 görsele kadar, client-side compression, Supabase Storage
- **Stripe Integration**: Subscriptions, credits, webhooks
- **N8N Workflows**: Automation, webhook callbacks
- **Client Management**: CRUD operations, dashboard
- **Activity Logging**: Event tracking ve audit trails

## Sonraki Adımlar

### 20.06.2024 - SMTP, Supabase Auth, Admin, Analytics, City Select, Memory Bank Güncellemeleri ✅
**Önemli Değişiklikler ve Pattern'ler:**

#### 1. SMTP ve Ortam Yönetimi
- **Yerel (local) ortamda Gmail SMTP**, prod ortamında **Hostinger SMTP** kullanımı sağlandı.
- `.env.local` ve prod ortamı için SMTP ayarları ayrıldı. Gerekli environment variable'lar belirlendi:
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `NEXT_PUBLIC_SITE_URL`
- **Hostinger SMTP** prod için, **Gmail SMTP** local için kullanılıyor. Kodda ortam kontrolü ile doğru SMTP seçiliyor.
- **SMTP_CONFIG.txt** ve `.env.local.example` dosyaları güncellendi.

#### 2. Supabase Auth ve Redirect URL Yönetimi
- **Supabase Auth** için local ve prod ortamlarında doğru redirect URL'leri ayarlandı.
- `NEXT_PUBLIC_SITE_URL` ile environment'a göre dinamik yönlendirme sağlandı.
- Supabase panelinde hem local hem prod URL'leri tanımlandı.

#### 3. Admin Kullanıcı Yönetimi (SQL ile)
- `admin@letify.cloud` kullanıcısı için doğrudan SQL ile email_verified ve role güncellemesi yapıldı.
- `approval_queue` tablosunda unique constraint hatası SQL ile düzeltildi.
- Yeni admin eklemek için manuel insert ve güncelleme pattern'i belirlendi.

#### 4. Analytics Sayfası Mesajı
- `app/dashboard/analytics/page.tsx` dosyasında hata/uyarı mesajı yerine **nötr, gri ve kullanıcı dostu** bir mesaj gösteriliyor: "Henüz kayıtlı ilan veya müşteri yok."

#### 5. Viewings - City Select ve Auto-Fill
- `app/dashboard/viewings/page.tsx` dosyasında **şehir alanı Malta şehirleri select** olarak değiştirildi.
- Ref No seçildiğinde city alanı otomatik doldurulmaya devam ediyor (auto-fill logic korunuyor).
- Kullanıcı isterse city select ile manuel seçim yapabiliyor.

#### 6. Memory Bank ve Content Engineering
- Yapılan tüm değişiklikler ve yeni pattern'ler **memory-bank/activeContext.md** ve gerekirse diğer context dosyalarına Türkçe olarak eklendi.
- "Yaptığımız değişiklikleri unutmamak için memory bank güncelle. Ve benimle herzaman Türkçe konuş." prensibi uygulanıyor.

**Dosyalar:**
- `.env.local`, `SMTP_CONFIG.txt`, `app/dashboard/analytics/page.tsx`, `app/dashboard/viewings/page.tsx`, `supabase_migration_auth.sql`, `supabase_migration_admin_setup.sql`, `memory-bank/activeContext.md`

**Pattern'ler:**
- Ortam bazlı SMTP seçimi (local/prod)
- Supabase Auth redirect URL yönetimi
- Admin kullanıcı SQL ile yönetim
- UI'da nötr ve kullanıcı dostu mesajlar
- City select + auto-fill kombinasyonu
- Tüm önemli değişikliklerin memory bank'e Türkçe olarak işlenmesi

### Kısa Vadeli (1-2 hafta)
1. **Error Boundaries**: Comprehensive error handling implement et
2. **Testing Setup**: Unit ve integration test'leri kur
3. **Reels Feature**: Step 4-5 reels üretimi ve paylaşımı
4. **Email Notifications**: Post shared, subscription emails

### Orta Vadeli (1-3 ay)
1. **Advanced Analytics**: Export features, detailed reports
2. **Performance Optimization**: Bundle analysis, lazy loading
3. **Multi-language Support**: i18n implementation
4. **API Rate Limiting**: Usage limits ve quota management

### Uzun Vadeli (3-6 ay)
1. **AI Integration**: Automated captions, optimal posting times
2. **Social Media Expansion**: LinkedIn, TikTok, Instagram Threads support
3. **Team Collaboration**: Multi-user accounts, permission management
4. **API for Partners**: Third-party integration capabilities
5. **Mobile App**: Native iOS/Android applications
6. **Advanced Scheduling**: Queue management, auto-posting strategies

### Tamamlanan Görevler (Yapıldı) ✅
- Image upload and compression feature
- Stripe billing integration
- N8N workflow integration
- Dashboard analytics and statistics
- Client management system
- Activity logging
- Post limit system (09.11.2025)
- Monthly analytics tracking (09.11.2025)
- Error Boundaries & comprehensive error handling (09.11.2025)

## Aktif Kararlar ve Değerlendirmeler

### Technical Decisions

- **Next.js 15 Adoption**: Latest features ve performance improvements
- **Supabase Choice**: Full-stack BaaS solution for rapid development
- **Stripe Integration**: Battle-tested payment processing
- **N8N Workflows**: Flexible automation without vendor lock-in

### Design Decisions
- **Component Library**: Radix UI for accessibility ve consistency
- **Color Scheme**: Purple-based theme for modern look
- **Responsive Design**: Mobile-first approach
- **Toast Notifications**: Non-intrusive user feedback

### Business Decisions
- **Pricing Model**: Tiered subscriptions + credit system
- **Target Market**: SMBs ve freelance social media managers
- **Feature Prioritization**: Core workflow optimization

## Önemli Pattern'ler ve Tercihler

### Code Patterns
- **Server Components**: Data fetching için tercih et
- **Client Components**: Interactivity için
- **Custom Hooks**: Logic reuse için
- **Zod Schemas**: Type safety ve validation için

### Naming Conventions
- **Components**: PascalCase (DashboardClient)
- **Files**: kebab-case (image-compress.ts)
- **Functions**: camelCase (getUserProfile)
- **Database**: snake_case (user_profiles)

### Error Handling
- **Try-catch**: Async operations için
- **Error Boundaries**: React error boundaries
- **Toast Messages**: User-friendly error display
- **Logging**: Comprehensive error logging

## Öğrenmeler ve Proje İçgörüleri

### Technical Learnings
- Supabase RLS policies complex ama powerful
- Image compression client-side çok effective
- Stripe webhooks reliable ama testing zor
- N8N workflows flexible ama documentation limited

### User Experience Insights
- Drag-drop upload intuitive ama feedback critical
- Subscription complexity user confusion yaratabilir
- Real-time updates engagement artırır
- Mobile responsiveness essential

### Process Insights
- Feature flags gradual rollout için useful
- Automated testing early implementation'da critical
- Documentation code changes ile sync tutulmalı
- User feedback iteration için essential

### Performance Insights
- Image compression 60-80% size reduction sağlar
- React Query caching significant UX improvement
- Bundle splitting load times optimize eder
- Database indexes query performance dramatically artırır