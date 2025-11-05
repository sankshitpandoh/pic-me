import { useMemo, useState } from 'react'
import type { ConvertResult } from '../types'
import clsx from 'clsx'

type Props = {
  result: ConvertResult
}

export default function ResultCard({ result }: Props) {
  const [copied, setCopied] = useState(false)
  const base64 = useMemo(() => result.dataUrl, [result.dataUrl])

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
    a.download = `${result.fileName || 'image'}`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-white/5">
      <div className="p-4 flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800">
        <div className="text-sm text-slate-600 dark:text-slate-300">
          {result.mime} · {(result.sizeBytes / 1024).toFixed(1)} KB {result.width && result.height ? `· ${result.width}×${result.height}` : ''}
        </div>
        <div className="flex items-center gap-2">
          <button className={clsx('px-3 py-2 rounded-md text-sm bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900')} onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
          <button className="px-3 py-2 rounded-md text-sm bg-slate-200 dark:bg-slate-800" onClick={downloadTxt}>Download .txt</button>
          <button className="px-3 py-2 rounded-md text-sm bg-slate-200 dark:bg-slate-800" onClick={downloadImage}>Download image</button>
          <a className="px-3 py-2 rounded-md text-sm bg-slate-200 dark:bg-slate-800" href={base64} target="_blank" rel="noreferrer">Open</a>
        </div>
      </div>
      <div className="p-4">
        <textarea className="w-full h-40 p-3 rounded-md bg-transparent border border-slate-200 dark:border-slate-800 font-mono text-xs" value={base64} readOnly aria-label="Base64 data URL" />
      </div>
    </div>
  )
}


