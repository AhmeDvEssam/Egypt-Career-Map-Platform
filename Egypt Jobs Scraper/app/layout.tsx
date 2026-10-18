import type { Metadata } from 'next';
import { Inter, Calistoga } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const calistoga = Calistoga({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-calistoga',
});

export const metadata: Metadata = {
  title: 'Egypt Career Map | Labor Market Intelligence',
  description:
    'Discover opportunities across Egypt. AI-powered job aggregation, skill gap analysis, and labor market intelligence for job seekers, recruiters, and strategic planners.',
  keywords: [
    'Egypt jobs',
    'career map',
    'labor market',
    'job aggregator',
    'Egypt employment',
    'skill gap analysis',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${calistoga.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
