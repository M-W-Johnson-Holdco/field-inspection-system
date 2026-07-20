import JSZip from 'jszip'
import { collectInspectionPhotos } from './inspectionPhotos'
import { folderName } from './driveService'

function dataUrlToBlob(dataUrl) {
  const [header, b64] = String(dataUrl || '').split(',')
  if (!header || !b64) throw new Error('Invalid photo data')
  const mimeMatch = header.match(/:(.*?);/)
  const mime = mimeMatch?.[1] || 'image/jpeg'
  const bytes = atob(b64)
  const arr = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

function mimeToExt(mime) {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/gif') return 'gif'
  return 'jpg'
}

function ensureExt(name, mime) {
  if (/\.(jpe?g|png|webp|gif)$/i.test(name)) return name
  return `${name.replace(/\.[^.]+$/, '')}.${mimeToExt(mime)}`
}

function uniqueShareName(baseName, used) {
  let name = baseName
  let n = 2
  while (used.has(name.toLowerCase())) {
    const dot = baseName.lastIndexOf('.')
    const stem = dot >= 0 ? baseName.slice(0, dot) : baseName
    const ext = dot >= 0 ? baseName.slice(dot) : ''
    name = `${stem}-${n}${ext}`
    n += 1
  }
  used.add(name.toLowerCase())
  return name
}

async function photosToFiles(photos) {
  const used = new Set()
  const files = []
  for (const photo of photos) {
    const blob = dataUrlToBlob(photo.url)
    const flatBase = ensureExt(
      [...photo.path.slice(1), photo.name.replace(/\.[^.]+$/, '')].join('-') + '.jpg',
      blob.type,
    )
    const name = uniqueShareName(flatBase, used)
    files.push(new File([blob], name, { type: blob.type || 'image/jpeg' }))
  }
  return files
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

async function downloadPhotosZip(photos, rootFolderName) {
  const zip = new JSZip()
  const root = zip.folder(rootFolderName)
  if (!root) throw new Error('Could not create ZIP folder')

  for (const photo of photos) {
    const blob = dataUrlToBlob(photo.url)
    const relativePath = [...photo.path, photo.name].join('/')
    root.file(relativePath, blob)
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' })
  downloadBlob(zipBlob, `${rootFolderName}.zip`)
}

/**
 * Save inspection photos locally.
 * Phones with Web Share file support get the system share sheet (Save to Photos).
 * Otherwise downloads a ZIP named after the inspection folder.
 *
 * @returns {'shared' | 'downloaded' | 'empty' | 'aborted'}
 */
export async function savePhotosLocal(inspectionData, inspectorName) {
  const photos = collectInspectionPhotos(inspectionData)
  if (photos.length === 0) return 'empty'

  const rootName = folderName(inspectionData.jobInfo, inspectorName) || 'inspection-photos'
  const files = await photosToFiles(photos)

  if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files })) {
    try {
      // iOS: files-only payload; title/text/url can break image sharing.
      await navigator.share({ files })
      return 'shared'
    } catch (err) {
      if (err?.name === 'AbortError') return 'aborted'
      // Fall through to ZIP if share fails for other reasons.
      console.warn('Web Share failed, falling back to ZIP:', err)
    }
  }

  await downloadPhotosZip(photos, rootName)
  return 'downloaded'
}
