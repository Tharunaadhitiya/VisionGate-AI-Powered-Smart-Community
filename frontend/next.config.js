/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { remotePatterns: [{ protocol: 'http', hostname: 'localhost' }], unoptimized: true },
  output: 'standalone',
  allowedDevOrigins: ['192.168.1.6', 'localhost'],
};

module.exports = nextConfig;
