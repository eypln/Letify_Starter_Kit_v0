/** @type {import('next').NextConfig} */

// Bundle analyzer configuration
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

const nextConfig = {
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },

  // Production optimizations
  productionBrowserSourceMaps: false,
  
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
    optimizeCss: true,
    optimizePackageImports: [
      'recharts',
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-label',
      '@radix-ui/react-separator',
      '@radix-ui/react-slot',
    ],
  },
  
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  webpack: (config, { dev, isServer }) => {
    // Geliştirme ortamında webpack önbellekleme stratejisini optimize et
    if (dev) {
      config.infrastructureLogging = {
        level: 'error', // Sadece hataları göster, uyarıları gizle
      };
    }

    // Production optimizations
    if (!dev && !isServer) {
      // Tree shaking optimization
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: true,
      }
    }

    return config;
  },
}

module.exports = withBundleAnalyzer(nextConfig)