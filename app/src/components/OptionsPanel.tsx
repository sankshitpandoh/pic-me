import { useId, useMemo, useState } from 'react'
import type { ConvertOptions } from '../types'


type Props = {
  value: ConvertOptions
  onChange: (value: ConvertOptions) => void
  currentMime?: string
}

export default function OptionsPanel({ value, onChange, currentMime }: Props) {
  const idFormat = useId()
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
    <div className="grid gap-6">
      <div className="card p-4">
        <div id={idFormat} className="text-sm font-medium mb-2">Output Format</div>
        <div role="group" aria-labelledby={idFormat} className="flex flex-wrap gap-2">
          {fmts.map(({ key, label, disabled }) => {
            const selected = (value.targetFormat ?? 'base64') === key
            return (
              <button
                key={String(key)}
                disabled={!!disabled}
                className={selected ? 'px-3 py-1.5 rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-sm disabled:opacity-50 disabled:cursor-not-allowed' : 'px-3 py-1.5 rounded-full bg-slate-200 dark:bg-slate-800 text-sm disabled:opacity-50 disabled:cursor-not-allowed'}
                onClick={() => !disabled && update({ targetFormat: key as any })}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="card p-4 grid gap-4">
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor={idQuality} className="block text-sm font-medium">Quality</label>
            <span className="text-xs text-slate-600 dark:text-slate-400">{qualityPct}%</span>
          </div>
          <input
            id={idQuality}
            type="range"
            min={0.1}
            max={1}
            step={0.01}
            className="w-full disabled:opacity-50"
            value={value.quality ?? 0.92}
            onChange={(e) => update({ quality: Number(e.target.value) })}
            disabled={!isQualityApplicable}
            aria-disabled={!isQualityApplicable}
            title={isQualityApplicable ? 'Adjust output quality' : 'Quality applies to JPEG and WEBP only'}
          />
          <p className="text-xs text-slate-500 mt-1">{isQualityApplicable ? 'Affects JPEG/WEBP file size & fidelity.' : 'Quality applies to JPEG/WEBP only.'}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] items-end">
          <div>
            <label htmlFor={idMaxW} className="block text-sm font-medium mb-1">Width</label>
            <input
              id={idMaxW}
              type="number"
              min={1}
              placeholder="e.g. 1920"
              className="w-full rounded-md bg-white/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 p-2"
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
            className={linkDims ? 'btn-muted' : 'btn-ghost'}
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
            <label htmlFor={idMaxH} className="block text-sm font-medium mb-1">Height</label>
            <input
              id={idMaxH}
              type="number"
              min={1}
              placeholder="e.g. 1080"
              className="w-full rounded-md bg-white/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 p-2"
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
            <label htmlFor={idFit} className="block text-sm font-medium mb-1">Fit</label>
            <select id={idFit} className="w-full rounded-md bg-white/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 p-2"
              value={value.resize?.fit ?? 'contain'}
              onChange={(e) => update({ resize: { ...value.resize, fit: (e.target.value as any) } })}
            >
              <option value="contain">Contain</option>
              <option value="cover">Cover</option>
            </select>
          </div>
          <div>
            <label htmlFor={idBg} className="block text-sm font-medium mb-1">JPEG Background</label>
            <input id={idBg} type="color" className="w-full h-10 rounded-md" value={value.background ?? '#ffffff'} onChange={(e) => update({ background: e.target.value })} />
          </div>
        </div>
      </div>
    </div>
  )
}


