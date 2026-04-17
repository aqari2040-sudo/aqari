import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { localeDirection, type Locale } from '@/i18n/config';
import { QueryProvider } from '@/components/providers/query-provider';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Aqari — Property Management',
  description: 'Real Estate Property Management System',
  icons: {
    icon: '/favicon.png',
    apple: '/icon.png',
  },
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
