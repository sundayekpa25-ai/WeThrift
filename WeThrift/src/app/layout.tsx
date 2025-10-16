import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'WeThrift - Community Thrift Platform',
  description: 'A comprehensive platform for community and formal thrift groups implementing savings, loans, and dynamic financial products. Accessible via USSD, mobile app, and web portal.',
  keywords: 'thrift, savings, loans, community, Nigeria, USSD, mobile app, financial services',
  authors: [{ name: 'WeThrift Team' }],
  creator: 'WeThrift',
  publisher: 'WeThrift',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'WeThrift - Community Thrift Platform',
    description: 'A comprehensive platform for community and formal thrift groups implementing savings, loans, and dynamic financial products.',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    siteName: 'WeThrift',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'WeThrift - Community Thrift Platform',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WeThrift - Community Thrift Platform',
    description: 'A comprehensive platform for community and formal thrift groups implementing savings, loans, and dynamic financial products.',
    images: ['/twitter-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
