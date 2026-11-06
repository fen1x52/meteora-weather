import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import { AppShell } from '@/components/app-shell';
import 'leaflet/dist/leaflet.css';
import './globals.css';
import './meteora-2.css';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
export const metadata: Metadata = { title: { default: 'Meteora — погода в вашем ритме', template: '%s · Meteora' }, description: 'Погода, атмосфера и природные явления. Прогноз на 14 дней, интерактивные карты, качество воздуха и астрономия на реальных данных.', applicationName: 'Meteora', icons: { icon: `${basePath}/icon.svg` } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ru" suppressHydrationWarning><body><Providers><AppShell>{children}</AppShell></Providers></body></html>; }


