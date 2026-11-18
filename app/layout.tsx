import type {Metadata, Viewport} from 'next';
import {Cinzel, EB_Garamond} from 'next/font/google';
import './globals.css';

const display = Cinzel({subsets: ['latin'], variable: '--font-display', display: 'swap'});
const body = EB_Garamond({subsets: ['latin'], variable: '--font-body', display: 'swap'});

export const metadata: Metadata = {
  title: 'The Hollow Hearth — a tavern for good music',
  description: 'Songs Redditors keep recommending, a fire to sit by, and an inn that never closes.',
};
export const viewport: Viewport = {themeColor: '#1a110b'};

export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return <html lang="en" className={`${display.variable} ${body.variable}`}><body>{children}</body></html>;
}
