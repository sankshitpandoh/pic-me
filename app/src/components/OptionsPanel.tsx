import { useId, useMemo, useState } from 'react'
import type { ConvertOptions } from '../types'


type Props = {
  value: ConvertOptions
  onChange: (value: ConvertOptions) => void
  currentMime?: string
}

export default function OptionsPanel({ value, onChange, currentMime }: Props) {
  const idQuality = useId()
  const idMaxW = useId()
  const idMaxH = useId()
  const idFit = useId()
  const idBg = useId()
  const [linkDims, setLinkDims] = useState(false)

  function update(partial: Partial<ConvertOptions>) {
    onChange({ ...value, ...partial })
  }

  const svgLike = currentMime === 'image/svg+xml' || currentMime === 'image/svg'
  const isPng = currentMime === 'image/png'
  const isJpeg = currentMime === 'image/jpeg'
  const isWebp = currentMime === 'image/webp'

  const fmts: Array<{ key: ConvertOptions['targetFormat']; label: string; disabled?: boolean }> = [
    { key: 'base64', label: 'BASE64', disabled: false },
    { key: 'png', label: 'PNG', disabled: !!currentMime && isPng },
    { key: 'jpeg', label: 'JPEG', disabled: !!currentMime && isJpeg },
    { key: 'webp', label: 'WEBP', disabled: !!currentMime && isWebp },
    { key: 'svg', label: 'SVG', disabled: !!currentMime && !svgLike },
  ]

  const selectedFormat = value.targetFormat ?? 'base64'
  const isQualityApplicable = selectedFormat === 'jpeg' || selectedFormat === 'webp'

  const qualityPct = useMemo(() => Math.round(((value.quality ?? 0.92) * 100)), [value.quality])

  return (
    <div className="card p-6 space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Conversion Settings</p>
        <h2 className="text-2xl font-semibold text-white mt-2">Fine-tune output</h2>
        <p className="text-sm text-slate-400 mt-1">Choose your format, adjust quality, and optionally resize without leaving the browser.</p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-white">Output Format</label>
          {currentMime && <span className="text-[11px] text-slate-500">Source: {currentMime}</span>}
        </div>
        <div role="group" className="flex flex-wrap gap-2">
          {fmts.map(({ key, label, disabled }) => {
            const selected = (value.targetFormat ?? 'base64') === key
            return (
              <button
                key={String(key)}
                type="button"
                disabled={!!disabled}
                className={`${selected ? 'bg-sky-500/20 border-sky-500/60 text-white' : 'bg-slate-900/40 border-slate-800 text-slate-300 hover:border-slate-700'} px-4 py-2 rounded-full border text-sm disabled:opacity-40 disabled:cursor-not-allowed`}
                onClick={() => !disabled && update({ targetFormat: key as any })}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor={idQuality} className="text-sm font-medium text-white">Quality</label>
          <span className="text-xs text-slate-400">{qualityPct}%</span>
        </div>
        <input
          id={idQuality}
          type="range"
          min={0.1}
          max={1}
          step={0.01}
          className="w-full accent-sky-500"
          value={value.quality ?? 0.92}
          onChange={(e) => update({ quality: Number(e.target.value) })}
          disabled={!isQualityApplicable}
          aria-disabled={!isQualityApplicable}
          title={isQualityApplicable ? 'Adjust output quality' : 'Quality applies to JPEG and WEBP only'}
        />
        <p className="text-xs text-slate-500">{isQualityApplicable ? 'Lower values reduce file size with some fidelity trade-offs.' : 'Quality applies to JPEG/WEBP only.'}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end">
        <div>
          <label htmlFor={idMaxW} className="block text-sm font-medium mb-1 text-white">Width</label>
          <input
            id={idMaxW}
            type="number"
            min={1}
            placeholder="e.g. 1920"
            className="w-full rounded-2xl bg-slate-950/40 border border-slate-800 px-4 py-2 text-sm text-white placeholder:text-slate-600"
            value={value.resize?.maxWidth ?? ''}
            onChange={(e) => {
              const v = e.target.value ? Number(e.target.value) : undefined
              const next = { ...value.resize, maxWidth: v }
              if (linkDims) next.maxHeight = v
              update({ resize: next })
            }}
          />
        </div>
        <button
          type="button"
          aria-label={linkDims ? 'Unlink dimensions' : 'Link dimensions'}
          title={linkDims ? 'Unlink dimensions' : 'Link dimensions'}
          className={linkDims ? 'btn-primary px-3 py-2 rounded-2xl' : 'btn-muted px-3 py-2 rounded-2xl'}
          onClick={() => setLinkDims((v) => !v)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            {linkDims ? (
              <path d="M8 12h8M7 9a3 3 0 0 1 0-6h3m4 18h3a3 3 0 0 0 0-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            ) : (
              <path d="M9 7h3m0 10h3M7 9a3 3 0 0 1 0-6h3m4 18h3a3 3 0 0 0 0-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            )}
          </svg>
        </button>
        <div>
          <label htmlFor={idMaxH} className="block text-sm font-medium mb-1 text-white">Height</label>
          <input
            id={idMaxH}
            type="number"
            min={1}
            placeholder="e.g. 1080"
            className="w-full rounded-2xl bg-slate-950/40 border border-slate-800 px-4 py-2 text-sm text-white placeholder:text-slate-600"
            value={value.resize?.maxHeight ?? ''}
            onChange={(e) => {
              const v = e.target.value ? Number(e.target.value) : undefined
              const next = { ...value.resize, maxHeight: v }
              if (linkDims) next.maxWidth = v
              update({ resize: next })
            }}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={idFit} className="block text-sm font-medium mb-1 text-white">Fit</label>
          <select id={idFit} className="w-full rounded-2xl bg-slate-950/40 border border-slate-800 px-4 py-2 text-sm text-white"
            value={value.resize?.fit ?? 'contain'}
            onChange={(e) => update({ resize: { ...value.resize, fit: (e.target.value as any) } })}
          >
            <option value="contain">Contain</option>
            <option value="cover">Cover</option>
          </select>
        </div>
        <div>
          <label htmlFor={idBg} className="block text-sm font-medium mb-1 text-white">JPEG Background</label>
          <input id={idBg} type="color" className="w-full h-12 rounded-2xl border border-slate-800 bg-slate-900/60" value={value.background ?? '#ffffff'} onChange={(e) => update({ background: e.target.value })} />
        </div>
      </div>
    </div>
  )
}
