type Props = {
  file: File
}

export default function Preview({ file }: Props) {
  const url = URL.createObjectURL(file)
  const isSvg = file.type === 'image/svg+xml'
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-slate-800">
      <div className="w-16 h-16 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        {isSvg ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <img src={url} className="object-contain w-full h-full" />
        ) : (
          // eslint-disable-next-line jsx-a11y/alt-text
          <img src={url} className="object-cover w-full h-full" />
        )}
      </div>
      <div className="min-w-0">
        <div className="font-medium truncate">{file.name}</div>
        <div className="text-xs text-slate-500 truncate">{file.type || 'unknown'} · {(file.size / 1024).toFixed(1)} KB</div>
      </div>
    </div>
  )
}


