import type { NextConfig } from "next";

const nextConfig: NextConfig = {
   output: 'standalone',  // ← Docker-hez szükséges

};

export default nextConfig;

module.exports = {
  allowedDevOrigins: ['0.0.0.0'],
}