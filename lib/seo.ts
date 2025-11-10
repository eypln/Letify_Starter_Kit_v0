/**
 * SEO Configuration
 * Centralized SEO metadata for the application
 */

export const siteConfig = {
  name: 'Letify',
  title: 'Letify - Real Estate Social Media Automation',
  description: 'Emlak profesyonelleri için otomatik içerik üretimi ve sosyal medya paylaşım platformu. Listing linkinizden anında Facebook Post ve Reels oluşturun.',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://letify.com',
  ogImage: '/og-image.png',
  keywords: [
    'emlak',
    'real estate',
    'emlakçı',
    'realtor',
    'sosyal medya',
    'social media',
    'içerik üretimi',
    'content generation',
    'facebook post',
    'facebook reels',
    'otomasyon',
    'automation',
    'gayrimenkul',
    'property',
    'listing',
  ],
  creator: 'Letify Team',
  authors: [
    {
      name: 'Letify Team',
      url: 'https://letify.com',
    },
  ],
}

export const seoPages = {
  home: {
    title: 'Letify - Emlak İçerik Üretimi ve Sosyal Medya Otomasyonu',
    description: 'Emlak listelerinizi saniyeler içinde çekici Facebook Post ve Reels\'e dönüştürün. AI destekli içerik üretimi ile sosyal medya varlığınızı güçlendirin.',
  },
  dashboard: {
    title: 'Dashboard - Letify',
    description: 'Emlak içeriklerinizi yönetin, istatistiklerinizi görüntüleyin ve sosyal medya performansınızı takip edin.',
  },
  analytics: {
    title: 'Analytics - Letify',
    description: 'Detaylı analizler ve raporlarla sosyal medya performansınızı optimize edin. Aylık istatistikler ve grafikler.',
  },
  listings: {
    title: 'Listings - Letify',
    description: 'Emlak listelerinizi yönetin, yeni içerikler oluşturun ve takımınızla paylaşın.',
  },
  clients: {
    title: 'Clients - Letify',
    description: 'Müşterilerinizi yönetin, notlar ekleyin ve takım üyeleriyle paylaşın.',
  },
  viewings: {
    title: 'Viewings - Letify',
    description: 'Emlak görüşmelerinizi takip edin, takvim görünümünde planlayın ve ekibinizle koordine olun.',
  },
  revenue: {
    title: 'Revenue - Letify',
    description: 'Gelir ve komisyon takibi, kira kayıtları ve finansal raporlama.',
  },
  teamwork: {
    title: 'Teamwork - Letify',
    description: 'Listing ve müşterileri takım üyeleriyle paylaşın, iş birliği yapın.',
  },
  profile: {
    title: 'Profile - Letify',
    description: 'Profilinizi düzenleyin, Facebook entegrasyonlarınızı yönetin ve ayarlarınızı güncelleyin.',
  },
  subscription: {
    title: 'Subscription - Letify',
    description: 'Abonelik planınızı yönetin, kredi satın alın ve fatura bilgilerinizi görüntüleyin.',
  },
  newPost: {
    title: 'New Post - Letify',
    description: 'Yeni emlak içeriği oluşturun. Listing linkinden otomatik Facebook Post ve Reels üretin.',
  },
  signIn: {
    title: 'Sign In - Letify',
    description: 'Letify hesabınıza giriş yapın ve emlak içeriklerinizi yönetmeye başlayın.',
  },
  signUp: {
    title: 'Sign Up - Letify',
    description: 'Letify\'a kaydolun ve emlak sosyal medya otomasyonunun keyfini çıkarın. Ücretsiz deneme ile başlayın.',
  },
}

/**
 * Generate Open Graph metadata for a page
 */
export function generateOGMetadata({
  title,
  description,
  image,
  url,
}: {
  title: string
  description: string
  image?: string
  url?: string
}) {
  return {
    openGraph: {
      type: 'website' as const,
      locale: 'tr_TR',
      url: url || siteConfig.url,
      title,
      description,
      siteName: siteConfig.name,
      images: [
        {
          url: image || siteConfig.ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image' as const,
      title,
      description,
      images: [image || siteConfig.ogImage],
      creator: '@letify',
    },
  }
}
