import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  // /api/* is proxied by app/api/[...path]/route.ts so Set-Cookie reaches the browser in production.
};

export default withNextIntl(nextConfig);
