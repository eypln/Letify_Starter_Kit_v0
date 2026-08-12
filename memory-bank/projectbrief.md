# Project Brief: Letify

> Güncel gerçek durum (13.08.2026): Letify, Malta merkezli lettings ekibinin production'da kullandığı iç emlak operasyon platformudur. Sosyal medya ve content engineering, ana emlak operasyonuna eklenen AI Second Brain alanıdır; projenin ana ürünü değildir.

## Proje Özeti
Letify, Malta merkezli emlakçılar için property listing, client, viewing, teamwork ve revenue süreçlerini yöneten rol tabanlı bir letting assistant platformudur. Agent, teamleader, manager ve boss rollerini destekler; ayrıca n8n tabanlı AI Second Brain ile content engineering çalışmalarını besler.

## Temel Gereksinimler
- **Authentication & Authorization**: Supabase Auth ile güvenli giriş/çıkış
- **Dashboard**: Kullanıcı istatistikleri, aktiviteler, yönetim paneli
- **Listings Management**: Property ilanlarını yönetme ve ekip içinde paylaşma
- **Client Management**: Müşteri bilgilerini takip etme
- **Image Upload & Compression**: Görselleri yükleme ve optimize etme
- **Billing & Subscriptions**: Stripe ile abonelik ve kredi sistemi
- **Workflow Integration**: N8N ile otomasyon workflow'ları
- **Analytics**: Revenue, bonus, performans ve operasyon raporları
- **Revenue & Bonus Auditability**: Deal ödeme tarihleri, agent/teamleader payları, listing fee sahipliği ve invoice durumlarının izlenebilir hesaplanması

## Teknik Kısıtlamalar
- Next.js 15 App Router kullan
- TypeScript zorunlu
- Supabase backend
- Stripe payment processing
- N8N workflow automation
- Responsive design (Tailwind CSS)
- PWA capable

## Başarı Kriterleri
- Güvenli ve ölçeklenebilir authentication
- Akıcı kullanıcı deneyimi
- Performant image processing
- Güvenilir payment processing
- Esnek workflow automation
- Detaylı analytics ve reporting

## Proje Kapsamı
MVP özellikleri implement edilmiş, production-ready hale getirilmesi hedefleniyor.