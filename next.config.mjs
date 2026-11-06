/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.1',
  },
  webpack: (config) => {
    config.output = {
      ...config.output,
      chunkLoadTimeout: 300000,
    };
    return config;
  },
};

export default nextConfig;
