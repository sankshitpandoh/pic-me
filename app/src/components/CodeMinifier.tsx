import { useMemo, useState } from 'react'

type LangKey = 'auto' | 'javascript' | 'css' | 'html' | 'json'

export default function CodeMinifier() {
  const [inputName, setInputName] = useState<string>('input.txt')
  const [input, setInput] = useState<string>('')
  const [output, setOutput] = useState<string>('')
  const [language, setLanguage] = useState<LangKey>('auto')
  const [error, setError] = useState<string | null>(null)
  const [wordWrap, setWordWrap] = useState<boolean>(true)
  const [jsCompress, setJsCompress] = useState<boolean>(true)
  const [jsMangle, setJsMangle] = useState<boolean>(true)
  const [htmlCollapseWhitespace, setHtmlCollapseWhitespace] = useState<boolean>(true)
  const [htmlRemoveComments, setHtmlRemoveComments] = useState<boolean>(true)

  const stats = useMemo(() => {
    const inBytes = new Blob([input]).size
    const outBytes = new Blob([output]).size
    const saved = inBytes > 0 ? Math.max(0, inBytes - outBytes) : 0
    const savedPct = inBytes > 0 ? Math.round((saved / inBytes) * 100) : 0
    return { inBytes, outBytes, saved, savedPct }
  }, [input, output])

  function handleLoadFile(file?: File | null) {
    if (!file) return
    setInputName(file.name)
    file
      .text()
      .then((t) => {
        setInput(t)
        if (language === 'auto') {
          setLanguage(detectLanguage(file.name, t))
        }
      })
      .catch(() => setInput(''))
  }

  async function runMinify() {
    setError(null)
    setOutput('')
    try {
      const lang = language === 'auto' ? detectLanguage(inputName, input) : language
      if (lang === 'json') {
        const parsed = JSON.parse(input)
        setOutput(JSON.stringify(parsed))
        return
      }
      if (lang === 'javascript') {
        const terser = await import('terser')
        const result = await terser.minify(input, { compress: jsCompress, mangle: jsMangle, module: true })
        setOutput(result.code || '')
        return
      }
      if (lang === 'css') {
        const csso = (await import('csso')).default
        const res = csso.minify(input)
        setOutput(res.css)
        return
      }
      if (lang === 'html') {
        const htmlmin = await import('html-minifier-terser')
        const res = await htmlmin.minify(input, {
          collapseWhitespace: htmlCollapseWhitespace,
          removeComments: htmlRemoveComments,
          minifyCSS: true,
          minifyJS: true,
        } as any)
        setOutput(res)
        return
      }
      setOutput(input.replace(/\s+/g, ' ').trim())
    } catch (e: any) {
      setError(e?.message || 'Minification failed')
      setOutput('')
    }
  }

  function clearAll() {
    setInput('')
    setOutput('')
    setError(null)
    setInputName('input.txt')
  }

  async function copyOutput() {
    try {
      await navigator.clipboard.writeText(output)
    } catch {
      // ignore
    }
  }

  function downloadOutput() {
    const ext = extFromLanguage(language === 'auto' ? detectLanguage(inputName, input) : language)
    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = withMinExt(inputName, ext)
    a.click()
    URL.revokeObjectURL(url)
  }

  const detected = language === 'auto' ? detectLanguage(inputName, input) : language

  return (
    <div className="space-y-8">
      <section aria-label="Inputs" className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate text-white">{inputName}</div>
                <div className="text-xs text-slate-500">Code input</div>
              </div>
              <label className="btn-muted cursor-pointer">
                Load file
                <input type="file" className="hidden" onChange={(e) => handleLoadFile(e.target.files?.[0])} />
              </label>
            </div>
            <textarea
              placeholder="Paste or type code…"
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
                <div className="text-sm font-medium truncate text-white">output.min.{extFromLanguage(detected)}</div>
                <div className="text-xs text-slate-500">Result</div>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn-muted" onClick={copyOutput} disabled={!output}>Copy</button>
                <button className="btn-muted" onClick={downloadOutput} disabled={!output}>Download</button>
              </div>
            </div>
            <textarea
              readOnly
              placeholder="Minified code…"
              className="w-full h-48 rounded-2xl bg-slate-950/40 border border-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
              value={output}
              style={{ whiteSpace: wordWrap ? 'pre-wrap' as const : 'pre' as const }}
            />
            <div className="text-[11px] text-slate-500">
              {Boolean(stats.inBytes) && (
                <span>
                  Input {formatBytes(stats.inBytes)} → Output {formatBytes(stats.outBytes)}
                  {stats.inBytes > 0 ? ` (−${stats.savedPct}%)` : ''}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="card p-4 flex flex-wrap items-center gap-3 text-sm text-slate-300">
          <div className="flex items-center gap-2">
            <span>Language</span>
            <select
              className="text-sm px-3 py-2 rounded-2xl bg-slate-950/40 border border-slate-800"
              value={language}
              onChange={(e) => setLanguage(e.target.value as LangKey)}
            >
              <option value="auto">Auto-detect</option>
              <option value="javascript">JavaScript</option>
              <option value="css">CSS</option>
              <option value="html">HTML</option>
              <option value="json">JSON</option>
            </select>
            {language === 'auto' && <span className="text-xs text-slate-500">(Detected: {detected})</span>}
          </div>
          <button className="btn-primary" onClick={runMinify}>Minify</button>
          <button className="btn-ghost border border-slate-800" onClick={clearAll}>Clear</button>
          <div className="h-6 w-px bg-slate-800" />
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={wordWrap} onChange={(e) => setWordWrap(e.target.checked)} />
            Word wrap
          </label>
          {(language === 'auto' ? detected === 'javascript' : language === 'javascript') && (
            <>
              <div className="h-6 w-px bg-slate-800" />
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={jsCompress} onChange={(e) => setJsCompress(e.target.checked)} />
                JS compress
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={jsMangle} onChange={(e) => setJsMangle(e.target.checked)} />
                JS mangle
              </label>
            </>
          )}
          {(language === 'auto' ? detected === 'html' : language === 'html') && (
            <>
              <div className="h-6 w-px bg-slate-800" />
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={htmlCollapseWhitespace} onChange={(e) => setHtmlCollapseWhitespace(e.target.checked)} />
                HTML collapse whitespace
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={htmlRemoveComments} onChange={(e) => setHtmlRemoveComments(e.target.checked)} />
                HTML remove comments
              </label>
            </>
          )}
        </div>
      </section>
    </div>
  )
}

function detectLanguage(name: string, content: string): LangKey {
  const ext = (name.split('.').pop() || '').toLowerCase()
  switch (ext) {
    case 'js':
    case 'mjs':
    case 'cjs':
    case 'ts':
    case 'tsx':
    case 'jsx':
      return 'javascript'
    case 'css':
      return 'css'
    case 'html':
    case 'htm':
      return 'html'
    case 'json':
      return 'json'
    default:
      break
  }
  if (/^\s*<(!doctype|html|\w)/i.test(content)) return 'html'
  if (/^\s*[\{\[]/.test(content)) {
    try { JSON.parse(content); return 'json' } catch { /* ignore */ }
  }
  if (/(function|=>|const|let|var|import|export)\b/.test(content)) return 'javascript'
  if (/\b[a-z-]+\s*:\s*[^;]+;/.test(content)) return 'css'
  return 'javascript'
}

function extFromLanguage(lang: LangKey): string {
  switch (lang) {
    case 'javascript': return 'js'
    case 'css': return 'css'
    case 'html': return 'html'
    case 'json': return 'json'
    default: return 'txt'
  }
}

function withMinExt(name: string, ext: string): string {
  const parts = name.split('.')
  if (parts.length <= 1) return `${name}.min.${ext}`
  parts[parts.length - 2] = `${parts[parts.length - 2]}.min`
  parts[parts.length - 1] = ext
  return parts.join('.')
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 2)} ${sizes[i]}`
}
