import { convertFileToBase64 } from '../convert'
import type { ConvertOptions, ConvertResult } from '../../types'

type RequestMessage = {
  id: string
  file: File
  options: ConvertOptions
}

type ResponseMessage = {
  id: string
  ok: true
  result: ConvertResult
} | {
  id: string
  ok: false
  error: string
}

self.onmessage = async (ev: MessageEvent<RequestMessage>) => {
  const { id, file, options } = ev.data
  try {
    const result = await convertFileToBase64(file, options)
    const message: ResponseMessage = { id, ok: true, result }
    // @ts-ignore
    self.postMessage(message)
  } catch (e: any) {
    const message: ResponseMessage = { id, ok: false, error: e?.message ?? String(e) }
    // @ts-ignore
    self.postMessage(message)
  }
}


