import './globals.css';
import { Toaster } from '@/components/ui/sonner';

export const metadata = {
  title: '3rd APFA INT GOLD CUP 2026 - TDL Bylakuppe',
  description: 'Official live tournament hub for the 3rd APFA INT Gold Cup 2026. Group standings, knockout bracket and live scores.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0b0e1a] text-slate-100 antialiased">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
