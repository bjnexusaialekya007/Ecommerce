import type { ClientConfig } from './schema';
import { clientConfig } from './client.config';

/**
 * Second brand used by `?client=demo` (A3.4) and template for new clients (N1).
 * Intentionally carries machine-detectable placeholders (`REPLACE_ME`, `example.com`,
 * `+91 00000 00000`, `910000000000`) so `check:client` and `/dev/checks` demonstrate
 * placeholder warnings and `CLIENT_STRICT=1` rejection.
 */
export const clientDemoConfig: ClientConfig = {
  ...clientConfig,
  id: 'demo',
  brand: {
    name: 'Deccan Spice & Farsan',
    shortName: 'DeccanFarsan',
    tagline: 'Hand-roasted coastal snacks & festive farsan boxes',
    logo: '/favicon.svg',
  },
  theme: {
    bg: '#F8FAF8',
    surface: '#FFFFFF',
    surfaceLow: '#F1F6F3',
    surface2: '#EBF2EE',
    surfaceHigh: '#E2ECE6',
    surfaceVariant: '#D8E5DD',
    ink: '#17231C',
    inkMuted: '#4A5D52',
    primary: '#0F6248',
    primaryContainer: '#0F6248',
    primaryHover: '#0A4B37',
    accent: '#4D6B53',
    accentSoft: '#D5EBD9',
    secondary: '#4D6B53',
    secondaryContainer: '#D5EBD9',
    onSecondaryContainer: '#173A24',
    border: '#7C8E82',
    borderSoft: '#CBD8CE',
  },
  fonts: {
    display: "'Fraunces', Georgia, serif",
    sans: "'DM Sans', system-ui, sans-serif",
  },
  contact: {
    ...clientConfig.contact,
    phone: '+91 00000 00000',
    email: 'hello@example.com',
    address: 'REPLACE_ME, Vijayawada, Andhra Pradesh 520001',
    addressParts: {
      line1: 'REPLACE_ME',
      area: 'Governorpet',
      city: 'Vijayawada',
      state: 'Andhra Pradesh',
      pincode: '520001',
      country: 'IN',
    },
    mapUrl: 'https://www.google.com/maps/dir/?api=1&destination=16.5062,80.6480',
    lat: 16.5062,
    lng: 80.6480,
  },
  whatsapp: {
    ...clientConfig.whatsapp,
    number: '910000000000',
  },
  social: [
    { platform: 'instagram', url: 'https://www.instagram.com/REPLACE_ME/', handle: '@REPLACE_ME' },
    { platform: 'facebook', url: 'https://www.facebook.com/REPLACE_ME/' },
  ],
  legal: {
    ...clientConfig.legal,
    gstin: 'REPLACE_ME',
    fssai: 'REPLACE_ME',
    stateCode: '37',
    legalName: 'Deccan Spice Foods LLP',
    manufacturerAddress: 'REPLACE_ME, Vijayawada, Andhra Pradesh 520001',
  },
  seo: {
    ...clientConfig.seo,
    siteUrl: 'https://example.com',
    titleTemplate: '%s | Deccan Spice & Farsan',
    homeTitle: 'Deccan Spice & Farsan | Hand-Roasted Snacks',
    sameAs: [],
  },
  features: {
    ...clientConfig.features,
    pwa: false,
  },
  experience: {
    ...clientConfig.experience,
    hero: '3d',
    heroModelUrl: '',
  },
  adminAllowlist: ['owner@example.com'],
};
