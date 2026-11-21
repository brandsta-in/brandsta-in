// nuxt.config.ts
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  future: {
    compatibilityVersion: 4,
  },

  compatibilityDate: '2026-07-15',

  pages: true,

  // 1. Site Authority (Brandsta HQ — Formation Mode)
  site: {
    url: 'https://brandsta.in',
    name: 'Brandsta',
    indexable: true,
    env: 'production',
  },

  // 2. Tailwind CSS v4 via Vite + Lenis Pre-Bundling
  vite: {
    plugins: [
      tailwindcss(),
    ],
    optimizeDeps: {
      include: ['lenis'],
    },
  },

  // 3. Core, SEO & Vercel Telemetry Modules
  modules: [
    '@nuxt/fonts',
    'nuxt-site-config',
    '@nuxtjs/sitemap',
    '@nuxtjs/robots',
    '@vercel/speed-insights/nuxt',
    '@vercel/analytics/nuxt',
  ],

  // 4. Self-Hosted WOFF2 Typography (Inter Upright/Italic + Playfair Display Italic Ready)
  fonts: {
    defaults: {
      subsets: ['latin'],
      formats: ['woff2'],
    },
    families: [
      {
        name: 'Inter',
        provider: 'google',
        styles: ['normal'],
        weights: [400, 500, 600, 700],
        formats: ['woff2'],
        global: true,
        preload: true,
      },
      {
        name: 'Inter',
        provider: 'google',
        styles: ['italic'],
        weights: [400],
        formats: ['woff2'],
        global: true,
        preload: false,
      },
      {
        name: 'Playfair Display',
        provider: 'google',
        styles: ['italic'],
        weights: [400],
        formats: ['woff2'],
        global: true,
        preload: false,
      },
    ],
  },

  // 5. Zero-Runtime Sitemap Configuration
  sitemap: {
    zeroRuntime: true,
    urls: [
      { loc: '/', changefreq: 'daily', priority: 1.0 },
    ],
  },

  // 6. Open Crawler & AI Discovery Directives
  robots: {
    blockNonSeoBots: false,
    blockAiBots: false,
    allow: ['/'],
    disallow: [],
    sitemap: ['https://brandsta.in/sitemap.xml'],
  },

  // 7. Prerender & UTF-8 Agentic Header Rules
  routeRules: {
    '/robots.txt': { prerender: true },
    '/sitemap.xml': { prerender: true },
    '/llms.txt': {
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'public, max-age=3600, s-maxage=3600',
      },
    },
    '/': { prerender: true },
  },

  // 8. Nitro Compression & Crawler Prerendering
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

  // 9. Payload Extraction
  experimental: {
    payloadExtraction: true,
  },

  // 10. Master Stylesheet
  css: ['~/assets/css/main.css'],

  // 11. Inline Critical CSS for Zero Render-Blocking
  features: {
    inlineStyles: true,
  },

  // 12. Runtime Secrets Vault
  runtimeConfig: {
    resendApiKey: '',
    public: {
      siteUrl: 'https://brandsta.in',
    },
  },

  // 13. Global Head (Formation Favicons & #02050e Preserved Untouched)
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
        { name: 'author', content: 'Brandsta — https://brandsta.in' },
        { name: 'application-name', content: 'Brandsta' },

        // Official Brandsta Home Base Coordinates (Koduvayur, Palakkad, Kerala)
        { name: 'geo.region', content: 'IN-KL' },
        { name: 'geo.placename', content: 'Koduvayur, Palakkad, Kerala' },
        { name: 'geo.position', content: '10.684769;76.650758' },
        { name: 'ICBM', content: '10.684769, 76.650758' },

        // Formation Theme Hex (#02050e Preserved for This Branch)
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
        { property: 'og:title', content: 'Brandsta | Something is forming.' },
        {
          property: 'og:description',
          content: 'Something is forming. Every beginning carries a signal. Follow its journey.',
        },
        { property: 'og:image', content: 'https://brandsta.in/images/og/formation.jpg' },
        { property: 'og:image:secure_url', content: 'https://brandsta.in/images/og/formation.jpg' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:image:type', content: 'image/jpeg' },
        { property: 'og:image:alt', content: 'Brandsta — Something is forming.' },

        // Twitter / X Card
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'Brandsta | Something is forming.' },
        {
          name: 'twitter:description',
          content: 'Something is forming. Every beginning carries a signal. Follow its journey.',
        },
        { name: 'twitter:image', content: 'https://brandsta.in/images/og/formation.jpg' },
        { name: 'twitter:image:alt', content: 'Brandsta — Something is forming.' },
      ],

      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },

        // Apple Touch Icons (Formation Assets Untouched)
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

        // Standard Favicons (Formation Assets Untouched)
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