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
  const debounceTimer = useRef<number | null>(null)
  const convertingRef = useRef(false)

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

  // Live re-apply when options change after selection (debounced)
  useEffect(() => {
    if (!selectedFiles.length) return
    if (debounceTimer.current) window.clearTimeout(debounceTimer.current)
    debounceTimer.current = window.setTimeout(() => {
      if (convertingRef.current) return
      convertingRef.current = true
      if (selectedFiles.length === 1) {
        convertSingle(selectedFiles[0]).finally(() => { convertingRef.current = false })
      } else {
        convertBatch(selectedFiles)
        convertingRef.current = false
      }
    }, 250)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options])

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/40 backdrop-blur">
        <div className="container-responsive py-4 flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-semibold">Image → Base64</h1>
          <div className="flex items-center gap-3">
            {installPromptEvent && !installed && (
              <button className="px-3 py-2 rounded-md text-sm bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" onClick={async () => { await installPromptEvent.prompt?.(); setInstallPromptEvent(null) }}>Install</button>
            )}
            <button className="px-3 py-2 rounded-md text-sm bg-slate-200 dark:bg-slate-800" onClick={() => { setSelectedFiles([]); setBatchRows([]); setCurrentResult(null) }}>Clear</button>
          </div>
        </div>
      </div>

      <main className="container-responsive py-10 space-y-10">
        <section>
          <ImageDropzone onFiles={handleFiles} />
        </section>

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
      </main>

      <footer className="py-8 text-center text-sm text-slate-500">
        All processing happens locally in your browser. Works offline.
      </footer>
    </div>
  )
}

