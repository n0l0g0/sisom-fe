import {NextIntlClientProvider} from 'next-intl';
import {getMessages, setRequestLocale} from 'next-intl/server';
import ClientLayout from '@/components/ClientLayout';
import "../globals.css";

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;
  // Enable static rendering
  setRequestLocale(locale);
  
  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();
 
  return (
    <html lang={locale} suppressHydrationWarning>
      <NextIntlClientProvider messages={messages}>
        <ClientLayout>{children}</ClientLayout>
      </NextIntlClientProvider>
    </html>
  );
}

export function generateStaticParams() {
  return [{locale: 'en'}, {locale: 'th'}];
}
