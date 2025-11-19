import { useEffect, useMemo } from 'react'

type Props = {
  file: File
}

export default function Preview({ file }: Props) {
  const url = useMemo(() => URL.createObjectURL(file), [file])
  useEffect(() => {
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [url])
  const isSvg = file.type === 'image/svg+xml'
  return (
    <div className="flex items-center gap-4 p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80">
      <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-950/40 ring-1 ring-slate-800 flex items-center justify-center">
        {isSvg ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <img src={url} className="object-contain w-full h-full" />
        ) : (
          // eslint-disable-next-line jsx-a11y/alt-text
          <img src={url} className="object-cover w-full h-full" />
        )}
      </div>
      <div className="min-w-0">
        <div className="font-medium truncate text-white">{file.name}</div>
        <div className="text-xs text-slate-500 truncate">{file.type || 'unknown'} · {(file.size / 1024).toFixed(1)} KB</div>
      </div>
    </div>
  )
}


