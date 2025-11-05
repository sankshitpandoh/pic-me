import { useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import clsx from 'clsx'

type Props = {
  onFiles: (files: File[]) => void
}

export default function ImageDropzone({ onFiles }: Props) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onFiles(acceptedFiles)
  }, [onFiles])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg', '.heic', '.heif']
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
        'border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
        'bg-white/60 dark:bg-white/5 backdrop-blur',
        isDragActive ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20' : 'border-slate-300 dark:border-slate-700',
      )}
      aria-label="Upload images by dropping, clicking or pasting"
    >
      <input {...getInputProps()} aria-label="Choose image files" />
      <p className="text-lg font-medium">Drag & drop images here, click to browse, or paste</p>
      <p className="text-sm text-slate-500 mt-2">PNG, JPEG, WEBP, GIF, BMP, SVG, HEIC/HEIF</p>
    </div>
  )
}


