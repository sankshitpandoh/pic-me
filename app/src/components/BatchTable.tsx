import JSZip from 'jszip'
import type { ConvertResult } from '../types'
import { mimeToExtension } from '../lib/utils'

type Row = {
  id: string
  name: string
  result?: ConvertResult
  error?: string
  updating?: boolean
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
      const ext = mimeToExtension(row.result.mime)
      const baseName = row.name.replace(/\.[^.]+$/, '')
      zip.file(`${baseName}.${ext}`, base64, { base64: true })
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
    <div className="card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">Batch results</p>
          <p className="text-xs text-slate-500">Processed locally, zipped on export.</p>
        </div>
        {(() => {
          const readyCount = rows.filter((r) => !!r.result).length
          const disabled = readyCount === 0
          return (
            <button
              className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={exportZip}
              disabled={disabled}
              aria-disabled={disabled}
              title={disabled ? 'No converted files to export yet' : 'Download all converted files as ZIP'}
            >
              Export ZIP{readyCount ? ` (${readyCount})` : ''}
            </button>
          )
        })()}
      </div>
      <div className="divide-y divide-slate-800/70">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center justify-between py-3">
            <div className="min-w-0">
              <div className="font-medium text-white truncate">{row.name}</div>
              <div className="text-xs text-slate-500 flex items-center gap-2">
                {(row.updating || (!row.result && !row.error)) && (
                  <span className="inline-block h-3 w-3 rounded-full border-2 border-slate-700 border-t-slate-200 animate-spin" aria-hidden />
                )}
                {row.error ? `Error: ${row.error}` : row.result ? `${row.result.mime} · ${(row.result.sizeBytes / 1024).toFixed(1)} KB` : (row.updating ? 'Updating…' : 'Processing...')}
              </div>
            </div>
            {row.result && (
              <a className="text-sm text-sky-300 underline" href={row.result.dataUrl} download={row.name} target="_blank" rel="noreferrer">Open</a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
