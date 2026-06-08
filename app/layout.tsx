import type { ReactNode } from 'react';

export const metadata = {
  title: 'Signal Brain',
  description: 'A ruthless attention-filter for AI-dev content.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
