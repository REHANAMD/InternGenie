/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
      appDir: true,
    },
    async rewrites() {
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:8000/:path*', // Proxy to Python API (Rust integration coming soon)
        },
      ]
    },
    images: {
      domains: ['localhost'],
    },
  }
  
  module.exports = nextConfig