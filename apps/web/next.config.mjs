/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@smcore/shared', '@smcore/database'],
};

export default nextConfig;
