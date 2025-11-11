/**
 * SEO Configuration
 * Centralized SEO metadata for the application
 */

export const siteConfig = {
  name: 'Letify',
  title: 'Letify - Letting Assistant',
  description: 'Your professional letting assistant with powerful tools for property management, viewings, and client coordination.',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://letify.cloud',
  ogImage: '/og-image.png',
  keywords: [
    'letting',
    'property management',
    'real estate',
    'viewings',
    'clients',
    'lettings agent',
    'property',
    'rental',
    'tenants',
    'landlord',
  ],
  creator: 'Letify Team',
  authors: [
    {
      name: 'Letify Team',
      url: 'https://letify.cloud',
    },
  ],
}

export const seoPages = {
  home: {
    title: 'Letify - Letting Assistant',
    description: 'Your professional letting assistant with powerful tools for property management, viewings, and client coordination.',
  },
  dashboard: {
    title: 'Dashboard - Letify | Letting Assistant',
    description: 'Manage your properties, view statistics, and track your letting performance.',
  },
  analytics: {
    title: 'Analytics - Letify | Letting Assistant',
    description: 'Detailed analytics and reports to optimize your letting performance. Monthly statistics and charts.',
  },
  listings: {
    title: 'Listings - Letify | Letting Assistant',
    description: 'Manage your property listings, create new content, and share with your team.',
  },
  clients: {
    title: 'Clients - Letify | Letting Assistant',
    description: 'Manage your clients, add notes, and share with team members.',
  },
  viewings: {
    title: 'Viewings - Letify | Letting Assistant',
    description: 'Track property viewings, schedule in calendar view, and coordinate with your team.',
  },
  revenue: {
    title: 'Revenue - Letify | Letting Assistant',
    description: 'Revenue and commission tracking, rental records, and financial reporting.',
  },
  teamwork: {
    title: 'Teamwork - Letify | Letting Assistant',
    description: 'Share listings and clients with team members, collaborate efficiently.',
  },
  profile: {
    title: 'Profile - Letify | Letting Assistant',
    description: 'Edit your profile, manage integrations, and update your settings.',
  },
  subscription: {
    title: 'Subscription - Letify | Letting Assistant',
    description: 'Manage your subscription plan, purchase credits, and view billing information.',
  },
  newPost: {
    title: 'New Post - Letify | Letting Assistant',
    description: 'Create new property content and marketing materials.',
  },
  signIn: {
    title: 'Sign In - Letify | Letting Assistant',
    description: 'Sign in to your Letify account and start managing your properties.',
  },
  signUp: {
    title: 'Sign Up - Letify | Letting Assistant',
    description: 'Sign up to Letify and discover powerful letting management tools. Start your free trial.',
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
