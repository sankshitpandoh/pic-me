import { useEffect, useRef, useState } from 'react'
import ImageDropzone from './components/ImageDropzone'
import OptionsPanel from './components/OptionsPanel'
import Preview from './components/Preview'
import ResultCard from './components/ResultCard'
import BatchTable from './components/BatchTable'
import type { ConvertOptions, ConvertResult } from './types'
import { convertFileToBase64 } from './lib/convert'

type BatchRow = { id: string; name: string; result?: ConvertResult; error?: string }

export default function App() {
  const [options, setOptions] = useState<ConvertOptions>({ targetFormat: 'original', quality: 0.92, resize: { fit: 'contain' } })
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [currentResult, setCurrentResult] = useState<ConvertResult | null>(null)
  const [batchRows, setBatchRows] = useState<BatchRow[]>([])
  const workerRef = useRef<Worker | null>(null)
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const w = new Worker(new URL('./lib/worker/convertWorker.ts', import.meta.url), { type: 'module' })
    workerRef.current = w
    return () => { w.terminate(); workerRef.current = null }
  }, [])

  useEffect(() => {
    function onBeforeInstallPrompt(e: any) {
      e.preventDefault()
      setInstallPromptEvent(e)
    }
    function onAppInstalled() { setInstalled(true); setInstallPromptEvent(null) }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt as any)
    window.addEventListener('appinstalled', onAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt as any)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  function handleFiles(files: File[]) {
    setSelectedFiles(files)
    if (files.length === 1) {
      convertSingle(files[0])
    } else if (files.length > 1) {
      convertBatch(files)
    }
  }

  async function convertSingle(file: File) {
    setCurrentResult(null)
    try {
      const result = await convertFileToBase64(file, options)
      setCurrentResult(result)
    } catch (e: any) {
      setCurrentResult({ dataUrl: '', mime: 'text/plain', sizeBytes: 0, fileName: file.name })
      alert(`Failed to convert ${file.name}: ${e?.message ?? e}`)
    }
  }

  function convertBatch(files: File[]) {
    const rows: BatchRow[] = files.map((f, i) => ({ id: `${Date.now()}-${i}`, name: f.name }))
    setBatchRows(rows)
    const w = workerRef.current
    if (!w) return
    const pending = new Map<string, number>()
    w.onmessage = (ev: MessageEvent<any>) => {
      const msg = ev.data as { id: string; ok: boolean; result?: ConvertResult; error?: string }
      setBatchRows((prev) => prev.map((r, idx) => idx === (pending.get(msg.id) ?? -1) ? ({ ...r, result: msg.result, error: msg.ok ? undefined : msg.error }) : r))
    }
    files.forEach((file, idx) => {
      const id = rows[idx].id
      pending.set(id, idx)
      w.postMessage({ id, file, options })
    })
  }

  const hasBatch = batchRows.length > 0

  return (
    <div className="container-responsive py-10 space-y-10">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Image → Base64</h1>
        <div className="flex items-center gap-3">
          {installPromptEvent && !installed && (
            <button className="px-3 py-2 rounded-md text-sm bg-slate-200 dark:bg-slate-800" onClick={async () => { await installPromptEvent.prompt?.(); setInstallPromptEvent(null) }}>Install</button>
          )}
          <a className="text-sm underline text-slate-600 dark:text-slate-300" href="/" onClick={(e) => { e.preventDefault(); location.reload() }}>Reset</a>
        </div>
      </header>

      <ImageDropzone onFiles={handleFiles} />

      <section aria-label="Options" className="space-y-4">
        <h2 className="text-lg font-medium">Options</h2>
        <OptionsPanel value={options} onChange={setOptions} />
      </section>

      {selectedFiles.length > 0 && (
        <section aria-label="Selection" className="space-y-3">
          <h2 className="text-lg font-medium">Selected</h2>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {selectedFiles.map((f, i) => <Preview key={i} file={f} />)}
          </div>
        </section>
      )}

      {!hasBatch && currentResult && (
        <section aria-label="Result" className="space-y-3">
          <h2 className="text-lg font-medium">Result</h2>
          <ResultCard result={currentResult} />
        </section>
      )}

      {hasBatch && (
        <section aria-label="Batch results" className="space-y-3">
          <BatchTable rows={batchRows} />
        </section>
      )}

      <footer className="pt-8 text-center text-sm text-slate-500">
        All processing happens locally in your browser. Works offline.
      </footer>
    </div>
  )
}

