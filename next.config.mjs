/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // three/R3F ship untranspiled ESM in places; keep them out of the server bundle
  // and let Next split them into their own lazy chunk (the globe is dynamic-imported).
  transpilePackages: ['three'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', 'recharts'],
  },
}

export default nextConfig
