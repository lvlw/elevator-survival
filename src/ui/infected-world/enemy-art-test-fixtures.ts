// TEST ONLY. Controlled native-resource boundary, not browser evidence or a replacement game view.
import { act } from 'react'
import { vi } from 'vitest'
import approval from '../../../docs/engineering/world-integration/presentation-c2-001/inputs/APPROVED-ASSETS.json'
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

export function installEnemyArtImages() {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'Image')
  const requests: ControlledImage[] = []
  class ControlledImage {
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    naturalWidth = 0
    naturalHeight = 0
    resolveDecode!: () => void
    rejectDecode!: (error: Error) => void
    private decoding = new Promise<void>((resolve, reject) => { this.resolveDecode = resolve; this.rejectDecode = reject })
    decode = vi.fn(() => this.decoding)
    private url = ''
    set src(value: string) { this.url = value; requests.push(this) }
    get src() { return this.url }
    load(width?: number, height?: number) {
      const row = approval.assets.find(a => this.src.split('?')[0].endsWith(a.destinationPath.split('/').at(-1)!))
      if (!row) throw Error('TEST unexpected art URL: ' + this.src)
      this.naturalWidth = width ?? row.nativePixels[0]; this.naturalHeight = height ?? row.nativePixels[1]
      this.onload?.()
    }
  }
  Object.defineProperty(globalThis, 'Image', { configurable: true, writable: true, value: ControlledImage })
  return { requests,
    async finish(images = requests) { await act(async () => { for (const image of images) { image.load(); image.resolveDecode() } await Promise.resolve() }) },
    restore() { if (original) Object.defineProperty(globalThis, 'Image', original); else Reflect.deleteProperty(globalThis, 'Image') },
  }
}
