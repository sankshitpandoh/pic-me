import JSZip from 'jszip'
import type { ConvertResult } from '../types'

type Row = {
  id: string
  name: string
  result?: ConvertResult
  error?: string
}

type Props = {
  rows: Row[]
}

export default function BatchTable({ rows }: Props) {
  async function exportZip() {
    const zip = new JSZip()
    rows.forEach((row) => {
      if (!row.result) return
      const dataUrl = row.result.dataUrl
      const comma = dataUrl.indexOf(',')
      const base64 = dataUrl.slice(comma + 1)
      const ext = row.result.mime.split('/')[1] || 'txt'
      zip.file(`${row.name}.${ext}`, base64, { base64: true })
    })
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'converted.zip'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="rounded-2xl ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden bg-white/70 dark:bg-white/5">
      <div className="flex items-center justify-between p-3 bg-slate-50/60 dark:bg-slate-900/50">
        <div className="text-sm text-slate-600 dark:text-slate-300">Batch results</div>
        <button className="px-3 py-2 rounded-md text-sm bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" onClick={exportZip}>Export ZIP</button>
      </div>
      <div className="divide-y divide-slate-200 dark:divide-slate-800">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center justify-between p-3">
            <div className="min-w-0">
              <div className="font-medium truncate">{row.name}</div>
              <div className="text-xs text-slate-500 flex items-center gap-2">
                {!row.result && !row.error && (
                  <span className="inline-block h-3 w-3 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" aria-hidden />
                )}
                {row.error ? `Error: ${row.error}` : row.result ? `${row.result.mime} · ${(row.result.sizeBytes / 1024).toFixed(1)} KB` : 'Processing...'}
              </div>
            </div>
            {row.result && (
              <a className="text-sm underline" href={row.result.dataUrl} download={row.name} target="_blank" rel="noreferrer">Open</a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}


