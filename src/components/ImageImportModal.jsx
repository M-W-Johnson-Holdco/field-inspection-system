import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronRight, Folder, ImagePlus, Undo2, Upload, X } from 'lucide-react'
import { useInspection } from '../context/InspectionContext'
import { buildPhotoTargetTree, findNodeByPath, getLeafPhotos } from '../lib/photoTargets'
import PhotoLightbox from './PhotoLightbox'
import ModalSheetBack from './ModalSheetBack'

let stagingId = 0
function nextStagingId() {
  stagingId += 1
  return `img-${Date.now()}-${stagingId}`
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error(`Could not read ${file.name || 'file'}`))
    reader.readAsDataURL(file)
  })
}

function revokePreview(item) {
  if (item?.previewUrl && item.previewUrl.startsWith('blob:')) {
    URL.revokeObjectURL(item.previewUrl)
  }
}

export default function ImageImportModal({ onBack, onClose }) {
  const {
    data,
    addRoofPhoto,
    addElevPhoto,
    addInteriorPhoto,
    addExteriorPhoto,
    removeRoofPhoto,
    removeElevPhoto,
    removeInteriorPhoto,
    removeExteriorPhoto,
  } = useInspection()

  const fileInputRef = useRef(null)
  const poolRef = useRef([])
  const [pool, setPool] = useState([])
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [path, setPath] = useState([])
  const [viewingLeaf, setViewingLeaf] = useState(null)
  const [assignedCount, setAssignedCount] = useState(0)
  const [poolDragOver, setPoolDragOver] = useState(false)
  const [dropTargetId, setDropTargetId] = useState(null)
  const [assigning, setAssigning] = useState(false)
  const [lightboxPhotos, setLightboxPhotos] = useState(null)
  const [lightboxIndex, setLightboxIndex] = useState(null)

  useEffect(() => {
    poolRef.current = pool
  }, [pool])

  useEffect(() => () => {
    poolRef.current.forEach(revokePreview)
  }, [])

  const tree = useMemo(() => buildPhotoTargetTree(data), [data])
  const currentNode = path.length ? findNodeByPath(tree, path) : null
  const currentChildren = currentNode ? (currentNode.children || []) : tree
  const leafPhotos = useMemo(
    () => (viewingLeaf ? getLeafPhotos(data, viewingLeaf) : []),
    [data, viewingLeaf]
  )

  const breadcrumbs = useMemo(() => {
    const crumbs = [{ id: null, label: 'Categories' }]
    let nodes = tree
    for (const id of path) {
      const node = nodes.find(n => n.id === id)
      if (!node) break
      crumbs.push({ id: node.id, label: node.label })
      nodes = node.children || []
    }
    if (viewingLeaf) {
      crumbs.push({ id: viewingLeaf.id, label: viewingLeaf.label, viewing: true })
    }
    return crumbs
  }, [tree, path, viewingLeaf])

  function openFilePicker() {
    fileInputRef.current?.click()
  }

  function addFiles(fileList) {
    const files = Array.from(fileList || [])
    if (!files.length) return

    const items = files.map(file => ({
      id: nextStagingId(),
      file,
      previewUrl: URL.createObjectURL(file),
      name: file.name || 'Photo',
    }))
    setPool(prev => [...prev, ...items])
  }

  function handleFileChange(e) {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    addFiles(files)
  }

  function toggleSelect(id) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function openLightbox(photos, index) {
    if (!photos?.length || index == null || index < 0) return
    setLightboxPhotos(photos)
    setLightboxIndex(index)
  }

  function closeLightbox() {
    setLightboxPhotos(null)
    setLightboxIndex(null)
  }

  function goLightboxPrev() {
    setLightboxIndex(current => (current > 0 ? current - 1 : current))
  }

  function goLightboxNext() {
    setLightboxIndex(current => (
      lightboxPhotos && current < lightboxPhotos.length - 1 ? current + 1 : current
    ))
  }

  function removeFromPool(ids) {
    const removeSet = new Set(ids)
    setPool(prev => {
      prev.filter(item => removeSet.has(item.id)).forEach(revokePreview)
      return prev.filter(item => !removeSet.has(item.id))
    })
    setSelectedIds(prev => new Set([...prev].filter(id => !removeSet.has(id))))
  }

  async function resolveDataUrl(item) {
    if (item.dataUrl) return item.dataUrl
    if (item.file) return readFileAsDataUrl(item.file)
    if (item.previewUrl) return item.previewUrl
    throw new Error('Missing photo data')
  }

  async function assignPhotos(leaf, items) {
    if (!leaf?.leaf || !items.length || assigning) return
    setAssigning(true)
    try {
      for (const item of items) {
        const dataUrl = await resolveDataUrl(item)
        if (leaf.kind === 'roof') addRoofPhoto(leaf.target, dataUrl)
        else if (leaf.kind === 'elev') addElevPhoto(leaf.target, dataUrl)
        else if (leaf.kind === 'interior') addInteriorPhoto(leaf.target, dataUrl)
        else if (leaf.kind === 'exterior') addExteriorPhoto(leaf.target, dataUrl)
      }
      removeFromPool(items.map(item => item.id))
      setAssignedCount(prev => prev + items.length)
      setDropTargetId(null)
    } finally {
      setAssigning(false)
    }
  }

  function returnPhotoToPool(leaf, index) {
    const photos = getLeafPhotos(data, leaf)
    const dataUrl = photos[index]
    if (!dataUrl) return

    if (leaf.kind === 'roof') removeRoofPhoto(leaf.target, index)
    else if (leaf.kind === 'elev') removeElevPhoto(leaf.target, index)
    else if (leaf.kind === 'interior') removeInteriorPhoto(leaf.target, index)
    else if (leaf.kind === 'exterior') removeExteriorPhoto(leaf.target, index)

    setPool(prev => [
      ...prev,
      {
        id: nextStagingId(),
        file: null,
        previewUrl: dataUrl,
        dataUrl,
        name: `${leaf.label} photo`,
      },
    ])
    setAssignedCount(prev => Math.max(0, prev - 1))
  }

  function itemsForAssign(draggedId) {
    if (draggedId && selectedIds.has(draggedId)) {
      return pool.filter(item => selectedIds.has(item.id))
    }
    if (draggedId) {
      const one = pool.find(item => item.id === draggedId)
      return one ? [one] : []
    }
    if (selectedIds.size) {
      return pool.filter(item => selectedIds.has(item.id))
    }
    return []
  }

  function handleLeafActivate(leaf) {
    const items = itemsForAssign()
    if (items.length) {
      assignPhotos(leaf, items)
      return
    }
    setViewingLeaf(leaf)
  }

  function navigateTo(crumbIndex) {
    setViewingLeaf(null)
    if (crumbIndex === 0) {
      setPath([])
      return
    }
    // Last crumb may be the viewing leaf — going to previous folder crumb.
    const folderCrumbs = breadcrumbs.filter(c => !c.viewing)
    if (crumbIndex >= folderCrumbs.length) return
    setPath(path.slice(0, crumbIndex))
  }

  function enterFolder(node) {
    if (node.leaf) return
    setViewingLeaf(null)
    setPath(prev => [...prev, node.id])
  }

  function onPoolDragOver(e) {
    e.preventDefault()
    e.stopPropagation()
    setPoolDragOver(true)
  }

  function onPoolDragLeave(e) {
    e.preventDefault()
    e.stopPropagation()
    setPoolDragOver(false)
  }

  function onPoolDrop(e) {
    e.preventDefault()
    e.stopPropagation()
    setPoolDragOver(false)
    addFiles(e.dataTransfer?.files)
  }

  function onThumbDragStart(e, id) {
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
  }

  function onLeafDragOver(e, leafId) {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setDropTargetId(leafId)
  }

  function onLeafDragLeave(e, leafId) {
    e.preventDefault()
    e.stopPropagation()
    setDropTargetId(current => (current === leafId ? null : current))
  }

  function onLeafDrop(e, leaf) {
    e.preventDefault()
    e.stopPropagation()
    const draggedId = e.dataTransfer.getData('text/plain')
    const items = itemsForAssign(draggedId)
    assignPhotos(leaf, items)
  }

  function onLeafDetailDragOver(e) {
    if (!viewingLeaf) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setDropTargetId(viewingLeaf.id)
  }

  function onLeafDetailDrop(e) {
    if (!viewingLeaf) return
    e.preventDefault()
    e.stopPropagation()
    const draggedId = e.dataTransfer.getData('text/plain')
    const items = itemsForAssign(draggedId)
    assignPhotos(viewingLeaf, items)
  }

  const folderEmptyHint = (() => {
    if (viewingLeaf) return null
    if (currentChildren.length) return null
    if (currentNode?.emptyHint) return currentNode.emptyHint
    if (!path.length) return 'No categories available.'
    return 'Nothing to assign here yet.'
  })()

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div
        className="modal-sheet image-import-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-import-title"
      >
        <div className="modal-sheet__header">
          <div className="modal-sheet__header-main">
            {onBack && <ModalSheetBack onClick={onBack} />}
            <h2 id="image-import-title" className="modal-sheet__title">Import Images</h2>
          </div>
          <button className="modal-sheet__close" type="button" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="image-import-modal__body">
          <p className="image-import-modal__intro">
            Upload photos into the staging pool, then drag or select and tap a category to assign them.
            Tap a photo to enlarge it. Tap a category with nothing selected to review assigned photos.
          </p>

          <div className="image-import-modal__status">
            {pool.length} photo{pool.length === 1 ? '' : 's'} remaining · {assignedCount} assigned
            {selectedIds.size > 0 && (
              <>
                {' · '}
                {selectedIds.size} selected
              </>
            )}
          </div>

          <div className="image-import-modal__layout">
            <section
              className={`image-import-modal__pool${poolDragOver ? ' image-import-modal__pool--drag' : ''}`}
              onDragOver={onPoolDragOver}
              onDragLeave={onPoolDragLeave}
              onDrop={onPoolDrop}
            >
              <div className="image-import-modal__pool-header">
                <h3>Staging pool</h3>
                <button type="button" className="app-button app-button--secondary" onClick={openFilePicker}>
                  <Upload size={16} aria-hidden="true" />
                  <span>Add photos</span>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              {pool.length === 0 ? (
                <button type="button" className="image-import-modal__pool-empty" onClick={openFilePicker}>
                  <ImagePlus size={28} aria-hidden="true" />
                  <span>Tap to add photos, or drop image files here</span>
                </button>
              ) : (
                <div className="image-import-modal__thumbs">
                  {pool.map((item, index) => {
                    const selected = selectedIds.has(item.id)
                    return (
                      <div
                        key={item.id}
                        className={`image-import-modal__thumb${selected ? ' image-import-modal__thumb--selected' : ''}`}
                      >
                        <button
                          type="button"
                          className="image-import-modal__thumb-btn"
                          draggable
                          onDragStart={e => onThumbDragStart(e, item.id)}
                          onClick={() => openLightbox(pool.map(entry => entry.previewUrl), index)}
                          title={item.name}
                          aria-label={`View ${item.name || 'photo'} ${index + 1} of ${pool.length}`}
                        >
                          <img
                            src={item.previewUrl}
                            alt={item.name}
                            onError={e => {
                              e.currentTarget.style.display = 'none'
                              e.currentTarget.closest('.image-import-modal__thumb')?.classList.add('image-import-modal__thumb--broken')
                            }}
                          />
                          <span className="image-import-modal__thumb-fallback">{item.name}</span>
                        </button>
                        <button
                          type="button"
                          className={`image-import-modal__thumb-select${selected ? ' image-import-modal__thumb-select--on' : ''}`}
                          onClick={e => {
                            e.stopPropagation()
                            toggleSelect(item.id)
                          }}
                          aria-pressed={selected}
                          aria-label={selected ? 'Deselect photo' : 'Select photo'}
                          title={selected ? 'Deselect' : 'Select'}
                        >
                          <Check size={14} aria-hidden="true" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            <section className="image-import-modal__browser">
              <nav className="image-import-modal__crumbs" aria-label="Category path">
                {breadcrumbs.map((crumb, index) => (
                  <span key={`${crumb.id ?? 'root'}-${index}`} className="image-import-modal__crumb">
                    {index > 0 && <ChevronRight size={14} aria-hidden="true" />}
                    <button
                      type="button"
                      className="image-import-modal__crumb-btn"
                      onClick={() => navigateTo(index)}
                      disabled={index === breadcrumbs.length - 1}
                    >
                      {crumb.label}
                    </button>
                  </span>
                ))}
              </nav>

              <div
                className="image-import-modal__list"
                onDragOver={viewingLeaf ? onLeafDetailDragOver : undefined}
                onDrop={viewingLeaf ? onLeafDetailDrop : undefined}
              >
                {viewingLeaf ? (
                  <div className={`image-import-modal__leaf-detail${dropTargetId === viewingLeaf.id ? ' image-import-modal__leaf-detail--drop' : ''}`}>
                    <div className="image-import-modal__leaf-detail-header">
                      <p className="image-import-modal__leaf-detail-count">
                        {leafPhotos.length} photo{leafPhotos.length === 1 ? '' : 's'} assigned
                      </p>
                    </div>

                    {leafPhotos.length === 0 ? (
                      <p className="image-import-modal__empty">
                        No photos assigned yet.
                        {selectedIds.size > 0 ? ' Tap Assign below, or drag photos here.' : ' Select photos in the staging pool, then assign them here.'}
                      </p>
                    ) : (
                      <div className="image-import-modal__thumbs image-import-modal__thumbs--assigned">
                        {leafPhotos.map((src, index) => (
                          <div key={`${viewingLeaf.id}-${index}`} className="image-import-modal__thumb">
                            <button
                              type="button"
                              className="image-import-modal__thumb-btn"
                              onClick={() => openLightbox(leafPhotos, index)}
                              aria-label={`View assigned photo ${index + 1} of ${leafPhotos.length}`}
                            >
                              <img src={src} alt="" />
                            </button>
                            <button
                              type="button"
                              className="image-import-modal__thumb-return"
                              onClick={e => {
                                e.stopPropagation()
                                returnPhotoToPool(viewingLeaf, index)
                              }}
                              aria-label="Return photo to staging pool"
                              title="Return to staging pool"
                            >
                              <Undo2 size={14} aria-hidden="true" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedIds.size > 0 && (
                      <button
                        type="button"
                        className="app-button app-button--primary image-import-modal__assign-here"
                        onClick={() => assignPhotos(viewingLeaf, itemsForAssign())}
                        disabled={assigning}
                      >
                        Assign {selectedIds.size} selected here
                      </button>
                    )}
                  </div>
                ) : folderEmptyHint ? (
                  <p className="image-import-modal__empty">{folderEmptyHint}</p>
                ) : (
                  currentChildren.map(node => {
                    if (node.leaf) {
                      const isDrop = dropTargetId === node.id
                      const canAssign = selectedIds.size > 0
                      return (
                        <button
                          key={node.id}
                          type="button"
                          className={[
                            'image-import-modal__row',
                            'image-import-modal__row--leaf',
                            isDrop ? 'image-import-modal__row--drop' : '',
                            canAssign ? 'image-import-modal__row--ready' : '',
                          ].filter(Boolean).join(' ')}
                          onClick={() => handleLeafActivate(node)}
                          onDragOver={e => onLeafDragOver(e, node.id)}
                          onDragLeave={e => onLeafDragLeave(e, node.id)}
                          onDrop={e => onLeafDrop(e, node)}
                        >
                          <span className="image-import-modal__row-label">{node.label}</span>
                          <span className="image-import-modal__row-meta">
                            {node.photoCount} photo{node.photoCount === 1 ? '' : 's'}
                            <ChevronRight size={16} aria-hidden="true" />
                          </span>
                        </button>
                      )
                    }

                    const childCount = (node.children || []).length
                    return (
                      <button
                        key={node.id}
                        type="button"
                        className="image-import-modal__row image-import-modal__row--folder"
                        onClick={() => enterFolder(node)}
                      >
                        <Folder size={18} aria-hidden="true" />
                        <span className="image-import-modal__row-label">{node.label}</span>
                        <span className="image-import-modal__row-meta">
                          {childCount}
                          <ChevronRight size={16} aria-hidden="true" />
                        </span>
                      </button>
                    )
                  })
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      {lightboxIndex != null && lightboxPhotos && (
        <PhotoLightbox
          photos={lightboxPhotos}
          index={lightboxIndex}
          onClose={closeLightbox}
          onPrev={goLightboxPrev}
          onNext={goLightboxNext}
        />
      )}
    </>
  )
}
