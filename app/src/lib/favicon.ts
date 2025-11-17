import { computeResize } from './utils'

type GeneratedPng = {
  size: number
  data: Uint8Array
  dataUrl: string
}

async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return await file.arrayBuffer()
}

async function blobToImageBitmap(blob: Blob): Promise<ImageBitmap> {
  return await createImageBitmap(blob)
}

function isDomAvailable(): boolean {
  return typeof document !== 'undefined' && typeof (document as any).createElement === 'function'
}

function createCanvas(width: number, height: number): { canvas: HTMLCanvasElement | OffscreenCanvas; ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D } {
  if (typeof OffscreenCanvas !== 'undefined' && !isDomAvailable()) {
    const canvas = new OffscreenCanvas(width, height)
    const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D
    return { canvas, ctx }
  }
  const canvas = (document as Document).createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
  return { canvas, ctx }
}

async function canvasToBlob(canvas: HTMLCanvasElement | OffscreenCanvas, type: string): Promise<Blob> {
  const anyCanvas = canvas as any
  if (typeof anyCanvas.convertToBlob === 'function') {
    return await (anyCanvas as OffscreenCanvas).convertToBlob({ type })
  }
  return await new Promise<Blob>((resolve) => (canvas as HTMLCanvasElement).toBlob((b) => resolve(b as Blob), type)!)
}

async function arrayBufferToUint8(blob: Blob): Promise<Uint8Array> {
  const buf = await blob.arrayBuffer()
  return new Uint8Array(buf)
}

async function generateSizedPng(bitmap: ImageBitmap, size: number): Promise<GeneratedPng> {
  // Cover to square canvas of target size
  const srcW = bitmap.width
  const srcH = bitmap.height
  const { sx, sy, sWidth, sHeight } = computeResize(srcW, srcH, size, size, 'cover')
  const { canvas, ctx } = createCanvas(size, size)
  ;(ctx as any).drawImage(bitmap as any, sx, sy, sWidth, sHeight, 0, 0, size, size)
  const blob = await canvasToBlob(canvas, 'image/png')
  const data = await arrayBufferToUint8(blob)

  // Preview data URL for UI
  let dataUrl = ''
  if (typeof FileReader !== 'undefined') {
    dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(reader.error)
      reader.onload = () => resolve(String(reader.result))
      reader.readAsDataURL(blob)
    })
  }
  return { size, data, dataUrl }
}

function buildIcoFromPngs(pngs: GeneratedPng[]): Uint8Array {
  // ICO Header (6 bytes) + N directory entries (16 bytes each) + image data
  const count = pngs.length
  const dirSize = 6 + 16 * count
  const dataSize = pngs.reduce((acc, p) => acc + p.data.byteLength, 0)
  const totalSize = dirSize + dataSize
  const out = new Uint8Array(totalSize)
  const view = new DataView(out.buffer)

  // ICONDIR
  view.setUint16(0, 0, true)      // reserved
  view.setUint16(2, 1, true)      // type = 1 (icon)
  view.setUint16(4, count, true)  // count

  // Directory entries
  let offset = dirSize
  for (let i = 0; i < count; i++) {
    const { size, data } = pngs[i]
    const entryPos = 6 + 16 * i
    const widthByte = size >= 256 ? 0 : size
    const heightByte = size >= 256 ? 0 : size
    out[entryPos + 0] = widthByte
    out[entryPos + 1] = heightByte
    out[entryPos + 2] = 0 // color count
    out[entryPos + 3] = 0 // reserved
    view.setUint16(entryPos + 4, 1, true)   // planes
    view.setUint16(entryPos + 6, 32, true)  // bit count
    view.setUint32(entryPos + 8, data.byteLength, true) // bytes in res
    view.setUint32(entryPos + 12, offset, true)         // image offset
    out.set(data, offset)
    offset += data.byteLength
  }
  return out
}

export type FaviconResult = {
  blob: Blob
  sizeBytes: number
  mime: string
  fileName: string
  previews: Array<{ size: number; dataUrl: string }>
}

export async function generateIcoFromImage(file: File, sizes: number[] = [16, 32, 48, 64, 128, 256]): Promise<FaviconResult> {
  const cleanSizes = Array.from(new Set(sizes.filter((s) => Number.isFinite(s) && s > 0 && s <= 256).map((s) => Math.round(s)))).sort((a, b) => a - b)
  if (cleanSizes.length === 0) {
    throw new Error('Please choose at least one valid size (1–256).')
  }
  const srcBlob = new Blob([await readFileAsArrayBuffer(file)], { type: file.type || 'application/octet-stream' })
  let bitmap: ImageBitmap
  try {
    bitmap = await blobToImageBitmap(srcBlob)
  } catch (e) {
    if (!isDomAvailable()) throw e
    const url = URL.createObjectURL(srcBlob)
    bitmap = await new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        resolve(createImageBitmap(img))
        URL.revokeObjectURL(url)
      }
      img.onerror = (err) => {
        URL.revokeObjectURL(url)
        reject(err)
      }
      img.src = url
    })
  }
  const pngs: GeneratedPng[] = []
  for (const s of cleanSizes) {
    pngs.push(await generateSizedPng(bitmap, s))
  }
  const icoBytes = buildIcoFromPngs(pngs)
  const blob = new Blob([icoBytes], { type: 'image/x-icon' })
  return {
    blob,
    sizeBytes: icoBytes.byteLength,
    mime: 'image/x-icon',
    fileName: 'favicon.ico',
    previews: pngs.map((p) => ({ size: p.size, dataUrl: p.dataUrl })),
  }
}


