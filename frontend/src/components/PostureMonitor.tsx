'use client';

import { useState, useCallback } from 'react';
import { usePostureMonitor, MonitorConfig } from '@/hooks/usePostureMonitor';
import { saveSession, saveSettings, getSettings, summaryToSession, configToSettings, settingsToConfig } from '@/lib/api';
import ScoreCard from '@/components/ScoreCard';
import SettingsPanel from '@/components/SettingsPanel';

const DEFAULT_CONFIG: MonitorConfig = {
  sensitivity: 5,
  alertDelay: 3,
  alertVisual: true,
  alertAudio: true,
  audioType: 'bell',
};

const MOCK_USER_ID = 'local-user';

interface SessionSummaryView {
  totalDuration: number;
  goodPostureDuration: number;
  alertCount: number;
}

export default function PostureMonitor() {
  const [config, setConfig] = useState<MonitorConfig>(DEFAULT_CONFIG);
  const [showSettings, setShowSettings] = useState(false);
  const [lastSession, setLastSession] = useState<SessionSummaryView | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const {
    isLoaded,
    loadError,
    isAnalyzing,
    cameraError,
    calibrationData,
    metrics,
    isAlertActive,
    alertCount,
    videoRef,
    canvasRef,
    startMonitoring,
    stopMonitoring,
    calibrate,
  } = usePostureMonitor(config);

  const handleStart = useCallback(async () => {
    setLastSession(null);
    // 시작 전 백엔드에서 저장된 설정 불러오기
    try {
      const saved = await getSettings(MOCK_USER_ID);
      setConfig(settingsToConfig(saved));
    } catch {
      // 백엔드 없을 때는 현재 설정 그대로 사용
    }
    await startMonitoring();
  }, [startMonitoring]);

  const handleStop = useCallback(async () => {
    const summary = stopMonitoring();
    setLastSession({
      totalDuration: summary.totalDuration,
      goodPostureDuration: summary.goodPostureDuration,
      alertCount: summary.alertCount,
    });

    setIsSaving(true);
    try {
      await saveSession(summaryToSession(MOCK_USER_ID, summary));
    } catch {
      // 저장 실패는 조용히 무시 (mock 모드에서도 응답은 옴)
    } finally {
      setIsSaving(false);
    }
  }, [stopMonitoring]);

  const handleConfigChange = useCallback(async (next: MonitorConfig) => {
    setConfig(next);
    try {
      await saveSettings(configToSettings(MOCK_USER_ID, next));
    } catch {
      // 설정 저장 실패 무시
    }
  }, []);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}분 ${s}초`;
  };

  const goodPercent = lastSession && lastSession.totalDuration > 0
    ? Math.round((lastSession.goodPostureDuration / lastSession.totalDuration) * 100)
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-darkBg px-4 py-6 text-zinc-100">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Straight<span className="text-neonCyan">Posturizer</span>
          </h1>
          <p className="text-xs text-zinc-500">실시간 자세 모니터링</p>
        </div>
        <button
          onClick={() => setShowSettings((v) => !v)}
          className="rounded-xl border border-white/10 px-3 py-1.5 text-xs text-zinc-400 transition hover:border-neonCyan/30 hover:text-neonCyan"
        >
          {showSettings ? '닫기' : '설정'}
        </button>
      </header>

      {/* Settings panel */}
      {showSettings && (
        <div className="mb-5">
          <SettingsPanel
            config={config}
            onChange={handleConfigChange}
            disabled={isAnalyzing}
          />
        </div>
      )}

      {/* Camera + canvas feed */}
      <div className="relative mb-5 w-full overflow-hidden rounded-2xl bg-black/40 aspect-video">
        {/* Hidden video element — MediaPipe reads from this */}
        <video
          ref={videoRef}
          className="hidden"
          muted
          playsInline
        />

        {/* Canvas is what the user actually sees (video + skeleton overlay) */}
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="h-full w-full object-contain"
        />

        {/* Visual alert overlay */}
        {isAlertActive && config.alertVisual && (
          <div className="pointer-events-none absolute inset-0 animate-pulse rounded-2xl border-4 border-neonRed/70" />
        )}

        {/* Placeholder states shown over the canvas */}
        {!isAnalyzing && !cameraError && !loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            {isLoaded ? (
              <>
                <div className="h-12 w-12 rounded-full border-2 border-white/10 bg-white/5 flex items-center justify-center">
                  <CameraIcon />
                </div>
                <p className="text-sm text-zinc-400">
                  {calibrationData ? '세션이 종료됐습니다' : '시작 버튼을 눌러 모니터링을 시작하세요'}
                </p>
              </>
            ) : (
              <p className="text-sm text-zinc-500">MediaPipe 로드 중…</p>
            )}
          </div>
        )}

        {/* Camera permission denied */}
        {cameraError === 'camera-denied' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
            <p className="text-sm font-medium text-neonRed">카메라 권한이 거부됐습니다</p>
            <p className="text-xs text-zinc-400">
              브라우저 주소창의 카메라 아이콘을 클릭해 권한을 허용한 뒤 다시 시도하세요.
            </p>
          </div>
        )}

        {cameraError === 'camera-failed' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
            <p className="text-sm font-medium text-neonRed">카메라를 시작할 수 없습니다</p>
            <p className="text-xs text-zinc-400">카메라가 다른 앱에서 사용 중이거나 연결되지 않았습니다.</p>
          </div>
        )}

        {/* MediaPipe load failed */}
        {loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
            <p className="text-sm font-medium text-neonRed">모델 로드에 실패했습니다</p>
            <p className="text-xs text-zinc-400">네트워크 연결을 확인한 뒤 페이지를 새로고침하세요.</p>
          </div>
        )}

        {/* Calibration nudge */}
        {isAnalyzing && !calibrationData && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1.5 text-xs text-neonCyan backdrop-blur-sm">
            바른 자세로 앉은 뒤 캘리브레이션 버튼을 눌러주세요
          </div>
        )}

        {/* Alert count badge */}
        {isAnalyzing && alertCount > 0 && (
          <div className="absolute right-3 top-3 rounded-full bg-neonRed/80 px-2.5 py-0.5 text-xs font-semibold text-white">
            경고 {alertCount}회
          </div>
        )}
      </div>

      {/* Score cards */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ScoreCard label="종합 점수" score={metrics?.overallScore ?? null} primary />
        <div className="grid grid-cols-3 gap-3 sm:col-span-1">
          <ScoreCard label="거북목" score={metrics?.turtleNeckScore ?? null} />
          <ScoreCard label="어깨 대칭" score={metrics?.shoulderSymmetryScore ?? null} />
          <ScoreCard label="구부정" score={metrics?.slumpScore ?? null} />
        </div>
      </div>

      {/* Control buttons */}
      <div className="mb-5 flex gap-3">
        {!isAnalyzing ? (
          <button
            onClick={handleStart}
            disabled={!isLoaded || loadError}
            className="flex-1 rounded-2xl bg-neonCyan/90 py-3 text-sm font-semibold text-darkBg transition hover:bg-neonCyan disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLoaded ? '시작' : '로딩 중…'}
          </button>
        ) : (
          <>
            <button
              onClick={handleStop}
              className="flex-1 rounded-2xl border border-neonRed/40 py-3 text-sm font-semibold text-neonRed transition hover:bg-neonRed/10"
            >
              {isSaving ? '저장 중…' : '종료'}
            </button>
            <button
              onClick={calibrate}
              className="rounded-2xl border border-neonCyan/30 px-5 py-3 text-sm text-neonCyan transition hover:bg-neonCyan/10"
            >
              캘리브레이션
            </button>
          </>
        )}
      </div>

      {/* Session summary */}
      {lastSession && (
        <div className="glass-panel-neon rounded-2xl p-5">
          <h2 className="mb-3 text-sm font-semibold text-zinc-200">마지막 세션 요약</h2>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-zinc-500">총 시간</p>
              <p className="mt-1 text-base font-semibold text-white">
                {formatDuration(lastSession.totalDuration)}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">바른 자세</p>
              <p className="mt-1 text-base font-semibold" style={{ color: goodPercent && goodPercent >= 70 ? '#10B981' : '#FBBF24' }}>
                {goodPercent !== null ? `${goodPercent}%` : '--'}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">경고 횟수</p>
              <p className="mt-1 text-base font-semibold" style={{ color: lastSession.alertCount === 0 ? '#10B981' : '#EF4444' }}>
                {lastSession.alertCount}회
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CameraIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
      <path d="M23 7l-7 5 7 5V7z" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}
