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
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="space-y-6">
          <section className="card p-6 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Step 1</p>
              <h2 className="text-2xl font-semibold text-white">Upload your image</h2>
              <p className="text-sm text-slate-400">Supports PNG, JPG, SVG, WEBP.</p>
            </div>
            <ImageDropzone onFiles={onFiles} className="border-dashed border-2" />
          </section>

          <section className="card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Step 2</p>
                <h2 className="text-xl font-semibold text-white">Select sizes</h2>
              </div>
              <button type="button" className="btn-muted" onClick={toggleAll}>
                {allSelected ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {DEFAULT_SIZES.map((s) => {
                const checked = selectedSizes.includes(s)
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSize(s)}
                    className={clsx('rounded-2xl px-3 py-3 text-sm border transition', checked ? 'border-sky-500/60 bg-sky-500/10 text-white' : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700')}
                  >
                    {s}×{s}
                  </button>
                )
              })}
            </div>
            <div className="flex gap-2 flex-wrap">
              <button disabled={!file || busy} className={clsx('btn-primary disabled:opacity-50 disabled:cursor-not-allowed')} onClick={generate}>
                {busy ? 'Generating…' : 'Generate .ico'}
              </button>
              <button className="btn-ghost border border-slate-800" onClick={clearAll}>Reset</button>
              {error && <div role="alert" className="text-sm text-red-400">{error}</div>}
            </div>
          </section>
        </div>

        <section className="card p-6 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Step 3</p>
            <h2 className="text-2xl font-semibold text-white">Preview</h2>
            <p className="text-sm text-slate-400">Download perfect favicons for every platform.</p>
          </div>
          {result ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-white">{result.fileName}</div>
                  <div className="text-xs text-slate-500">{result.mime} · {(result.sizeBytes / 1024).toFixed(1)} KB</div>
                </div>
                <button className="btn-primary" onClick={download}>Download favicon</button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                {result.previews.map((p) => (
                  <div key={p.size} className="flex flex-col items-center gap-2">
                    {/* eslint-disable-next-line jsx-a11y/alt-text */}
                    <img src={p.dataUrl} className="w-20 h-20 rounded-2xl border border-slate-800 bg-slate-950/40 object-contain" />
                    <div className="text-xs text-slate-500">{p.size}×{p.size}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-16 text-slate-500 border border-dashed border-slate-800/70 rounded-2xl">
              <div className="h-14 w-14 rounded-2xl border border-slate-800 grid place-items-center mb-4">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M9 12h6M12 9v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <p className="text-lg font-semibold text-white">Your generated favicons will appear here</p>
              <p className="text-sm text-slate-400 mt-1">Upload an image and choose sizes to preview.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
