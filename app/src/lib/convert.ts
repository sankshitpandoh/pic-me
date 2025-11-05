import type { ConvertOptions, ConvertResult } from '../types'
import { computeResize, estimateBase64SizeBytes, isSvgMime, normalizeTargetMime } from './utils'

async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return await file.arrayBuffer()
}

async function readFileAsText(file: File): Promise<string> {
  const decoder = new TextDecoder()
  const buf = await file.arrayBuffer()
  return decoder.decode(buf)
}

function textToDataUrl(text: string, mime = 'text/plain'): string {
  const encoded = typeof btoa !== 'undefined' ? btoa(unescape(encodeURIComponent(text))) : Buffer.from(text, 'utf8').toString('base64')
  return `data:${mime};base64,${encoded}`
}

async function blobToImageBitmap(blob: Blob): Promise<ImageBitmap> {
  return await createImageBitmap(blob)
}

export async function convertFileToBase64(file: File, options: ConvertOptions = {}): Promise<ConvertResult> {
  const originalMime = file.type || 'application/octet-stream'
  const targetMime = normalizeTargetMime(originalMime, options.targetFormat)

  // SVG passthrough (or to svg target)
  if (isSvgMime(originalMime) && (options.targetFormat === 'svg' || options.targetFormat === 'original' || !options.targetFormat)) {
    const text = await readFileAsText(file)
    const dataUrl = textToDataUrl(text, 'image/svg+xml')
    return { dataUrl, mime: 'image/svg+xml', sizeBytes: estimateBase64SizeBytes(dataUrl), fileName: file.name }
  }

  // If no transform required and file is already base64-friendly, read as data URL directly
  if (options.targetFormat === 'original' || (!options.targetFormat && originalMime.startsWith('image/'))) {
    // We still may need to resize or apply background if jpeg with alpha; handle via canvas when resize/background provided
    const needsCanvas = Boolean(options.resize) || (targetMime === 'image/jpeg')
    if (!needsCanvas) {
      const buf = await readFileAsArrayBuffer(file)
      const base64 = typeof btoa !== 'undefined' ? btoa(String.fromCharCode(...new Uint8Array(buf))) : Buffer.from(buf).toString('base64')
      const dataUrl = `data:${originalMime};base64,${base64}`
      return { dataUrl, mime: originalMime, sizeBytes: estimateBase64SizeBytes(dataUrl), fileName: file.name }
    }
  }

  // Convert via canvas (resize/format/quality)
  const blob = new Blob([await readFileAsArrayBuffer(file)], { type: originalMime })
  let bitmap: ImageBitmap
  try {
    bitmap = await blobToImageBitmap(blob)
  } catch {
    // Fallback to HTMLImageElement if createImageBitmap not available for this type
    const url = URL.createObjectURL(blob)
    bitmap = await new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        resolve(createImageBitmap(img))
        URL.revokeObjectURL(url)
      }
      img.onerror = (e) => {
        URL.revokeObjectURL(url)
        reject(e)
      }
      img.src = url
    })
  }

  const { width: srcW, height: srcH } = bitmap
  const fit = options.resize?.fit ?? 'contain'
  const { width, height, sx, sy, sWidth, sHeight } = computeResize(srcW, srcH, options.resize?.maxWidth, options.resize?.maxHeight, fit)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  if (targetMime === 'image/jpeg' && options.background) {
    ctx.fillStyle = options.background
    ctx.fillRect(0, 0, width, height)
  }
  ctx.drawImage(bitmap, sx, sy, sWidth, sHeight, 0, 0, width, height)

  const quality = typeof options.quality === 'number' ? options.quality : 0.92
  const dataUrl = canvas.toDataURL(targetMime, quality)
  return { dataUrl, mime: targetMime, sizeBytes: estimateBase64SizeBytes(dataUrl), width, height, fileName: file.name }
}


