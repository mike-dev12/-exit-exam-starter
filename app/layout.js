import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import TopNav from './components/TopNav';

const heading = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-heading',
  display: 'swap',
});

const sans = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata = {
  title: 'BioPath — Biomedical Engineering Exit Exam Preparation',
  description:
    'Course-mapped practice questions and mock exams for final-year biomedical engineering students preparing for their exit exam.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${heading.variable} ${sans.variable}`}>
      <body>
        <TopNav />
        {children}
      </body>
    </html>
  );
}
