/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
  },
  webpack: (config, { dev, isServer }) => {
    // Geliştirme ortamında webpack önbellekleme stratejisini optimize et
    if (dev) {
      config.infrastructureLogging = {
        level: 'error', // Sadece hataları göster, uyarıları gizle
      };
    }
    return config;
  },
}

module.exports = nextConfig