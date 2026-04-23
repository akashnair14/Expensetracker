// Initialize PDF.js lazily to avoid build-time ESM/CJS conflicts
let pdfjsInstance: any = null // eslint-disable-line @typescript-eslint/no-explicit-any

// Polyfill DOMMatrix for Node.js (required by pdfjs-dist 4+)
if (typeof window === 'undefined') {
  if (!global.DOMMatrix) {
    // @ts-expect-error - polyfilling DOMMatrix for Node.js
    global.DOMMatrix = class DOMMatrix {
      a: number = 1; b: number = 0; c: number = 0; d: number = 1; e: number = 0; f: number = 0;
      constructor(init: string | number[]) {
        if (typeof init === 'string') {
          // Very basic parsing for common cases
          if (init === 'matrix(1, 0, 0, 1, 0, 0)') return;
        } else if (Array.isArray(init)) {
          [this.a, this.b, this.c, this.d, this.e, this.f] = init;
        }
      }
      toString() { return `matrix(${this.a}, ${this.b}, ${this.c}, ${this.d}, ${this.e}, ${this.f})`; }
    };
  }
}

export const getPdfJs = async () => {
  if (pdfjsInstance) return pdfjsInstance

  // Use dynamic import for ESM compatibility in Next.js
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  
  if (typeof window === 'undefined') {
    try {
      const path = await import('path')
      const { createRequire } = await import('module')
      const require = createRequire(import.meta.url)
      
      const pdfjsDistPath = path.dirname(require.resolve('pdfjs-dist/package.json'))
      const workerPath = path.join(pdfjsDistPath, 'legacy', 'build', 'pdf.worker.mjs')
      
      pdfjs.GlobalWorkerOptions.workerSrc = workerPath
    } catch (error) {
      console.error('Failed to initialize PDF.js worker:', error)
    }
  }
  
  pdfjsInstance = pdfjs
  return pdfjs
}

/**
 * Ensures PDF.js is properly initialized
 */
export const initPdfJs = async () => {
  await getPdfJs()
  return true
}

export const getPdfConfig = async (data: Uint8Array) => {
  const config: Record<string, unknown> = {
    data,
    useSystemFonts: true,
    disableFontFace: true,
    verbosity: 0
  }

  if (typeof window === 'undefined') {
    try {
      const path = await import('path')
      const { createRequire } = await import('module')
      const require = createRequire(import.meta.url)
      const pdfjsDistPath = path.dirname(require.resolve('pdfjs-dist/package.json'))
      
      config.standardFontDataUrl = path.join(pdfjsDistPath, 'standard_fonts') + path.sep
      config.cMapUrl = path.join(pdfjsDistPath, 'cmaps') + path.sep
      config.cMapPacked = true
    } catch (error) {
      console.error('Failed to configure PDF.js server-side paths:', error)
    }
  }

  return config
}
