try {
  const path = require('path')
  const pdfjsDistPath = path.dirname(require.resolve('pdfjs-dist/package.json'))
  console.log('Success:', pdfjsDistPath)
} catch (e) {
  console.error('Failed:', e.message)
}
