import type { MonitorConfig } from '@/hooks/usePostureMonitor';

interface SettingsPanelProps {
  config: MonitorConfig;
  onChange: (next: MonitorConfig) => void;
  disabled?: boolean;
}

const AUDIO_TYPES: { value: string; label: string }[] = [
  { value: 'bell', label: '벨' },
  { value: 'digital', label: '디지털' },
  { value: 'ambient', label: '앰비언트' },
];

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between py-1">
      <span className="text-sm text-zinc-300">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${
          checked ? 'bg-neonCyan/80' : 'bg-white/10'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  );
}

/**
 * User-facing controls for posture sensitivity and alert behaviour.
 * Purely controlled — the parent owns config state and persistence.
 */
export default function SettingsPanel({ config, onChange, disabled = false }: SettingsPanelProps) {
  const update = (patch: Partial<MonitorConfig>) => onChange({ ...config, ...patch });

  return (
    <div className={`glass-panel rounded-2xl p-5 ${disabled ? 'opacity-60' : ''}`}>
      <h2 className="mb-4 text-sm font-semibold tracking-tight text-zinc-200">설정</h2>

      <fieldset disabled={disabled} className="space-y-5">
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm text-zinc-300">민감도</label>
            <span className="text-sm font-medium text-neonCyan">{config.sensitivity}</span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={config.sensitivity}
            onChange={(e) => update({ sensitivity: Number(e.target.value) })}
            className="w-full accent-neonCyan"
          />
          <p className="mt-1 text-xs text-zinc-500">높을수록 작은 흐트러짐에도 민감하게 반응합니다.</p>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm text-zinc-300">경고 지연</label>
            <span className="text-sm font-medium text-neonCyan">{config.alertDelay}초</span>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={config.alertDelay}
            onChange={(e) => update({ alertDelay: Number(e.target.value) })}
            className="w-full accent-neonCyan"
          />
          <p className="mt-1 text-xs text-zinc-500">나쁜 자세가 이 시간 이상 유지되면 경고합니다.</p>
        </div>

        <div className="space-y-1 border-t border-white/5 pt-3">
          <Toggle
            label="시각 경고"
            checked={config.alertVisual}
            onChange={(v) => update({ alertVisual: v })}
          />
          <Toggle
            label="오디오 경고"
            checked={config.alertAudio}
            onChange={(v) => update({ alertAudio: v })}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-zinc-300">알림음</label>
          <div className="grid grid-cols-3 gap-2">
            {AUDIO_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => update({ audioType: t.value })}
                className={`rounded-lg border px-2 py-1.5 text-xs transition-colors ${
                  config.audioType === t.value
                    ? 'border-neonCyan/60 bg-neonCyan/10 text-neonCyan'
                    : 'border-white/10 text-zinc-400 hover:border-white/20'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </fieldset>
    </div>
  );
}
