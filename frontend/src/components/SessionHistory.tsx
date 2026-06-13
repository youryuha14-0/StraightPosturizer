'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { getSessions } from '@/lib/api';
import type { SessionRecord } from '@/lib/api';

interface DailyData {
  date: string;
  score: number | null;
  alerts: number;
}

function buildDailyData(sessions: SessionRecord[]): DailyData[] {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i)); // oldest → newest
    const isoDate = d.toISOString().split('T')[0];
    const dateLabel = `${d.getMonth() + 1}/${d.getDate()}`;

    const daySessions = sessions.filter((s) => s.start_time.startsWith(isoDate));

    const avgScore =
      daySessions.length > 0
        ? Math.round(
            daySessions.reduce(
              (sum, s) =>
                sum + (s.total_duration > 0 ? (s.good_posture_duration / s.total_duration) * 100 : 0),
              0,
            ) / daySessions.length,
          )
        : null;

    const totalAlerts = daySessions.reduce((sum, s) => sum + s.alert_count, 0);

    return { date: dateLabel, score: avgScore, alerts: totalAlerts };
  });
}

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}

function formatSessionDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const CHART_STYLE = {
  text: '#71717A',
  grid: 'rgba(255,255,255,0.04)',
  tooltipBg: '#111827',
  tooltipBorder: 'rgba(255,255,255,0.05)',
};

export default function SessionHistory({ userId }: { userId: string }) {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getSessions(userId)
      .then((data) => setSessions(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [userId]);

  const dailyData = useMemo(() => buildDailyData(sessions), [sessions]);

  // Aggregate summary stats
  const stats = useMemo(() => {
    if (sessions.length === 0) return null;
    const totalSec = sessions.reduce((s, r) => s + r.total_duration, 0);
    const goodSec = sessions.reduce((s, r) => s + r.good_posture_duration, 0);
    const totalAlerts = sessions.reduce((s, r) => s + r.alert_count, 0);
    const avgScore = Math.round((goodSec / Math.max(totalSec, 1)) * 100);
    return { totalSec, avgScore, totalAlerts, count: sessions.length };
  }, [sessions]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((n) => (
          <div key={n} className="glass-panel h-24 animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
        <p className="text-sm font-medium text-neonRed">기록을 불러오지 못했습니다</p>
        <p className="text-xs text-zinc-500">백엔드 서버가 실행 중인지 확인하세요.</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5">
          <ClipboardIcon />
        </div>
        <p className="text-sm font-medium text-zinc-300">아직 세션 기록이 없습니다</p>
        <p className="text-xs text-zinc-500">모니터링 탭에서 첫 세션을 시작해보세요.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Summary stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="총 세션" value={`${stats.count}회`} />
          <StatCard label="평균 점수" value={`${stats.avgScore}%`} color={stats.avgScore >= 70 ? '#10B981' : '#FBBF24'} />
          <StatCard label="누적 경고" value={`${stats.totalAlerts}회`} color={stats.totalAlerts === 0 ? '#10B981' : '#EF4444'} />
        </div>
      )}

      {/* Daily good posture % line chart */}
      <div className="glass-panel rounded-2xl p-5">
        <h2 className="mb-4 text-sm font-semibold text-zinc-200">일간 자세 점수 (%)</h2>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={dailyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_STYLE.grid} />
            <XAxis dataKey="date" tick={{ fill: CHART_STYLE.text, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: CHART_STYLE.text, fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: CHART_STYLE.tooltipBg, border: `1px solid ${CHART_STYLE.tooltipBorder}`, borderRadius: 8 }}
              labelStyle={{ color: '#9CA3AF', fontSize: 11 }}
              itemStyle={{ color: '#10B981', fontSize: 12 }}
              formatter={(v) => [v != null ? `${v}%` : '--', '바른 자세']}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#10B981"
              strokeWidth={2}
              dot={{ r: 3, fill: '#10B981', strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Daily alert count bar chart */}
      <div className="glass-panel rounded-2xl p-5">
        <h2 className="mb-4 text-sm font-semibold text-zinc-200">일간 경고 횟수</h2>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={dailyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_STYLE.grid} />
            <XAxis dataKey="date" tick={{ fill: CHART_STYLE.text, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fill: CHART_STYLE.text, fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: CHART_STYLE.tooltipBg, border: `1px solid ${CHART_STYLE.tooltipBorder}`, borderRadius: 8 }}
              labelStyle={{ color: '#9CA3AF', fontSize: 11 }}
              itemStyle={{ color: '#EF4444', fontSize: 12 }}
              formatter={(v) => [v != null ? `${v}회` : '--', '경고']}
            />
            <Bar dataKey="alerts" fill="#EF4444" fillOpacity={0.7} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Session list */}
      <div className="glass-panel rounded-2xl p-5">
        <h2 className="mb-4 text-sm font-semibold text-zinc-200">세션 목록</h2>
        <div className="flex flex-col divide-y divide-white/5">
          {[...sessions]
            .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
            .map((s, idx) => {
              const goodPct =
                s.total_duration > 0
                  ? Math.round((s.good_posture_duration / s.total_duration) * 100)
                  : 0;
              return (
                <div key={s.id ?? idx} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm text-zinc-200">{formatSessionDate(s.start_time)}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">{formatDuration(s.total_duration)}</p>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="text-xs text-zinc-500">바른 자세</p>
                      <p
                        className="text-sm font-semibold"
                        style={{ color: goodPct >= 70 ? '#10B981' : '#FBBF24' }}
                      >
                        {goodPct}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">경고</p>
                      <p
                        className="text-sm font-semibold"
                        style={{ color: s.alert_count === 0 ? '#10B981' : '#EF4444' }}
                      >
                        {s.alert_count}회
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="glass-panel rounded-2xl p-4 text-center">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold" style={{ color: color ?? '#F3F4F6' }}>
        {value}
      </p>
    </div>
  );
}

function ClipboardIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
    </svg>
  );
}
