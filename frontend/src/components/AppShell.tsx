'use client';

import { useState } from 'react';
import PostureMonitor from '@/components/PostureMonitor';
import SessionHistory from '@/components/SessionHistory';
import { getLocalUserSession, setLocalUserSession } from '@/utils/supabase';

type Tab = 'monitor' | 'history';

// Runs client-only (this component is imported with ssr:false in page.tsx)
function resolveUserId(): string {
  let session = getLocalUserSession();
  if (!session) {
    const uid =
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    session = { id: `local-${uid}`, email: 'local@mock.dev', isMock: true };
    setLocalUserSession(session);
  }
  return session.id;
}

export default function AppShell() {
  const [tab, setTab] = useState<Tab>('monitor');
  // Lazy initializer — safe here because ssr:false guarantees client-only execution
  const [userId] = useState<string>(resolveUserId);

  return (
    <div className="flex min-h-screen flex-col bg-darkBg text-zinc-100">
      {/* Sticky header with tab navigation */}
      <header className="sticky top-0 z-10 border-b border-white/5 bg-darkBg/90 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div>
            <span className="text-lg font-bold tracking-tight text-white">
              Straight<span className="text-neonCyan">Posturizer</span>
            </span>
            <p className="text-[10px] text-zinc-600">실시간 자세 모니터링</p>
          </div>
          <nav className="flex gap-1 rounded-xl bg-white/5 p-1">
            {(['monitor', 'history'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  tab === t
                    ? 'bg-neonCyan/10 text-neonCyan'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {t === 'monitor' ? '모니터링' : '기록'}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-5">
        {tab === 'monitor' ? (
          <PostureMonitor userId={userId} />
        ) : (
          <SessionHistory userId={userId} />
        )}
      </main>
    </div>
  );
}
