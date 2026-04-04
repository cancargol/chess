/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/chess',
  assetPrefix: '/chess/',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
