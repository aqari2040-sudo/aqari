import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { localeDirection, type Locale } from '@/i18n/config';
import { QueryProvider } from '@/components/providers/query-provider';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Aqari — Property Management',
  description: 'Real Estate Property Management System - نظام إدارة العقارات',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.png',
    apple: '/icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Aqari',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1A1A1A',
};

export default async function RootLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const messages = await getMessages();
  const dir = localeDirection[locale as Locale] || 'ltr';

  return (
    <html lang={locale} dir={dir}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Aqari" />
        <link rel="apple-touch-icon" href="/icon.png" />
      </head>
      <body
        className={dir === 'rtl' ? 'font-arabic' : 'font-sans'}
        suppressHydrationWarning
      >
        <NextIntlClientProvider messages={messages}>
          <QueryProvider>
            {children}
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
