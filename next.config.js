/** @type {import('next').NextConfig} */

// PWA configuration
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development' ? false : false, // Always enabled
  // Use custom service worker with push notification support
  swSrc: 'public/service-worker.js',
  buildExcludes: [
    /middleware-manifest\.json$/,
    /build-manifest\.json$/,
    /react-loadable-manifest\.json$/,
    /_buildManifest\.js$/,
    /_ssgManifest\.js$/,
  ],
  publicExcludes: [
    '!icons/README.md',
    '!*.map',
  ],
  // Note: runtimeCaching is handled in service-worker.js with Workbox directly
  // Remove from here to avoid conflicts with custom swSrc
})

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
    qualities: [75, 85, 90, 95, 100],
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // Production optimizations
  productionBrowserSourceMaps: false,
  
  // Compression
  compress: true,
  
  // Power optimizations
  poweredByHeader: false,
  
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
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-toast',
      'date-fns',
      'react-day-picker',
    ],
    // Enhanced tree-shaking
    webpackBuildWorker: true,
  },
  
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  webpack: (config, { dev, isServer }) => {
    // Supabase Realtime için edge runtime uyarılarını gizle
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      // Edge runtime'da çalışacak Supabase sürümü
      '@supabase/realtime-js': '@supabase/realtime-js/dist/module/index.js',
    };

    // Geliştirme ve production'da webpack loglarını optimize et
    config.infrastructureLogging = {
      level: 'error', // Sadece hataları göster
    };

    // Büyük string serializasyon uyarılarını gizle
    config.ignoreWarnings = [
      { module: /node_modules/ },
      /Serializing big strings/i,
      /Critical dependency: the request of a dependency is an expression/i,
    ];

    // Production optimizations
    if (!dev && !isServer) {
      // Enhanced tree shaking
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: true,
        minimize: true,
        concatenateModules: true,
        providedExports: true,
        innerGraph: true,
        splitChunks: {
          chunks: 'all',
          maxInitialRequests: 25,
          minSize: 20000,
          cacheGroups: {
            default: false,
            vendors: false,
            // React framework chunk
            framework: {
              name: 'framework',
              chunks: 'all',
              test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
              priority: 40,
              enforce: true,
            },
            // Large libraries (>160KB)
            lib: {
              test(module) {
                return module.size() > 160000 && /node_modules[/\\]/.test(module.identifier())
              },
              name(module) {
                const hash = require('crypto').createHash('sha1')
                hash.update(module.identifier())
                return hash.digest('hex').substring(0, 8)
              },
              priority: 30,
              minChunks: 1,
              reuseExistingChunk: true,
            },
            // Supabase chunk
            supabase: {
              test: /[\\/]node_modules[\\/](@supabase)[\\/]/,
              name: 'supabase',
              priority: 25,
              reuseExistingChunk: true,
            },
            // Radix UI chunk (if still used)
            radix: {
              test: /[\\/]node_modules[\\/](@radix-ui)[\\/]/,
              name: 'radix-ui',
              priority: 25,
              reuseExistingChunk: true,
            },
            // Common dependencies
            commons: {
              name: 'commons',
              minChunks: 2,
              priority: 20,
              reuseExistingChunk: true,
            },
            // Shared components
            shared: {
              name: 'shared',
              test: /[\\/]components[\\/]/,
              minChunks: 2,
              priority: 10,
              reuseExistingChunk: true,
            },
          },
        },
      }

      // Module concatenation for smaller bundles
      config.optimization.moduleIds = 'deterministic'
      config.optimization.chunkIds = 'deterministic'
    }

    return config;
  },
  
  // Experimental features for MessagePort fix
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  
  // Headers for service worker
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/service-worker.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
    ];
  },
}

module.exports = withPWA(withBundleAnalyzer(nextConfig))