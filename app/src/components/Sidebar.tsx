import clsx from 'clsx'

type ToolKey = 'convert' | 'favicon' | 'diff' | 'json' | 'minify'

type Props = {
  active: ToolKey
  onSelect: (tool: ToolKey) => void
}

export default function Sidebar({ active, onSelect }: Props) {
  return (
    <nav aria-label="Tools" className="card p-4 space-y-3">
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Tools</p>
        <p className="text-sm text-slate-400">Pick a workflow</p>
      </div>
      <ToolButton
        label="Image Converter"
        description="Convert, resize, base64"
        active={active === 'convert'}
        onClick={() => onSelect('convert')}
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M3 7a2 2 0 0 1 2-2h6v4h8v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M11 3h4l6 6h-6a4 4 0 0 1-4-4V3z" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
        }
      />
      <ToolButton
        label="Favicon Generator"
        description=".ico from any image"
        active={active === 'favicon'}
        onClick={() => onSelect('favicon')}
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M9 12h6M12 9v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        }
      />
      <ToolButton
        label="Code Diff"
        description="World-class code differ"
        active={active === 'diff'}
        onClick={() => onSelect('diff')}
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M8 5h8M4 9h8M12 13h8M8 17h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        }
      />
      <ToolButton
        label="JSON Formatter"
        description="Pretty-print & validate"
        active={active === 'json'}
        onClick={() => onSelect('json')}
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M7 7h10M7 12h7M7 17h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        }
      />
      <ToolButton
        label="Code Minifier"
        description="Minify JS/CSS/HTML"
        active={active === 'minify'}
        onClick={() => onSelect('minify')}
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M5 8l4 4-4 4M19 8l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        }
      />
    </nav>
  )
}

function ToolButton(props: { label: string; description: string; active?: boolean; onClick: () => void; icon: React.ReactNode }) {
  const { label, description, active, onClick, icon } = props
  return (
    <button
      className={clsx(
        'w-full text-left px-4 py-4 rounded-2xl border flex items-center gap-3 transition',
        active
          ? 'bg-gradient-to-r from-sky-600/40 to-indigo-600/40 text-white border-sky-500/40 shadow-[0_10px_30px_rgba(14,165,233,0.25)]'
          : 'bg-slate-900/40 border-slate-800 text-slate-300 hover:border-slate-700'
      )}
      onClick={onClick}
    >
      <div className={clsx('h-10 w-10 rounded-xl grid place-items-center', active ? 'bg-white/10 text-white' : 'bg-slate-950/40 text-slate-400')}>
        {icon}
      </div>
      <div>
        <div className={clsx('text-sm font-semibold', active ? 'text-white' : 'text-slate-100')}>{label}</div>
        <div className="text-xs text-slate-500">{description}</div>
      </div>
    </button>
  )
}
