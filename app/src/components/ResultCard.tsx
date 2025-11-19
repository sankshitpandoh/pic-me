import { useMemo, useState } from 'react'
import type { ConvertResult } from '../types'
import clsx from 'clsx'
import { mimeToExtension } from '../lib/utils'

type Props = {
  result: ConvertResult
  isUpdating?: boolean
}

export default function ResultCard({ result, isUpdating }: Props) {
  const [copied, setCopied] = useState(false)
  const base64 = useMemo(() => result.dataUrl, [result.dataUrl])
  const ext = useMemo(() => mimeToExtension(result.mime), [result.mime])

  async function copy() {
    try {
      await navigator.clipboard.writeText(base64)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  function downloadTxt() {
    const blob = new Blob([base64], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${result.fileName || 'image'}.txt`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  function downloadImage() {
    const a = document.createElement('a')
    a.href = base64
    a.download = `${(result.fileName || 'image').replace(/\.[^.]+$/, '')}.${ext}`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  return (
    <div className="relative card p-6 space-y-6">
      <div className="rounded-2xl border border-slate-800/70 bg-slate-950/40 overflow-hidden min-h-[280px] grid place-items-center">
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <img src={result.dataUrl} className="w-full h-full object-contain" />
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm text-white truncate">{result.fileName || 'image'}</div>
          <div className="text-xs text-slate-500">{result.mime} · {(result.sizeBytes / 1024).toFixed(1)} KB {result.width && result.height ? `· ${result.width}×${result.height}` : ''}</div>
        </div>
        <span className="px-4 py-1 rounded-full bg-slate-900/60 border border-slate-800 text-xs text-slate-300 uppercase tracking-wide">{ext}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button disabled={!!isUpdating} className={clsx('btn-primary disabled:opacity-50 disabled:cursor-not-allowed')} onClick={copy}>{copied ? 'Copied' : 'Copy Base64'}</button>
        <button disabled={!!isUpdating} className="btn-muted disabled:opacity-50 disabled:cursor-not-allowed" onClick={downloadTxt}>Save as .txt</button>
        <button disabled={!!isUpdating} className="btn-muted disabled:opacity-50 disabled:cursor-not-allowed" onClick={downloadImage}>Download</button>
        <a aria-disabled={!!isUpdating} className={clsx('btn-ghost border border-slate-800', isUpdating && 'pointer-events-none opacity-50')} href={isUpdating ? undefined : base64} target="_blank" rel="noreferrer">Open</a>
      </div>
      <div>
        <label className="text-xs text-slate-500 mb-2 block">Base64 Output</label>
        <textarea className="w-full h-48 p-4 rounded-2xl bg-slate-950/50 border border-slate-800 font-mono text-[11px] text-slate-200" value={base64} readOnly aria-label="Base64 data URL" />
      </div>
      {isUpdating && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm grid place-items-center rounded-3xl">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <span className="inline-block h-4 w-4 rounded-full border-2 border-slate-700 border-t-slate-200 animate-spin" aria-hidden />
            Updating…
          </div>
        </div>
      )}
    </div>
  )
}
