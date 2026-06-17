/** @type {import('next').NextConfig} */
const nextConfig = {
  // @supabase/supabase-js uses process.version which is Node.js-only.
  // Marking it as external prevents it from being bundled into the Edge Runtime (middleware).
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
}
export default nextConfig
