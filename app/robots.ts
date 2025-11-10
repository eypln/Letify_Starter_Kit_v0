import { MetadataRoute } from 'next'
import { siteConfig } from '@/lib/seo'

/**
 * Robots.txt file for SEO
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = siteConfig.url

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/sign-in',
          '/sign-up',
        ],
        disallow: [
          '/dashboard/',
          '/api/',
          '/auth/',
          '/verify-email',
          '/waiting-approval',
          '/access-denied',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: [
          '/',
          '/sign-in',
          '/sign-up',
        ],
        disallow: [
          '/dashboard/',
          '/api/',
          '/auth/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
