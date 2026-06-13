'use client';

import dynamic from 'next/dynamic';

// ssr:false must live in a Client Component — page.tsx (Server) can't use it directly.
const AppShell = dynamic(() => import('@/components/AppShell'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-[#0B0F19]">
      <p className="text-sm text-zinc-500">초기화 중…</p>
    </div>
  ),
});

export default function ClientPage() {
  return <AppShell />;
}
