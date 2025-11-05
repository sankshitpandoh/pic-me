import { useId } from 'react'
import type { ConvertOptions } from '../types'

type Props = {
  value: ConvertOptions
  onChange: (value: ConvertOptions) => void
}

export default function OptionsPanel({ value, onChange }: Props) {
  const idFormat = useId()
  const idQuality = useId()
  const idMaxW = useId()
  const idMaxH = useId()
  const idFit = useId()
  const idBg = useId()

  function update(partial: Partial<ConvertOptions>) {
    onChange({ ...value, ...partial })
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-xl ring-1 ring-slate-200 dark:ring-slate-800 bg-white/70 dark:bg-white/5 p-4">
        <div className="text-sm font-medium mb-2">Format</div>
        <div className="flex flex-wrap gap-2">
          {['original','png','jpeg','webp','svg'].map((fmt) => (
            <button key={fmt} className={(value.targetFormat ?? 'original') === fmt ? 'px-3 py-1.5 rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-sm' : 'px-3 py-1.5 rounded-full bg-slate-200 dark:bg-slate-800 text-sm'} onClick={() => update({ targetFormat: fmt as any })}>
              {fmt.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl ring-1 ring-slate-200 dark:ring-slate-800 bg-white/70 dark:bg-white/5 p-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <label htmlFor={idQuality} className="block text-sm font-medium mb-1">Quality ({Math.round(((value.quality ?? 0.92) * 100))}%)</label>
          <input id={idQuality} type="range" min={0.1} max={1} step={0.01} className="w-full"
            value={value.quality ?? 0.92}
            onChange={(e) => update({ quality: Number(e.target.value) })}
          />
          <p className="text-xs text-slate-500 mt-1">JPEG/WEBP only.</p>
        </div>
        <div>
          <label htmlFor={idMaxW} className="block text-sm font-medium mb-1">Max Width</label>
          <input id={idMaxW} type="number" min={1} placeholder="e.g. 1920" className="w-full rounded-md bg-white/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 p-2"
            value={value.resize?.maxWidth ?? ''}
            onChange={(e) => update({ resize: { ...value.resize, maxWidth: e.target.value ? Number(e.target.value) : undefined } })}
          />
        </div>
        <div>
          <label htmlFor={idMaxH} className="block text-sm font-medium mb-1">Max Height</label>
          <input id={idMaxH} type="number" min={1} placeholder="e.g. 1080" className="w-full rounded-md bg-white/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 p-2"
            value={value.resize?.maxHeight ?? ''}
            onChange={(e) => update({ resize: { ...value.resize, maxHeight: e.target.value ? Number(e.target.value) : undefined } })}
          />
        </div>
        <div>
          <label htmlFor={idFit} className="block text-sm font-medium mb-1">Fit</label>
          <select id={idFit} className="w-full rounded-md bg-white/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 p-2"
            value={value.resize?.fit ?? 'contain'}
            onChange={(e) => update({ resize: { ...value.resize, fit: e.target.value as any } })}
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
  )
}


