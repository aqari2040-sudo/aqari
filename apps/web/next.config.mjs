import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import createNextIntlPlugin from 'next-intl/plugin';

const __dirname = dirname(fileURLToPath(import.meta.url));
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
  transpilePackages: ['@aqari/shared'],
  webpack: (config) => {
    config.resolve.alias['@'] = resolve(__dirname, 'src');
    return config;
  },
};

export default withNextIntl(nextConfig);
