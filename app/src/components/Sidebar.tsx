import clsx from 'clsx'

type ToolKey = 'convert' | 'favicon'

type Props = {
  active: ToolKey
  onSelect: (tool: ToolKey) => void
}

export default function Sidebar({ active, onSelect }: Props) {
  return (
    <nav aria-label="Tools" className="space-y-2">
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
    </nav>
  )
}

function ToolButton(props: { label: string; description: string; active?: boolean; onClick: () => void; icon: React.ReactNode }) {
  const { label, description, active, onClick, icon } = props
  return (
    <button
      className={clsx(
        'w-full text-left px-3 py-3 rounded-lg border',
        active
          ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900/10 dark:border-slate-100/10'
          : 'bg-white/70 dark:bg-white/5 border-slate-200 dark:border-slate-800 hover:bg-white/90 dark:hover:bg-white/10'
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className={clsx('h-9 w-9 rounded-md grid place-items-center', active ? 'bg-white/10 dark:bg-slate-900/10' : 'bg-slate-100 dark:bg-slate-800')}>
          {icon}
        </div>
        <div>
          <div className={clsx('text-sm font-medium', active ? '' : 'text-slate-800 dark:text-slate-100')}>{label}</div>
          <div className={clsx('text-xs', active ? 'text-white/80 dark:text-slate-900/80' : 'text-slate-500 dark:text-slate-400')}>{description}</div>
        </div>
      </div>
    </button>
  )
}


