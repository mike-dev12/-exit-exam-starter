import './globals.css';

export const metadata = {
  title: 'Biomedical Exit Exam Prep',
  description: 'Practice platform for final-year biomedical exit exams',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
