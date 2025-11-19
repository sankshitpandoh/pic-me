import { useEffect, useRef, useState } from 'react'
import ImageDropzone from './components/ImageDropzone'
import OptionsPanel from './components/OptionsPanel'
import Preview from './components/Preview'
import ResultCard from './components/ResultCard'
import BatchTable from './components/BatchTable'
import Sidebar from './components/Sidebar'
import FaviconGenerator from './components/FaviconGenerator'
import CodeDiffer from './components/CodeDiffer'
import JsonFormatter from './components/JsonFormatter'
import CodeMinifier from './components/CodeMinifier'
import type { ConvertOptions, ConvertResult } from './types'
import { Analytics } from '@vercel/analytics/react'

const HEADER_NAV: Array<{ label: string; tool: 'convert' | 'favicon' | 'diff' | 'json' | 'minify' }> = [
  { label: 'Image Converter', tool: 'convert' },
  { label: 'Favicon Generator', tool: 'favicon' },
  { label: 'Code Diff Tool', tool: 'diff' },
  { label: 'JSON Formatter', tool: 'json' },
  { label: 'Code Minifier', tool: 'minify' },
]

type BatchRow = { id: string; name: string; result?: ConvertResult; error?: string; updating?: boolean }

type WorkerMessage = { id: string; ok: boolean; result?: ConvertResult; error?: string }

type PendingCallback = (msg: WorkerMessage) => void

export default function App() {
  const [options, setOptions] = useState<ConvertOptions>({ targetFormat: 'base64', quality: 0.92, resize: { fit: 'contain' } })
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [currentResult, setCurrentResult] = useState<ConvertResult | null>(null)
  const [batchRows, setBatchRows] = useState<BatchRow[]>([])
  const [activeTool, setActiveTool] = useState<'convert' | 'favicon' | 'diff' | 'json' | 'minify'>('convert')
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
  const pageTitle =
    activeTool === 'convert'
      ? 'Image Converter'
      : activeTool === 'favicon'
      ? 'Favicon Generator'
      : activeTool === 'diff'
      ? 'Code Diff Tool'
      : activeTool === 'json'
      ? 'JSON Formatter'
      : 'Code Minifier'

  return (
    <div className="min-h-dvh text-slate-100">
      {activeTool === 'convert' && isBusy && <div className="progress-bar" aria-hidden />}

      <header className="border-b border-slate-800/70 bg-slate-900/40 backdrop-blur-xl">
        <div className="container-responsive py-5 flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl border border-sky-500/40 bg-sky-500/10 text-sky-300 grid place-items-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M3 7a2 2 0 0 1 2-2h6v4h8v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" stroke="currentColor" strokeWidth="1.5" />
                <path d="M11 3h4l6 6h-6a4 4 0 0 1-4-4V3z" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.45em] text-slate-500">Dev Toolkit</p>
              <p className="text-lg font-semibold text-white">Creative Utilities</p>
            </div>
          </div>
          <nav className="hidden lg:flex items-center gap-2 text-sm">
            {HEADER_NAV.map((item) => (
              <button
                key={item.tool}
                className={`px-4 py-2 rounded-full border text-sm ${activeTool === item.tool ? 'border-sky-500/60 text-white bg-sky-500/10' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'}`}
                onClick={() => setActiveTool(item.tool)}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {installPromptEvent && !installed && (
              <button className="btn-muted" onClick={async () => { await installPromptEvent.prompt?.(); setInstallPromptEvent(null) }}>
                Install app
              </button>
            )}
            <button className="btn-primary">Sign Up</button>
          </div>
        </div>
        <div className="lg:hidden border-t border-slate-800/70">
          <div className="container-responsive py-3 overflow-x-auto">
            <div className="flex gap-2 min-w-max">
              {HEADER_NAV.map((item) => (
                <button
                  key={item.tool}
                  className={`px-4 py-2 rounded-full border text-xs ${activeTool === item.tool ? 'border-sky-500/60 text-white bg-sky-500/10' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'}`}
                  onClick={() => setActiveTool(item.tool)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="container-responsive py-10 lg:py-16 space-y-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <nav className="text-xs uppercase tracking-[0.4em] text-slate-500 mb-3" aria-label="Breadcrumb">
              <ol className="inline-flex items-center gap-2">
                <li>Dev Toolkit</li>
                <li aria-hidden>·</li>
                <li className="text-white">{pageTitle}</li>
              </ol>
            </nav>
            <h1 className="text-3xl font-semibold text-white">{pageTitle}</h1>
            <p className="text-sm text-slate-400 mt-2">Batch-ready, privacy-friendly utilities crafted for developers.</p>
          </div>
          {activeTool === 'convert' && (
            <button className="btn-ghost" onClick={() => { setSelectedFiles([]); setBatchRows([]); setCurrentResult(null) }}>Clear session</button>
          )}
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-3 mb-10 lg:mb-0">
            <div className="lg:sticky lg:top-24">
              <Sidebar active={activeTool} onSelect={setActiveTool} />
            </div>
          </div>
          <div className="lg:col-span-9">
            {activeTool === 'convert' ? (
              <div className="space-y-8">
                <div className="grid gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
                  <div className="space-y-6">
                    <section>
                      <ImageDropzone onFiles={handleFiles} />
                    </section>
                    <section>
                      <OptionsPanel value={options} onChange={setOptions} currentMime={currentMime} />
                    </section>
                  </div>
                  <div className="space-y-6">
                    {selectedFiles.length > 0 && (
                      <section aria-label="Selection" className="card p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <h2 className="text-lg font-semibold text-white">Selected images</h2>
                          <span className="text-xs text-slate-500">{selectedFiles.length} file{selectedFiles.length === 1 ? '' : 's'}</span>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {selectedFiles.map((f, i) => <Preview key={i} file={f} />)}
                        </div>
                      </section>
                    )}

                    {hasBatch ? (
                      <BatchTable rows={batchRows} />
                    ) : currentResult ? (
                      <ResultCard result={currentResult} isUpdating={isUpdating} />
                    ) : (
                      <div className="card p-10 text-center border-dashed border-slate-800/70">
                        <div className="mx-auto h-16 w-16 rounded-2xl bg-slate-900/70 border border-slate-800/80 text-slate-500 grid place-items-center">
                          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden>
                            <path d="M12 16l-4-4m4 4l4-4m-4 4V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <rect x="3" y="12" width="18" height="8.5" rx="2" stroke="currentColor" strokeWidth="1.5" />
                          </svg>
                        </div>
                        <p className="text-xl font-semibold text-white mt-4">Your image preview will appear here</p>
                        <p className="text-sm text-slate-400 mt-2">Upload or drop an image on the left to get started.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : activeTool === 'favicon' ? (
              <FaviconGenerator />
            ) : activeTool === 'diff' ? (
              <CodeDiffer />
            ) : activeTool === 'json' ? (
              <JsonFormatter />
            ) : (
              <CodeMinifier />
            )}
          </div>
        </div>
      </main>

      <footer className="py-8 text-center text-xs text-slate-500">All processing happens locally in your browser. Works offline.</footer>

      {toast && (
        <div role="status" aria-live="polite" className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg text-sm bg-slate-900 text-white ring-1 ring-slate-700">
          <div className="flex items-center gap-3">
            <span>{toast}</span>
            <button className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20" onClick={() => setToast(null)} aria-label="Dismiss notification">Dismiss</button>
          </div>
        </div>
      )}
      <Analytics />
    </div>
  )
}
