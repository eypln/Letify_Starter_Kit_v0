# SEO Optimization Guide

## ✅ Implemented SEO Features

### 1. Metadata Optimization

#### Root Layout (`app/layout.tsx`)
```typescript
export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: siteConfig.authors,
  creator: siteConfig.creator,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
}
```

#### Viewport Configuration
```typescript
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
}
```

### 2. Open Graph & Twitter Cards

All pages include Open Graph and Twitter Card meta tags for rich social media sharing:

```typescript
{
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    url: siteConfig.url,
    title: pageTitle,
    description: pageDescription,
    siteName: siteConfig.name,
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: pageTitle,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: pageTitle,
    description: pageDescription,
    images: [ogImage],
    creator: '@letify',
  },
}
```

### 3. Sitemap.xml

**Location**: `/sitemap.xml`  
**Source**: `app/sitemap.ts`

Dynamic sitemap generation with:
- All public routes (home, sign-in, sign-up)
- Dashboard routes (lower priority, authenticated)
- Change frequency and priority settings
- Last modified dates

**Access**: `https://yourdomain.com/sitemap.xml`

```typescript
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://yourdomain.com',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
    // ... more routes
  ]
}
```

### 4. Robots.txt

**Location**: `/robots.txt`  
**Source**: `app/robots.ts`

Rules:
- ✅ Allow: `/`, `/sign-in`, `/sign-up`
- ❌ Disallow: `/dashboard/`, `/api/`, `/auth/`
- Sitemap reference included

**Access**: `https://yourdomain.com/robots.txt`

```typescript
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/sign-in', '/sign-up'],
        disallow: ['/dashboard/', '/api/', '/auth/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
```

### 5. JSON-LD Structured Data

**File**: `components/system/StructuredData.tsx`

#### Components Available:

1. **OrganizationSchema**
   ```typescript
   <OrganizationSchema 
     name="Letify"
     url="https://letify.com"
     logo="https://letify.com/logo.png"
   />
   ```

2. **WebSiteSchema**
   ```typescript
   <WebSiteSchema />
   ```

3. **WebApplicationSchema**
   ```typescript
   <WebApplicationSchema 
     name="Letify"
     description="Real Estate Social Media Automation"
   />
   ```

4. **BreadcrumbSchema**
   ```typescript
   <BreadcrumbSchema 
     items={[
       { name: 'Home', url: '/' },
       { name: 'Dashboard', url: '/dashboard' },
       { name: 'Analytics', url: '/dashboard/analytics' },
     ]}
   />
   ```

5. **ArticleSchema**
   ```typescript
   <ArticleSchema 
     title="Article Title"
     description="Article description"
     image="/article-image.jpg"
     datePublished="2024-11-10"
   />
   ```

### 6. SEO Configuration

**File**: `lib/seo.ts`

Centralized SEO configuration:

```typescript
export const siteConfig = {
  name: 'Letify',
  title: 'Letify - Real Estate Social Media Automation',
  description: 'Emlak profesyonelleri için otomatik içerik üretimi...',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://letify.com',
  ogImage: '/og-image.png',
  keywords: ['emlak', 'real estate', 'sosyal medya', ...],
  creator: 'Letify Team',
  authors: [{ name: 'Letify Team', url: 'https://letify.com' }],
}

export const seoPages = {
  home: {
    title: 'Letify - Emlak İçerik Üretimi...',
    description: 'Emlak listelerinizi saniyeler içinde...',
  },
  dashboard: { ... },
  analytics: { ... },
  // ... more pages
}
```

### 7. Page-Specific Metadata

Each page can override the default metadata:

```typescript
import { seoPages, generateOGMetadata } from '@/lib/seo'

export const metadata: Metadata = {
  title: seoPages.dashboard.title,
  description: seoPages.dashboard.description,
  ...generateOGMetadata({
    title: seoPages.dashboard.title,
    description: seoPages.dashboard.description,
  }),
}
```

## 📊 SEO Checklist

### ✅ Completed
- [x] Metadata optimization (title, description, keywords)
- [x] Open Graph tags for all pages
- [x] Twitter Card tags
- [x] Sitemap.xml generation
- [x] Robots.txt configuration
- [x] JSON-LD structured data (Organization, WebSite, WebApplication)
- [x] Viewport configuration (fixed deprecation warnings)
- [x] Language attribute (lang="tr")
- [x] Favicon and touch icons
- [x] Mobile-friendly meta tags

### 🔄 To Do (Optional)
- [ ] Add canonical URLs for pages
- [ ] Implement hreflang for multi-language support
- [ ] Add schema.org Article markup for blog posts
- [ ] Create custom 404 page with SEO
- [ ] Add rel="noopener noreferrer" to external links
- [ ] Implement breadcrumb navigation on pages
- [ ] Add FAQ schema for common questions
- [ ] Monitor Core Web Vitals (already implemented in Performance)

## 🎯 SEO Best Practices

### 1. Title Tags
- Keep titles under 60 characters
- Include primary keywords
- Use template pattern: `%s | Letify`
- Unique title for each page

### 2. Meta Descriptions
- 150-160 characters optimal
- Include call-to-action
- Unique for each page
- Include target keywords naturally

### 3. Headings
- One `<h1>` per page
- Logical heading hierarchy (h1 → h2 → h3)
- Include keywords in headings
- Descriptive and clear

### 4. Images
- Use Next.js `<Image>` component (already implemented)
- Add descriptive `alt` attributes
- Optimize file sizes (WebP/AVIF)
- Use responsive images

### 5. Internal Linking
- Link related pages
- Use descriptive anchor text
- Maintain consistent navigation
- Fix broken links

### 6. URL Structure
- Keep URLs short and descriptive
- Use hyphens for word separation
- Avoid special characters
- Consistent URL structure

## 🔍 Testing Tools

### Google Tools
- **Google Search Console**: Monitor search performance
- **PageSpeed Insights**: Test page speed and Core Web Vitals
- **Mobile-Friendly Test**: Check mobile usability
- **Rich Results Test**: Validate structured data

### Third-Party Tools
- **Screaming Frog**: Crawl site for SEO issues
- **Ahrefs/SEMrush**: Comprehensive SEO analysis
- **GTmetrix**: Performance and SEO audit

### Manual Checks
```bash
# View sitemap
curl https://yourdomain.com/sitemap.xml

# View robots.txt
curl https://yourdomain.com/robots.txt

# Check meta tags
curl https://yourdomain.com | grep -i "meta"
```

## 📈 Monitoring

### Core Web Vitals (Already Implemented)
- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1

See `PERFORMANCE.md` for details.

### Search Console Metrics
- Impressions
- Click-through rate (CTR)
- Average position
- Index coverage

### Analytics
- Organic traffic
- Bounce rate
- Time on page
- Conversion rate

## 🚀 Next Steps

1. **Submit Sitemap**: Add sitemap to Google Search Console
2. **Verify Ownership**: Verify domain in Google Search Console
3. **Monitor Performance**: Track rankings and traffic
4. **Content Optimization**: Update content based on keyword research
5. **Link Building**: Build quality backlinks
6. **Regular Audits**: Monthly SEO audits

## 📝 Environment Variables

Add to `.env.local`:

```bash
NEXT_PUBLIC_SITE_URL=https://letify.com
```

## 🔗 Resources

- [Next.js Metadata](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)
- [Google SEO Guide](https://developers.google.com/search/docs)
- [Schema.org](https://schema.org/)
- [Open Graph Protocol](https://ogp.me/)
- [Twitter Cards](https://developer.twitter.com/en/docs/twitter-for-websites/cards)

---

**Last Updated**: November 10, 2024  
**Status**: ✅ Fully Implemented  
**Next Phase**: PWA Features
