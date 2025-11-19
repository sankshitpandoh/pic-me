import { useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import clsx from 'clsx'

type Props = {
  onFiles: (files: File[]) => void
  className?: string
}

export default function ImageDropzone({ onFiles, className }: Props) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onFiles(acceptedFiles)
  }, [onFiles])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg']
    },
    multiple: true,
  })

  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items
      if (!items) return
      const files: File[] = []
      for (const item of items) {
        if (item.kind === 'file') {
          const file = item.getAsFile()
          if (file) files.push(file)
        }
      }
      if (files.length) onFiles(files)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [onFiles])

  return (
    <div
      {...getRootProps()}
      className={clsx(
        'group relative overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/70 p-10 text-center cursor-pointer shadow-[0_20px_60px_rgba(2,6,23,0.5)] backdrop-blur',
        isDragActive ? 'ring-2 ring-sky-500/60' : 'hover:border-slate-700/70',
        className,
      )}
      aria-label="Upload images by dropping, clicking or pasting"
      aria-describedby="dropzone-hint"
    >
      <input {...getInputProps()} aria-label="Choose image files" />
      <div className="mx-auto mb-4 h-14 w-14 rounded-2xl border border-sky-500/40 bg-sky-500/15 text-sky-300 flex items-center justify-center">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 16l-4-4m4 4l4-4m-4 4V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <rect x="3" y="12" width="18" height="8.5" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
      </div>
      <p className="text-xl font-semibold text-white">Drag & Drop Image Here</p>
      <p className="text-sm text-slate-400 mt-2">or click to browse from your device</p>
      <div className="mt-4">
        <span className="btn-primary inline-flex">Browse Files</span>
      </div>
      <p className="text-xs text-slate-500 mt-3">PNG, JPEG, WEBP, GIF, BMP, SVG</p>
      <p id="dropzone-hint" className="mt-3 text-xs text-slate-500">
        Tip: Press <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-700 bg-slate-900/70">Ctrl<span aria-hidden>+</span>V</span>/<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-700 bg-slate-900/70">⌘<span aria-hidden>+</span>V</span> to paste from clipboard
      </p>
      <div className={clsx('pointer-events-none absolute inset-x-0 -bottom-24 h-48 bg-gradient-to-t from-sky-500/10 to-transparent transition-opacity', isDragActive ? 'opacity-100' : 'opacity-0')} />
    </div>
  )
}


