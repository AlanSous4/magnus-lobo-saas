import withPWAInit from "next-pwa";

/** Configuração do PWA */
const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  buildExcludes: [/middleware-manifest\.json$/],
  cacheOnFrontEndNav: true, 
  reloadOnOnline: false, // 👈 Mude para false para evitar refresh indesejado
  fallbacks: {
    document: "/vendas", // 👈 Opcional: define uma página padrão se a navegação falhar
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  turbopack: {},

  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    unoptimized: true,
  },
};

export default withPWA(nextConfig);