import { useEffect, useRef, useState } from 'react'
import ImageDropzone from './components/ImageDropzone'
import OptionsPanel from './components/OptionsPanel'
import Preview from './components/Preview'
import ResultCard from './components/ResultCard'
import BatchTable from './components/BatchTable'
import Sidebar from './components/Sidebar'
import FaviconGenerator from './components/FaviconGenerator'
import CodeDiffer from './components/CodeDiffer'
import type { ConvertOptions, ConvertResult } from './types'
import { Analytics } from "@vercel/analytics/react"


type BatchRow = { id: string; name: string; result?: ConvertResult; error?: string; updating?: boolean }

type WorkerMessage = { id: string; ok: boolean; result?: ConvertResult; error?: string }

type PendingCallback = (msg: WorkerMessage) => void

export default function App() {
  const [options, setOptions] = useState<ConvertOptions>({ targetFormat: 'base64', quality: 0.92, resize: { fit: 'contain' } })
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [currentResult, setCurrentResult] = useState<ConvertResult | null>(null)
  const [batchRows, setBatchRows] = useState<BatchRow[]>([])
  const [activeTool, setActiveTool] = useState<'convert' | 'favicon' | 'diff'>('convert')
  const workerRef = useRef<Worker | null>(null)
  const pendingRef = useRef<Map<string, PendingCallback>>(new Map())
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null)
  const [installed, setInstalled] = useState(false)
  const debounceTimer = useRef<number | null>(null)
  const convertingRef = useRef(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    const w = new Worker(new URL('./lib/worker/convertWorker.ts', import.meta.url), { type: 'module' })
    const onMessage = (ev: MessageEvent<WorkerMessage>) => {
      const msg = ev.data
      const cb = pendingRef.current.get(msg.id)
      if (cb) {
        pendingRef.current.delete(msg.id)
        cb(msg)
      }
    }
    w.addEventListener('message', onMessage as any)
    workerRef.current = w
    return () => { w.removeEventListener('message', onMessage as any); w.terminate(); workerRef.current = null; pendingRef.current.clear() }
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

  function postToWorker(id: string, file: File, opts: ConvertOptions, cb: PendingCallback) {
    const w = workerRef.current
    if (!w) return
    pendingRef.current.set(id, cb)
    w.postMessage({ id, file, options: opts })
  }

  async function convertSingle(file: File) {
    setIsUpdating(true)
    const id = `single-${Date.now()}`
    postToWorker(id, file, options, (msg) => {
      try {
        if (msg.ok && msg.result) {
          setCurrentResult(msg.result)
        } else {
          setCurrentResult({ dataUrl: '', mime: 'text/plain', sizeBytes: 0, fileName: file.name })
          setToast(`Failed to convert ${file.name}: ${msg.error}`)
        }
      } finally { setIsUpdating(false) }
    })
  }

  function convertBatch(files: File[], reuseRows = false) {
    const rows: BatchRow[] = reuseRows && batchRows.length === files.length
      ? batchRows.map((r) => ({ ...r, updating: true }))
      : files.map((f, i) => ({ id: `${Date.now()}-${i}`, name: f.name, updating: true }))
    setBatchRows(rows)

    files.forEach((file, idx) => {
      const id = rows[idx].id
      postToWorker(id, file, options, (msg) => {
        setBatchRows((prev) => prev.map((r, i) => i === idx ? ({ ...r, result: msg.result, error: msg.ok ? undefined : msg.error, updating: false }) : r))
        if (!msg.ok) {
          setToast(`Failed to convert ${file.name}: ${msg.error}`)
        }
      })
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
        convertBatch(selectedFiles, true)
        convertingRef.current = false
      }
    }, 250)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options])

  const currentMime = selectedFiles.length === 1 ? selectedFiles[0].type : undefined

  const isBusy = isUpdating || batchRows.some((r) => r.updating)
  const pageTitle = activeTool === 'convert' ? 'Image Converter' : activeTool === 'favicon' ? 'Favicon Generator' : 'Code Diff Tool'

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {activeTool === 'convert' && isBusy && <div className="progress-bar" aria-hidden />}
      <div className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/40 backdrop-blur">
        <div className="container-responsive py-4 flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-semibold">Dev Toolkit</h1>
          <div className="flex items-center gap-3">
            {installPromptEvent && !installed && (
              <button className="btn-primary" onClick={async () => { await installPromptEvent.prompt?.(); setInstallPromptEvent(null) }}>Install</button>
            )}
          </div>
        </div>
      </div>

      <main className="container-responsive py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <nav className="text-xs text-slate-500 dark:text-slate-400 mb-1" aria-label="Breadcrumb">
              <ol className="inline-flex items-center gap-1">
                <li>Dev Toolkit</li>
                <li aria-hidden>›</li>
                <li className="text-slate-700 dark:text-slate-300">{pageTitle}</li>
              </ol>
            </nav>
            <div className="text-2xl font-semibold">{pageTitle}</div>
          </div>
          {activeTool === 'convert' && (
            <button className="btn-muted" onClick={() => { setSelectedFiles([]); setBatchRows([]); setCurrentResult(null) }}>Clear</button>
          )}
        </div>
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-3 mb-8 lg:mb-0">
            <div className="lg:sticky lg:top-24">
              <Sidebar active={activeTool} onSelect={setActiveTool} />
            </div>
          </div>
          <div className="lg:col-span-9">
            {activeTool === 'convert' ? (
              <div className="lg:grid lg:grid-cols-12 lg:gap-8">
                <div className="lg:col-span-7 space-y-10">
                  <section>
                    <ImageDropzone onFiles={handleFiles} />
                  </section>

                  {selectedFiles.length > 0 && (
                    <section aria-label="Selection" className="space-y-3">
                      <h2 className="text-lg font-medium">Selected</h2>
                      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                        {selectedFiles.map((f, i) => <Preview key={i} file={f} />)}
                      </div>
                    </section>
                  )}
                </div>

                <div className="lg:col-span-5 mt-10 lg:mt-0">
                  <div className="lg:sticky lg:top-24 space-y-10">
                    <section aria-label="Options" className="space-y-4">
                      <OptionsPanel value={options} onChange={setOptions} currentMime={currentMime} />
                    </section>

                    {!hasBatch && currentResult && (
                      <section aria-label="Result" className="space-y-3">
                        <h2 className="text-lg font-medium">Result</h2>
                        <ResultCard result={currentResult} isUpdating={isUpdating} />
                      </section>
                    )}

                    {hasBatch && (
                      <section aria-label="Batch results" className="space-y-3">
                        <BatchTable rows={batchRows} />
                      </section>
                    )}
                  </div>
                </div>
              </div>
            ) : activeTool === 'favicon' ? (
              <FaviconGenerator />
            ) : (
              <CodeDiffer />
            )}
          </div>
        </div>
      </main>

      <footer className="py-8 text-center text-sm text-slate-500">
        All processing happens locally in your browser. Works offline.
      </footer>

      {toast && (
        <div role="status" aria-live="polite" className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg text-sm bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 ring-1 ring-slate-200/50 dark:ring-slate-800/50">
          <div className="flex items-center gap-3">
            <span>{toast}</span>
            <button className="px-2 py-1 rounded-md bg-white/10 dark:bg-slate-900/10 hover:bg-white/20" onClick={() => setToast(null)} aria-label="Dismiss notification">Dismiss</button>
          </div>
        </div>
      )}
      <Analytics />
    </div>
  )
}

