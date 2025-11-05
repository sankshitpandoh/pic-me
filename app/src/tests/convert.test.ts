import { describe, it, expect } from 'vitest'
import { convertFileToBase64 } from '../lib/convert'

function dataUrlMime(url: string) {
  return url.slice(5, url.indexOf(';'))
}

describe('convertFileToBase64', () => {
  it('converts a small png file to base64 data url', async () => {
    // 1x1 transparent PNG
    const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAH+gKXn9zO7wAAAABJRU5ErkJggg=='
    const file = new File([Uint8Array.from(atob(base64), c => c.charCodeAt(0))], 'pixel.png', { type: 'image/png' })
    const result = await convertFileToBase64(file, { targetFormat: 'png' })
    expect(result.dataUrl.startsWith('data:image/png;base64,')).toBe(true)
    expect(dataUrlMime(result.dataUrl)).toBe('image/png')
  })
})


