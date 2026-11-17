// app/composables/useBrandstaSeo.ts
import { computed } from 'vue'
import { useHead, useSeoMeta, useRoute } from 'nuxt/app'

export interface BrandstaSeoOptions {
  title?: string
  description?: string
  image?: string
  imageAlt?: string
  type?: 'website' | 'article'
}

const SITE_URL = 'https://brandsta.in'
const DEFAULT_TITLE = 'Brandsta | Something is forming.'
const DEFAULT_DESCRIPTION = 'Something is forming. Every beginning carries a signal. Follow its journey.'
const DEFAULT_OG_IMAGE = `${SITE_URL}/images/og/formation.jpg`
const DEFAULT_OG_ALT = 'Brandsta — Something is forming.'

export function useBrandstaSeo(options: BrandstaSeoOptions = {}) {
  const route = useRoute()

  const canonicalUrl = computed(() => {
    const cleanPath = (route.path || '/').split('?')[0]?.split('#')[0] || '/'
    if (cleanPath === '/') {
      return `${SITE_URL}/`
    }
    return `${SITE_URL}${cleanPath.replace(/\/+$/, '')}`
  })

  const pageTitle = options.title || DEFAULT_TITLE
  const pageDescription = options.description || DEFAULT_DESCRIPTION
  const ogImage = options.image || DEFAULT_OG_IMAGE
  const ogAlt = options.imageAlt || DEFAULT_OG_ALT
  const ogType = options.type || 'website'

  useSeoMeta({
    title: pageTitle,
    description: pageDescription,
    ogTitle: pageTitle,
    ogDescription: pageDescription,
    ogUrl: canonicalUrl,
    ogType,
    ogSiteName: 'Brandsta',
    ogLocale: 'en_IN',
    ogImage,
    ogImageSecureUrl: ogImage,
    ogImageWidth: 1200,
    ogImageHeight: 630,
    ogImageType: 'image/jpeg',
    ogImageAlt: ogAlt,
    twitterCard: 'summary_large_image',
    twitterTitle: pageTitle,
    twitterDescription: pageDescription,
    twitterImage: ogImage,
    twitterImageAlt: ogAlt,
  })

  const schemaGraph = computed(() => ({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['Organization', 'ProfessionalService'],
        '@id': `${SITE_URL}/#organization`,
        name: 'Brandsta',
        legalName: 'Brandsta Interactive',
        url: `${SITE_URL}/`,
        email: 'hello@brandsta.in',
        description: DEFAULT_DESCRIPTION,
        image: DEFAULT_OG_IMAGE,
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Koduvayur, Palakkad',
          addressRegion: 'Kerala',
          addressCountry: 'IN',
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: 10.6975,
          longitude: 76.6435,
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: 'Brandsta',
        description: DEFAULT_DESCRIPTION,
        publisher: {
          '@id': `${SITE_URL}/#organization`,
        },
      },
      {
        '@type': 'CreativeWork',
        '@id': `${canonicalUrl.value}#signal`,
        url: canonicalUrl.value,
        name: pageTitle,
        description: pageDescription,
        creator: {
          '@id': `${SITE_URL}/#organization`,
        },
      },
    ],
  }))

  useHead({
    link: [
      {
        rel: 'canonical',
        href: canonicalUrl,
      },
    ],
    meta: [
      {
        name: 'twitter:url',
        content: canonicalUrl,
      },
    ],
    script: [
      {
        type: 'application/ld+json',
        key: 'brandsta-jsonld',
        innerHTML: computed(() => JSON.stringify(schemaGraph.value)),
      },
    ],
  })
}