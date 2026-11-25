// nuxt.config.ts
import tailwindcss from '@tailwindcss/vite'

const SITE_URL = 'https://brandsta.in'
const SEO_TITLE = 'Brandsta | Digital Branding & Interactive Web Experiences'
const SEO_DESCRIPTION =
  'Brandsta is a creative studio that builds distinctive digital identities, interactive websites and custom tools, and helps brands get seen and grow.'
const OG_TITLE = 'Brandsta | Signature Branding. Amplified.'
const OG_DESCRIPTION =
  'We amplify digital identities through strategy, creativity and technology. Bring us the dream. Let’s build what’s next, together.'
const OG_IMAGE_URL = 'https://brandsta.in/images/og/emerge.jpg'
const OG_IMAGE_ALT =
  'Brandsta’s silver resonator with a blue waveform above the words “We Make Waves” and “Signature Branding. Amplified.”'

export default defineNuxtConfig({
  future: {
    compatibilityVersion: 4,
  },

  compatibilityDate: '2026-07-15',

  pages: true,

  // 1. Site Authority (Brandsta HQ — Live Production Mode)
  site: {
    url: SITE_URL,
    name: 'Brandsta',
    description: SEO_DESCRIPTION,
    defaultLocale: 'en',
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

  // 4. Self-Hosted WOFF2 Typography (Inter Upright/Italic + Playfair Display Italic)
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
      { loc: '/', changefreq: 'weekly', priority: 1.0 },
      { loc: '/formation', changefreq: 'monthly', priority: 0.8 },
    ],
  },

  // 6. Open Crawler & AI Discovery Directives
  robots: {
    blockNonSeoBots: false,
    blockAiBots: false,
    allow: ['/'],
    disallow: [],
    sitemap: [`${SITE_URL}/sitemap.xml`],
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
    '/formation': { prerender: true },
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
        '/formation',
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
      siteUrl: SITE_URL,
    },
  },

  // 13. Global Production Head
  app: {
    baseURL: '/',
    pageTransition: {
      name: 'page',
      mode: 'out-in',
    },
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      title: SEO_TITLE,

      htmlAttrs: {
        lang: 'en',
      },

      meta: [
        {
          name: 'description',
          content: SEO_DESCRIPTION,
        },
        {
          name: 'robots',
          content: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
        },
        { name: 'author', content: 'Brandsta Interactive — https://brandsta.in' },
        { name: 'application-name', content: 'Brandsta Interactive' },

        // Official Brandsta Home Base Coordinates (Koduvayur, Palakkad, Kerala)
        { name: 'geo.region', content: 'IN-KL' },
        { name: 'geo.placename', content: 'Koduvayur, Palakkad, Kerala' },
        { name: 'geo.position', content: '10.684769;76.650758' },
        { name: 'ICBM', content: '10.684769, 76.650758' },

        // Icon Tile Surface (#171718) & Seamless Browser Chrome (#02050e)
        { name: 'msapplication-TileColor', content: '#171718' },
        { name: 'msapplication-TileImage', content: '/images/favicons/ms-icon-144x144.png' },
        { name: 'msapplication-config', content: '/browserconfig.xml' },
        { name: 'theme-color', content: '#02050e' },

        // Mobile & PWA Capabilities
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'Brandsta' },

        // Open Graph (1200x630 JPG — /images/og/emerge.jpg)
        { property: 'og:type', content: 'website' },
        { property: 'og:locale', content: 'en_IN' },
        { property: 'og:site_name', content: 'Brandsta' },
        { property: 'og:url', content: SITE_URL },
        { property: 'og:title', content: OG_TITLE },
        { property: 'og:description', content: OG_DESCRIPTION },
        { property: 'og:image', content: OG_IMAGE_URL },
        { property: 'og:image:secure_url', content: OG_IMAGE_URL },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:image:type', content: 'image/jpeg' },
        { property: 'og:image:alt', content: OG_IMAGE_ALT },

        // X / Twitter Card (Matches Open Graph 1:1)
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: OG_TITLE },
        { name: 'twitter:description', content: OG_DESCRIPTION },
        { name: 'twitter:image', content: OG_IMAGE_URL },
        { name: 'twitter:image:alt', content: OG_IMAGE_ALT },
      ],

      link: [
        // 1. Lean Legacy .ico & Safari Tab Fallbacks (Strictly 16x16 & 32x32 — ~4KB)
        { rel: 'icon', type: 'image/x-icon', sizes: '16x16 32x32', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/images/favicons/favicon-16x16.png' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/images/favicons/favicon-32x32.png' },

        // 2. Live Adaptive Light/Dark Vector Tab Icon (Scoped to 16/32 so Googlebot >=48px picks Opaque #171718 PNGs)
        { rel: 'icon', type: 'image/svg+xml', sizes: '16x16 32x32', href: '/favicon.svg' },

        // 3. Google Search Opaque Padded Icons (#171718 Multiples of 48px)
        { rel: 'icon', type: 'image/png', sizes: '48x48', href: '/images/favicons/favicon-48x48.png' },
        { rel: 'icon', type: 'image/png', sizes: '96x96', href: '/images/favicons/favicon-96x96.png' },
        { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/images/favicons/android-icon-192x192.png' },

        // 4. Apple Touch Icons (Opaque #171718)
        { rel: 'apple-touch-icon', sizes: '57x57', href: '/images/favicons/apple-icon-57x57.png' },
        { rel: 'apple-touch-icon', sizes: '60x60', href: '/images/favicons/apple-icon-60x60.png' },
        { rel: 'apple-touch-icon', sizes: '72x72', href: '/images/favicons/apple-icon-72x72.png' },
        { rel: 'apple-touch-icon', sizes: '76x76', href: '/images/favicons/apple-icon-76x76.png' },
        { rel: 'apple-touch-icon', sizes: '114x114', href: '/images/favicons/apple-icon-114x114.png' },
        { rel: 'apple-touch-icon', sizes: '120x120', href: '/images/favicons/apple-icon-120x120.png' },
        { rel: 'apple-touch-icon', sizes: '144x144', href: '/images/favicons/apple-icon-144x144.png' },
        { rel: 'apple-touch-icon', sizes: '152x152', href: '/images/favicons/apple-icon-152x152.png' },
        { rel: 'apple-touch-icon', sizes: '167x167', href: '/images/favicons/apple-icon.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/images/favicons/apple-icon-180x180.png' },
        { rel: 'apple-touch-icon', sizes: '190x190', href: '/images/favicons/apple-icon-precomposed.png' },

        // 5. Web App Manifest
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