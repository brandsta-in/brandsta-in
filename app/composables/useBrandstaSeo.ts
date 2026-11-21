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
const BRANDSTA_CC_URL = 'https://brandsta.cc'
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
        slogan: 'We make waves. Signature Branding. Amplified.',
        foundingDate: '2021',
        taxID: '32DXCPK0141J1ZX',
        url: `${SITE_URL}/`,
        email: 'hello@brandsta.in',
        telephone: '+91-81290-12205',
        description:
          'Brandsta (Brandsta Interactive) amplifies digital identities through brand strategy, visual and motion identity, high-performance web and app experiences, technical and AI visibility, digital growth, and custom code systems.',
        image: DEFAULT_OG_IMAGE,
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Koduvayur, Palakkad',
          addressRegion: 'Kerala',
          postalCode: '678501',
          addressCountry: 'IN',
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: 10.684769,
          longitude: 76.650758,
        },
        areaServed: [
          { '@type': 'AdministrativeArea', name: 'Kerala' },
          { '@type': 'Country', name: 'India' },
          'Worldwide',
        ],
        contactPoint: [
          {
            '@type': 'ContactPoint',
            contactType: 'customer support',
            telephone: '+91-81290-12205',
            email: 'hello@brandsta.in',
            areaServed: ['IN', 'Worldwide'],
            availableLanguage: ['English', 'Malayalam', 'Hindi'],
          },
        ],
        sameAs: [
          'https://www.instagram.com/brandsta.in',
          `${BRANDSTA_CC_URL}/`,
          'https://wa.me/918129012205',
        ],
        subOrganization: {
          '@type': 'Organization',
          '@id': `${BRANDSTA_CC_URL}/#organization`,
          name: 'Brandsta — Custom Code',
          url: `${BRANDSTA_CC_URL}/`,
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: 'Brandsta',
        description: DEFAULT_DESCRIPTION,
        inLanguage: 'en-IN',
        publisher: {
          '@id': `${SITE_URL}/#organization`,
        },
      },
      {
        '@type': 'WebPage',
        '@id': `${canonicalUrl.value}#webpage`,
        url: canonicalUrl.value,
        name: pageTitle,
        description: pageDescription,
        inLanguage: 'en-IN',
        isPartOf: {
          '@id': `${SITE_URL}/#website`,
        },
        about: {
          '@id': `${SITE_URL}/#organization`,
        },
        primaryImageOfPage: {
          '@type': 'ImageObject',
          url: ogImage,
          width: 1200,
          height: 630,
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