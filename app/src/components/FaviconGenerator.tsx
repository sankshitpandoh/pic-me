import { useMemo, useState } from 'react'
import { generateIcoFromImage, type FaviconResult } from '../lib/favicon'
import ImageDropzone from './ImageDropzone'
import clsx from 'clsx'

const DEFAULT_SIZES = [16, 32, 48, 64, 128, 256]

export default function FaviconGenerator() {
  const [file, setFile] = useState<File | null>(null)
  const [selectedSizes, setSelectedSizes] = useState<number[]>(DEFAULT_SIZES)
  const [result, setResult] = useState<FaviconResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allSelected = useMemo(() => selectedSizes.length === DEFAULT_SIZES.length, [selectedSizes])

  function onFiles(files: File[]) {
    if (!files.length) return
    setFile(files[0])
    setResult(null)
    setError(null)
  }

  function toggleSize(size: number) {
    setSelectedSizes((prev) => prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size].sort((a, b) => a - b))
  }

  function toggleAll() {
    setSelectedSizes((prev) => prev.length === DEFAULT_SIZES.length ? [32, 48, 64] : DEFAULT_SIZES)
  }

  async function generate() {
    if (!file) return
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const res = await generateIcoFromImage(file, selectedSizes)
      setResult(res)
    } catch (e: any) {
      setError(e?.message ?? String(e))
    } finally {
      setBusy(false)
    }
  }

  function clearAll() {
    setFile(null)
    setResult(null)
    setError(null)
  }

  function download() {
    if (!result) return
    const url = URL.createObjectURL(result.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = result.fileName
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="grid lg:grid-cols-12 lg:gap-8">
      <div className="lg:col-span-7 space-y-10">
        <section>
          <ImageDropzone onFiles={onFiles} />
        </section>

        {file && (
          <section aria-label="Selection" className="space-y-3">
            <h2 className="section-title">Selected</h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <img src={URL.createObjectURL(file)} className="object-cover w-full h-40 rounded-xl ring-1 ring-slate-200 dark:ring-slate-800" />
            </div>
          </section>
        )}
      </div>

      <div className="lg:col-span-5 mt-10 lg:mt-0">
        <div className="lg:sticky lg:top-24 space-y-10">
          <section aria-label="Options" className="space-y-4">
            <div className="card p-4 grid gap-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Sizes</div>
                <button type="button" className="btn-muted" onClick={toggleAll}>
                  {allSelected ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {DEFAULT_SIZES.map((s) => {
                  const checked = selectedSizes.includes(s)
                  return (
                    <label key={s} className={clsx('flex items-center gap-2 rounded-md px-3 py-2 text-sm border', checked ? 'border-sky-300 bg-sky-50/60 dark:bg-sky-900/20 dark:border-sky-800' : 'border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-white/5')}>
                      <input type="checkbox" className="accent-sky-600" checked={checked} onChange={() => toggleSize(s)} />
                      {s}×{s}
                    </label>
                  )
                })}
              </div>
              <div className="flex gap-2">
                <button disabled={!file || busy} className={clsx('btn-primary disabled:opacity-50 disabled:cursor-not-allowed')} onClick={generate}>
                  {busy ? 'Generating…' : 'Generate .ico'}
                </button>
                <button className="btn-muted" onClick={clearAll}>Clear</button>
              </div>
              {error && <div role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</div>}
            </div>
          </section>

          {result && (
            <section aria-label="Result" className="space-y-4">
              <h2 className="section-title">Result</h2>
              <div className="card overflow-hidden">
                <div className="p-4 flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800">
                  <div className="min-w-0">
                    <div className="text-sm text-slate-700 dark:text-slate-200 truncate">{result.fileName}</div>
                    <div className="text-xs text-slate-500">{result.mime} · {(result.sizeBytes / 1024).toFixed(1)} KB</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="btn-muted" onClick={download}>Download</button>
                  </div>
                </div>
                <div className="p-4 grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {result.previews.map((p) => (
                    <div key={p.size} className="flex flex-col items-center gap-2">
                      {/* eslint-disable-next-line jsx-a11y/alt-text */}
                      <img src={p.dataUrl} className="w-16 h-16 rounded-md ring-1 ring-slate-200 dark:ring-slate-800 object-cover" />
                      <div className="text-xs text-slate-500">{p.size}×{p.size}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}


