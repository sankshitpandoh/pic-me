import { useMemo, useState } from 'react'

export default function JsonFormatter() {
  const [inputName, setInputName] = useState<string>('input.json')
  const [input, setInput] = useState<string>('')
  const [output, setOutput] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [indent, setIndent] = useState<number>(2)
  const [sortKeys, setSortKeys] = useState<boolean>(false)
  const [wordWrap, setWordWrap] = useState<boolean>(true)

  const stats = useMemo(() => {
    const inBytes = new Blob([input]).size
    const outBytes = new Blob([output]).size
    return { inBytes, outBytes }
  }, [input, output])

  function handleLoadFile(file?: File | null) {
    if (!file) return
    setInputName(file.name)
    file
      .text()
      .then((t) => setInput(t))
      .catch(() => setInput(''))
  }

  function prettyPrint() {
    setError(null)
    try {
      const parsed = JSON.parse(input)
      const normalized = sortKeys ? sortObjectRecursively(parsed) : parsed
      const formatted = JSON.stringify(normalized, null, indent)
      setOutput(formatted + '\n')
    } catch (e: any) {
      setError(e?.message || 'Invalid JSON')
      setOutput('')
    }
  }

  function minify() {
    setError(null)
    try {
      const parsed = JSON.parse(input)
      setOutput(JSON.stringify(parsed))
    } catch (e: any) {
      setError(e?.message || 'Invalid JSON')
      setOutput('')
    }
  }

  function clearAll() {
    setInput('')
    setOutput('')
    setError(null)
    setInputName('input.json')
  }

  async function copyOutput() {
    try {
      await navigator.clipboard.writeText(output)
    } catch {
      // ignore
    }
  }

  function downloadOutput() {
    const blob = new Blob([output], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = inputName.endsWith('.json') ? inputName : 'formatted.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-8">
      <section aria-label="Inputs" className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate text-white">{inputName}</div>
                <div className="text-xs text-slate-500">JSON input</div>
              </div>
              <label className="btn-muted cursor-pointer">
                Load file
                <input type="file" accept=".json,application/json" className="hidden" onChange={(e) => handleLoadFile(e.target.files?.[0])} />
              </label>
            </div>
            <textarea
              placeholder="Paste or type JSON…"
              className="w-full h-48 rounded-2xl bg-slate-950/40 border border-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              style={{ whiteSpace: wordWrap ? 'pre-wrap' as const : 'pre' as const }}
            />
            {error && <div className="text-xs text-red-400">{error}</div>}
          </div>
          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate text-white">output.json</div>
                <div className="text-xs text-slate-500">Result</div>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn-muted" onClick={copyOutput} disabled={!output}>Copy</button>
                <button className="btn-muted" onClick={downloadOutput} disabled={!output}>Download</button>
              </div>
            </div>
            <textarea
              readOnly
              placeholder="Formatted/minified JSON…"
              className="w-full h-48 rounded-2xl bg-slate-950/40 border border-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
              value={output}
              style={{ whiteSpace: wordWrap ? 'pre-wrap' as const : 'pre' as const }}
            />
            <div className="text-[11px] text-slate-500">
              {Boolean(stats.inBytes) && (
                <span>Input {formatBytes(stats.inBytes)} → Output {formatBytes(stats.outBytes)}</span>
              )}
            </div>
          </div>
        </div>
        <div className="card p-4 flex flex-wrap items-center gap-3 text-sm text-slate-300">
          <button className="btn-primary" onClick={prettyPrint}>Format</button>
          <button className="btn-muted" onClick={minify}>Minify</button>
          <button className="btn-ghost border border-slate-800" onClick={clearAll}>Clear</button>
          <div className="h-6 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <span>Indent</span>
            <select
              className="text-sm px-3 py-2 rounded-2xl bg-slate-950/40 border border-slate-800"
              value={indent}
              onChange={(e) => setIndent(Number(e.target.value) || 2)}
            >
              <option value={2}>2 spaces</option>
              <option value={4}>4 spaces</option>
            </select>
          </div>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={sortKeys} onChange={(e) => setSortKeys(e.target.checked)} />
            Sort keys
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={wordWrap} onChange={(e) => setWordWrap(e.target.checked)} />
            Word wrap
          </label>
        </div>
      </section>
    </div>
  )
}

function sortObjectRecursively(value: any): any {
  if (Array.isArray(value)) {
    return value.map((v) => sortObjectRecursively(v))
  }
  if (value && typeof value === 'object') {
    const result: Record<string, any> = {}
    Object.keys(value)
      .sort((a, b) => a.localeCompare(b))
      .forEach((k) => {
        result[k] = sortObjectRecursively(value[k])
      })
    return result
  }
  return value
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 2)} ${sizes[i]}`
}
