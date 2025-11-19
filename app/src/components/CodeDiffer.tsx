import { useEffect, useMemo, useState } from 'react'
import { DiffEditor } from '@monaco-editor/react'
import clsx from 'clsx'

type LanguageKey =
  | 'auto'
  | 'plaintext'
  | 'javascript'
  | 'typescript'
  | 'javascriptreact'
  | 'typescriptreact'
  | 'json'
  | 'css'
  | 'html'
  | 'python'
  | 'go'
  | 'java'
  | 'csharp'
  | 'cpp'
  | 'rust'
  | 'yaml'
  | 'markdown'
  | 'bash'

export default function CodeDiffer() {
  const [leftName, setLeftName] = useState<string>('left.txt')
  const [rightName, setRightName] = useState<string>('right.txt')
  const [left, setLeft] = useState<string>('')
  const [right, setRight] = useState<string>('')
  const [sideBySide, setSideBySide] = useState<boolean>(true)
  const [ignoreWhitespace, setIgnoreWhitespace] = useState<boolean>(true)
  const [originalEditable, setOriginalEditable] = useState<boolean>(true)
  const [language, setLanguage] = useState<LanguageKey>('auto')
  const [isDark, setIsDark] = useState<boolean>(false)
  const [wordWrap, setWordWrap] = useState<boolean>(false)
  const [showMinimap, setShowMinimap] = useState<boolean>(true)
  const [showLineNumbers, setShowLineNumbers] = useState<boolean>(true)
  const [renderWhitespace, setRenderWhitespace] = useState<'none' | 'boundary' | 'selection' | 'all'>('none')
  const [fontSize, setFontSize] = useState<number>(14)
  const [diffAlgo, setDiffAlgo] = useState<'advanced' | 'legacy'>('advanced')
  const [tabSize, setTabSize] = useState<number>(2)
  const [insertSpaces, setInsertSpaces] = useState<boolean>(true)
  const [showIndicators, setShowIndicators] = useState<boolean>(true)
  const [showOverviewRuler, setShowOverviewRuler] = useState<boolean>(true)
  const [editorRef, setEditorRef] = useState<any>(null)

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    const update = () => setIsDark(mq?.matches ?? false)
    update()
    mq?.addEventListener?.('change', update)
    return () => mq?.removeEventListener?.('change', update)
  }, [])

  const [originalLanguage, modifiedLanguage] = useMemo(() => {
    if (language !== 'auto') return [language, language]
    return [inferLanguage(leftName, left), inferLanguage(rightName, right)]
  }, [language, leftName, rightName, left, right])

  useEffect(() => {
    if (!editorRef) return
    const modelOriginal = editorRef.getOriginalEditor().getModel()
    const modelModified = editorRef.getModifiedEditor().getModel()
    modelOriginal?.updateOptions({ tabSize, insertSpaces })
    modelModified?.updateOptions({ tabSize, insertSpaces })
  }, [tabSize, insertSpaces, editorRef])

  function handleFileChange(which: 'left' | 'right', file?: File | null) {
    if (!file) return
    const setter = which === 'left' ? setLeft : setRight
    const nameSetter = which === 'left' ? setLeftName : setRightName
    nameSetter(file.name)
    file
      .text()
      .then((t) => setter(t))
      .catch(() => setter(''))
  }

  function swapSides() {
    setLeft(right)
    setRight(left)
    setLeftName(rightName)
    setRightName(leftName)
  }

  function clearBoth() {
    setLeft('')
    setRight('')
    setLeftName('left.txt')
    setRightName('right.txt')
  }

  return (
    <div className="space-y-6">
      <section aria-label="Inputs" className="space-y-3">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate text-white">{leftName}</div>
                <div className="text-xs text-slate-500">Original (left)</div>
              </div>
              <label className="btn-muted cursor-pointer">
                Load file
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => handleFileChange('left', e.target.files?.[0])}
                />
              </label>
            </div>
            <textarea
              placeholder="Paste or type original content…"
              className="w-full h-32 rounded-2xl bg-slate-950/40 border border-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
              value={left}
              onChange={(e) => setLeft(e.target.value)}
            />
          </div>
          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate text-white">{rightName}</div>
                <div className="text-xs text-slate-500">Modified (right)</div>
              </div>
              <label className="btn-muted cursor-pointer">
                Load file
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => handleFileChange('right', e.target.files?.[0])}
                />
              </label>
            </div>
            <textarea
              placeholder="Paste or type modified content…"
              className="w-full h-32 rounded-2xl bg-slate-950/40 border border-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
              value={right}
              onChange={(e) => setRight(e.target.value)}
            />
          </div>
        </div>
        <div className="card p-4 flex flex-wrap items-center gap-3 text-sm text-slate-300">
          <button className="btn-muted" onClick={swapSides}>
            Swap sides
          </button>
          <button className="btn-muted" onClick={clearBoth}>
            Clear
          </button>
          <div className="h-6 w-px bg-slate-800" />
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={sideBySide}
              onChange={(e) => setSideBySide(e.target.checked)}
            />
            Side-by-side
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={ignoreWhitespace}
              onChange={(e) => setIgnoreWhitespace(e.target.checked)}
            />
            Ignore whitespace
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={originalEditable}
              onChange={(e) => setOriginalEditable(e.target.checked)}
            />
            Edit left
          </label>
          <div className="h-6 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <span>Language</span>
            <select
              className="text-sm px-3 py-2 rounded-2xl bg-slate-950/40 border border-slate-800"
              value={language}
              onChange={(e) => setLanguage(e.target.value as LanguageKey)}
            >
              {languageOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <details className="card p-4">
          <summary className="cursor-pointer text-sm font-medium leading-7 text-white">More options</summary>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="inline-flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={wordWrap} onChange={(e) => setWordWrap(e.target.checked)} />
              Word wrap
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={showMinimap} onChange={(e) => setShowMinimap(e.target.checked)} />
              Minimap
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={showLineNumbers} onChange={(e) => setShowLineNumbers(e.target.checked)} />
              Line numbers
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={showIndicators} onChange={(e) => setShowIndicators(e.target.checked)} />
              Diff indicators
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={showOverviewRuler} onChange={(e) => setShowOverviewRuler(e.target.checked)} />
              Overview ruler
            </label>
            <div className="flex items-center gap-2 text-sm">
              <span>Whitespace</span>
              <select
                className="text-sm px-3 py-2 rounded-2xl bg-slate-950/40 border border-slate-800"
                value={renderWhitespace}
                onChange={(e) => setRenderWhitespace(e.target.value as any)}
              >
                <option value="none">none</option>
                <option value="boundary">boundary</option>
                <option value="selection">selection</option>
                <option value="all">all</option>
              </select>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span>Diff algorithm</span>
              <select
                className="text-sm px-3 py-2 rounded-2xl bg-slate-950/40 border border-slate-800"
                value={diffAlgo}
                onChange={(e) => setDiffAlgo(e.target.value as any)}
              >
                <option value="advanced">advanced</option>
                <option value="legacy">legacy</option>
              </select>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span>Font size</span>
              <input
                type="range"
                min={10}
                max={22}
                step={1}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
              />
              <span className="tabular-nums">{fontSize}px</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span>Tab size</span>
              <input
                type="number"
                min={1}
                max={8}
                value={tabSize}
                onChange={(e) => setTabSize(Math.min(8, Math.max(1, Number(e.target.value) || 2)))}
                className="w-20 rounded-2xl bg-slate-950/40 border border-slate-800 px-3 py-2"
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={insertSpaces} onChange={(e) => setInsertSpaces(e.target.checked)} />
              Use spaces for tabs
            </label>
          </div>
        </details>
      </section>

      <section aria-label="Diff">
        <div
          className={clsx(
            'card overflow-hidden'
          )}
          style={{ height: '70vh' }}
        >
          <DiffEditor
            theme={isDark ? 'vs-dark' : 'vs'}
            original={left}
            modified={right}
            originalLanguage={originalLanguage}
            modifiedLanguage={modifiedLanguage}
            options={{
              renderSideBySide: sideBySide,
              ignoreTrimWhitespace: ignoreWhitespace,
              readOnly: false,
              originalEditable,
              automaticLayout: true,
              diffAlgorithm: diffAlgo,
              scrollBeyondLastLine: false,
              renderIndicators: showIndicators,
              minimap: { enabled: showMinimap },
              wordWrap: wordWrap ? 'on' : 'off',
              lineNumbers: showLineNumbers ? 'on' : 'off',
              renderWhitespace,
              fontSize,
              overviewRulerLanes: showOverviewRuler ? 3 : 0,
            }}
            onMount={(editor, _monaco) => {
              // Keep editor and textareas in sync for bidirectional editing
              const modelOriginal = editor.getOriginalEditor().getModel()
              const modelModified = editor.getModifiedEditor().getModel()
              modelOriginal?.onDidChangeContent(() => setLeft(modelOriginal.getValue()))
              modelModified?.onDidChangeContent(() => setRight(modelModified.getValue()))
              modelOriginal?.updateOptions({ tabSize, insertSpaces })
              modelModified?.updateOptions({ tabSize, insertSpaces })
              setEditorRef(editor)
            }}
          />
        </div>
      </section>
    </div>
  )
}

const languageOptions: { value: LanguageKey; label: string }[] = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'plaintext', label: 'Plain text' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'javascriptreact', label: 'React (JSX)' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'typescriptreact', label: 'React (TSX)' },
  { value: 'json', label: 'JSON' },
  { value: 'css', label: 'CSS' },
  { value: 'html', label: 'HTML' },
  { value: 'python', label: 'Python' },
  { value: 'go', label: 'Go' },
  { value: 'java', label: 'Java' },
  { value: 'csharp', label: 'C#' },
  { value: 'cpp', label: 'C/C++' },
  { value: 'rust', label: 'Rust' },
  { value: 'yaml', label: 'YAML' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'bash', label: 'Bash' },
]

function inferLanguage(name: string, content: string): LanguageKey {
  const ext = (name.split('.').pop() || '').toLowerCase()
  switch (ext) {
    case 'tsx':
      return 'typescriptreact'
    case 'jsx':
      return 'javascriptreact'
    case 'ts':
      return 'typescript'
    case 'js':
      return 'javascript'
    case 'json':
      return 'json'
    case 'css':
      return 'css'
    case 'html':
    case 'htm':
      return 'html'
    case 'py':
      return 'python'
    case 'go':
      return 'go'
    case 'java':
      return 'java'
    case 'cs':
      return 'csharp'
    case 'cpp':
    case 'cc':
    case 'cxx':
    case 'hpp':
    case 'hh':
    case 'hxx':
      return 'cpp'
    case 'rs':
      return 'rust'
    case 'yml':
    case 'yaml':
      return 'yaml'
    case 'md':
      return 'markdown'
    case 'sh':
    case 'bash':
      return 'bash'
    default:
      break
  }
  // Simple heuristics if no file extension
  if (/^{\s*[\{\[]/m.test(content)) return 'json'
  if (/^#\!.*\b(bash|sh)\b/.test(content)) return 'bash'
  if (/^\s*<(!doctype|html)\b/i.test(content)) return 'html'
  return 'plaintext'
}


