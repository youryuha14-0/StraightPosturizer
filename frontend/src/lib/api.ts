import type { MonitorConfig, SessionSummary } from '@/hooks/usePostureMonitor';

/**
 * Shared API layer for talking to the FastAPI backend.
 *
 * The backend speaks snake_case; the frontend hook/UI use camelCase MonitorConfig,
 * so the mapping helpers below translate between the two shapes in one place.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5000';

export interface BackendSettings {
  user_id: string;
  sensitivity: number;
  alert_delay: number;
  alert_visual: boolean;
  alert_audio: boolean;
  audio_type: string;
}

export interface SessionRecord {
  id?: number;
  user_id: string;
  start_time: string;
  end_time: string;
  total_duration: number;
  good_posture_duration: number;
  alert_count: number;
}

export interface HealthStatus {
  status: string;
  supabase_connected: boolean;
}

// --- shape mapping ---------------------------------------------------------

export function configToSettings(userId: string, c: MonitorConfig): BackendSettings {
  return {
    user_id: userId,
    sensitivity: c.sensitivity,
    alert_delay: c.alertDelay,
    alert_visual: c.alertVisual,
    alert_audio: c.alertAudio,
    audio_type: c.audioType,
  };
}

export function settingsToConfig(s: BackendSettings): MonitorConfig {
  return {
    sensitivity: s.sensitivity,
    alertDelay: s.alert_delay,
    alertVisual: s.alert_visual,
    alertAudio: s.alert_audio,
    audioType: s.audio_type,
  };
}

export function summaryToSession(userId: string, s: SessionSummary): SessionRecord {
  return {
    user_id: userId,
    start_time: s.startTime,
    end_time: s.endTime,
    total_duration: s.totalDuration,
    good_posture_duration: s.goodPostureDuration,
    alert_count: s.alertCount,
  };
}

// --- transport -------------------------------------------------------------

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`API ${path} failed (${res.status})${detail ? `: ${detail}` : ''}`);
  }
  return res.json() as Promise<T>;
}

export function getHealth(): Promise<HealthStatus> {
  return request<HealthStatus>('/api/health');
}

export function getSettings(userId: string): Promise<BackendSettings> {
  return request<BackendSettings>(`/api/settings/${encodeURIComponent(userId)}`);
}

export function saveSettings(settings: BackendSettings): Promise<unknown> {
  return request(`/api/settings/${encodeURIComponent(settings.user_id)}`, {
    method: 'POST',
    body: JSON.stringify(settings),
  });
}

export function saveSession(session: SessionRecord): Promise<unknown> {
  return request('/api/sessions', {
    method: 'POST',
    body: JSON.stringify(session),
  });
}

export function getSessions(userId: string): Promise<SessionRecord[]> {
  return request<SessionRecord[]>(`/api/sessions/${encodeURIComponent(userId)}`);
}
