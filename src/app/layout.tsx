import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pulso Eleitoral | Apuração 2026',
  description: 'Acompanhe a apuração presidencial de 2026 com dados oficiais do TSE por estado.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
