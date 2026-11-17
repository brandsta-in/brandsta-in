// nuxt.config.ts
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  future: {
    compatibilityVersion: 4,
  },

  compatibilityDate: '2024-11-01',

  pages: true,

  // 1. Site Authority (Forced Production Indexable)
  site: {
    url: 'https://brandsta.in',
    name: 'Brandsta',
    indexable: true,
    env: 'production',
  },

  // 2. Tailwind CSS v4 via Vite
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },

  // 3. Core Modules
  modules: [
    '@nuxt/fonts',
    '@vueuse/motion/nuxt',
    '@nuxtjs/sitemap',
    '@nuxtjs/robots',
    '@vercel/speed-insights/nuxt',
    '@vercel/analytics/nuxt'
  ],

  // 4. Typography Owned Exclusively by @nuxt/fonts (Zero Duplicate Links)
  fonts: {
    defaults: {
      styles: ['normal'],
      subsets: ['latin'],
    },
    families: [
      {
        name: 'Inter',
        provider: 'google',
        styles: ['normal'],
        weights: [300, 400, 500, 600, 700],
        global: true,
        preload: true,
      },
    ],
  },

  // 5. Centralized GPU-Only Motion Directives (Hero Opacity: 1 for Instant LCP)
  motion: {
    directives: {
      'hero-fade-up': {
        initial: { opacity: 1, y: 28 },
        visibleOnce: {
          opacity: 1,
          y: 0,
          transition: { duration: 850, ease: [0.22, 1, 0.36, 1] },
        },
      },
      'hero-scale-in': {
        initial: { opacity: 1, y: 24, scale: 0.94 },
        visibleOnce: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: { duration: 850, ease: [0.22, 1, 0.36, 1] },
        },
      },
      'hero-micro-up': {
        initial: { opacity: 1, y: 16 },
        visibleOnce: {
          opacity: 1,
          y: 0,
          transition: { duration: 700, ease: [0.22, 1, 0.36, 1] },
        },
      },
      'fade-up': {
        initial: { opacity: 0, y: 24 },
        visibleOnce: {
          opacity: 1,
          y: 0,
          transition: { duration: 700, ease: [0.22, 1, 0.36, 1] },
        },
      },
    },
  },

  // 6. Sitemap Configuration
  sitemap: {
    zeroRuntime: true,
    urls: [
      { loc: '/', changefreq: 'daily', priority: 1.0 },
    ],
  },

  // 7. Robots Configuration (Explicitly Open to All Crawlers & AI Bots)
  robots: {
    blockNonSeoBots: false,
    blockAiBots: false,
    allow: ['/'],
    disallow: [],
    sitemap: ['https://brandsta.in/sitemap.xml'],
  },

  // 8. Prerender Rules
  routeRules: {
    '/robots.txt': { prerender: true },
    '/sitemap.xml': { prerender: true },
    '/': { prerender: true },
  },

  // 9. Nitro Compression & Crawler Prerendering
  nitro: {
    compressPublicAssets: true,
    prerender: {
      crawlLinks: true,
      routes: [
        '/robots.txt',
        '/sitemap.xml',
        '/',
      ],
    },
  },

  // 10. Payload Extraction
  experimental: {
    payloadExtraction: true,
  },

  // 11. Master Stylesheet
  css: ['~/assets/css/main.css'],

  // 12. SSR Motion Transpilation
  build: {
    transpile: ['@vueuse/motion'],
  },

  // 13. Inline Critical CSS for Zero Render-Blocking
  features: {
    inlineStyles: true,
  },

  // 14. Runtime Secrets Vault (Empty Fallbacks in Git)
  runtimeConfig: {
    resendApiKey: '',
    public: {
      siteUrl: 'https://brandsta.in',
    },
  },

  // 15. Global Head (Dynamic Canonicals Handled Per-Route in useBrandstaSeo.ts)
  app: {
    baseURL: '/',
    pageTransition: {
      name: 'page',
      mode: 'out-in',
    },
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      title: 'Brandsta | Something is forming.',

      htmlAttrs: {
        lang: 'en',
      },

      meta: [
        {
          name: 'description',
          content: 'Something is forming. Every beginning carries a signal. Follow its journey.',
        },
        {
          name: 'robots',
          content: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
        },
        { name: 'author', content: 'kriz - https://brandsta.in' },
        { name: 'application-name', content: 'Brandsta' },

        // Local Geographic Coordinates (Koduvayur, Palakkad, Kerala)
        { name: 'geo.region', content: 'IN-KL' },
        { name: 'geo.placename', content: 'Koduvayur, Palakkad, Kerala' },
        { name: 'geo.position', content: '10.6975;76.6435' },
        { name: 'ICBM', content: '10.6975, 76.6435' },

        // Unified Brand Theme Hex (#02050e across all 4 places)
        { name: 'msapplication-TileColor', content: '#02050e' },
        { name: 'msapplication-TileImage', content: '/images/favicons/ms-icon-144x144.png' },
        { name: 'theme-color', content: '#02050e' },
        { name: 'msapplication-config', content: '/browserconfig.xml' },

        // Mobile & PWA Capabilities
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'Brandsta' },

        // Open Graph (1200x630 JPG)
        { property: 'og:type', content: 'website' },
        { property: 'og:locale', content: 'en_IN' },
        { property: 'og:site_name', content: 'Brandsta' },
        { property: 'og:image', content: 'https://brandsta.in/images/og/formation.jpg' },
        { property: 'og:image:secure_url', content: 'https://brandsta.in/images/og/formation.jpg' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:image:type', content: 'image/jpeg' },
        { property: 'og:image:alt', content: 'Brandsta — Something is forming.' },

        // Twitter / X Card
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:image', content: 'https://brandsta.in/images/og/formation.jpg' },
        { name: 'twitter:image:alt', content: 'Brandsta — Something is forming.' },
      ],

      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },

        // Apple Touch Icons
        { rel: 'apple-touch-icon', sizes: '57x57', href: '/images/favicons/apple-icon-57x57.png' },
        { rel: 'apple-touch-icon', sizes: '60x60', href: '/images/favicons/apple-icon-60x60.png' },
        { rel: 'apple-touch-icon', sizes: '72x72', href: '/images/favicons/apple-icon-72x72.png' },
        { rel: 'apple-touch-icon', sizes: '76x76', href: '/images/favicons/apple-icon-76x76.png' },
        { rel: 'apple-touch-icon', sizes: '114x114', href: '/images/favicons/apple-icon-114x114.png' },
        { rel: 'apple-touch-icon', sizes: '120x120', href: '/images/favicons/apple-icon-120x120.png' },
        { rel: 'apple-touch-icon', sizes: '144x144', href: '/images/favicons/apple-icon-144x144.png' },
        { rel: 'apple-touch-icon', sizes: '152x152', href: '/images/favicons/apple-icon-152x152.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/images/favicons/apple-icon-180x180.png' },
        { rel: 'apple-touch-icon', sizes: '167x167', href: '/images/favicons/apple-icon.png' },
        { rel: 'apple-touch-icon', sizes: '190x190', href: '/images/favicons/apple-icon-precomposed.png' },

        // Standard Favicons
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/images/favicons/favicon-16x16.png' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/images/favicons/favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '96x96', href: '/images/favicons/favicon-96x96.png' },
        { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/images/favicons/android-icon-192x192.png' },

        // Web Manifest
        { rel: 'manifest', crossorigin: 'use-credentials', href: '/manifest.json' },
      ],
    },
  },

  ssr: true,
  devtools: { enabled: false },
  devServer: {
    host: '0.0.0.0',
    port: 3005,
  },
})