import { MetadataRoute } from 'next'
import { siteConfig } from '@/lib/seo'

/**
 * Generate dynamic sitemap for all public pages
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = siteConfig.url

  // Static public pages
  const staticRoutes = [
    '',
    '/sign-in',
    '/sign-up',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: route === '' ? 1 : 0.8,
  }))

  // Dashboard pages (lower priority, authenticated)
  const dashboardRoutes = [
    '/dashboard',
    '/dashboard/analytics',
    '/dashboard/listings',
    '/dashboard/clients',
    '/dashboard/viewings',
    '/dashboard/revenue',
    '/dashboard/teamwork',
    '/dashboard/profile',
    '/dashboard/subscription',
    '/dashboard/new-post',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  }))

  return [...staticRoutes, ...dashboardRoutes]
}
