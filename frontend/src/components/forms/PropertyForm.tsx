import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { useToast } from '../../context/ToastContext'
import { errorMessage, fieldErrors, fileUrl } from '../../services/api'
import { propertiesApi } from '../../services/crm'
import type { Property, PropertyImage } from '../../types'
import { SelectInput, TextArea, TextInput } from '../Form'
import { toApi } from '../../utils/forms'
import { FormFooter, Modal } from '../Modal'

const MAX_MB = 5
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

interface PendingImage {
  file: File
  preview: string
}

/** Add / edit a property and manage its photo gallery (multiple uploads). */
export function PropertyForm({ property, onClose, onSaved }: {
  property?: Property | null
  onClose: () => void
  onSaved: (p: Property) => void
}) {
  const { meta, users, refresh } = useData()
  const { user } = useAuth()
  const toast = useToast()
  const fileInput = useRef<HTMLInputElement>(null)
  const [v, setV] = useState<Record<string, string>>({
    title: property?.title ?? '',
    listingType: property?.listingType ?? 'Sale',
    category: property?.category ?? 'Residential',
    propertyType: property?.propertyType ?? 'Apartment',
    price: property?.price?.toString() ?? '',
    bedrooms: property?.bedrooms?.toString() ?? '',
    areaSqft: property?.areaSqft?.toString() ?? '',
    city: property?.city ?? '',
    locality: property?.locality ?? '',
    address: property?.address ?? '',
    status: property?.status ?? 'Available',
    agentId: property ? (property.agentId ?? '') : (user?.id ?? ''),
    description: property?.description ?? '',
  })
  const [existing, setExisting] = useState<PropertyImage[]>(property?.images ?? [])
  const [pending, setPending] = useState<PendingImage[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const set = (k: string) => (val: string) => setV((p) => ({ ...p, [k]: val }))

  // Free preview URLs when the dialog closes.
  const pendingRef = useRef(pending)
  pendingRef.current = pending
  useEffect(() => () => pendingRef.current.forEach((p) => URL.revokeObjectURL(p.preview)), [])

  const addFiles = (files: FileList | File[]) => {
    const accepted: PendingImage[] = []
    const rejected: string[] = []
    for (const f of Array.from(files)) {
      if (!IMAGE_TYPES.includes(f.type)) rejected.push(`${f.name} (type)`)
      else if (f.size > MAX_MB * 1024 * 1024) rejected.push(`${f.name} (> ${MAX_MB} MB)`)
      else accepted.push({ file: f, preview: URL.createObjectURL(f) })
    }
    if (rejected.length) toast(`Skipped: ${rejected.join(', ')}`, 'error')
    setPending((p) => [...p, ...accepted])
  }

  const removeExisting = async (img: PropertyImage) => {
    if (!property) return
    try {
      const updated = await propertiesApi.removeImage(property.id, img.id)
      setExisting(updated.images)
      onSaved(updated)
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }

  const makeCover = async (img: PropertyImage) => {
    if (!property) return
    try {
      const updated = await propertiesApi.reorderImages(property.id, [img.id])
      setExisting(updated.images)
      onSaved(updated)
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }

  const save = async () => {
    if (v.title.trim().length < 2) return setErrors({ title: 'Title is required' })
    setSaving(true)
    setErrors({})
    setFormError(null)
    try {
      const body = toApi(v, ['price', 'bedrooms', 'areaSqft'])
      let saved = property
        ? await propertiesApi.update(property.id, body)
        : await propertiesApi.create(body)
      if (pending.length) {
        try {
          saved = await propertiesApi.uploadImages(saved.id, pending.map((p) => p.file))
        } catch (err) {
          // Details are saved; tell the user only the photos failed.
          onSaved(saved)
          refresh(['properties'])
          setFormError(`Property saved, but images failed: ${errorMessage(err)}`)
          return
        }
      }
      refresh(['properties'])
      toast('Property saved.')
      onSaved(saved)
      onClose()
    } catch (err) {
      setErrors(fieldErrors(err))
      setFormError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={property ? 'Edit Property' : 'New Property'}
      onClose={onClose}
      onSubmit={save}
      size="wide"
      footer={<FormFooter onCancel={onClose} saving={saving} />}
    >
      {formError && <div className="form-error">{formError}</div>}
      <div className="section-label">Images</div>
      <div
        className={`img-drop ${dragOver ? 'dragover' : ''}`}
        onClick={() => fileInput.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          addFiles(e.dataTransfer.files)
        }}
      >
        📷 Click or drop property photos here (JPG/PNG/WebP, max {MAX_MB} MB each)
      </div>
      <input
        ref={fileInput}
        type="file"
        accept={IMAGE_TYPES.join(',')}
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <div className="img-thumbs">
        {existing.map((img, i) => (
          <div key={img.id} className={`img-thumb ${i === 0 ? 'cover' : ''}`}>
            <img src={fileUrl(img.url)} alt={img.originalName} />
            <button type="button" className="rm" onClick={() => removeExisting(img)} title="Delete image">
              ✕
            </button>
            {i > 0 && (
              <button type="button" className="mk" onClick={() => makeCover(img)} title="Make cover">
                ★
              </button>
            )}
          </div>
        ))}
        {pending.map((p, i) => (
          <div key={p.preview} className="img-thumb pending" title="Uploads when you save">
            <img src={p.preview} alt={p.file.name} />
            <button
              type="button"
              className="rm"
              onClick={() => {
                URL.revokeObjectURL(p.preview)
                setPending((list) => list.filter((_, j) => j !== i))
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="section-label">Details</div>
      <TextInput label="Title" required value={v.title} onChange={set('title')} error={errors.title} placeholder="e.g. Sunrise Residency 3BHK" />
      <div className="three-col">
        <SelectInput label="Listing Type" value={v.listingType} onChange={set('listingType')} options={meta?.listingTypes ?? []} />
        <SelectInput label="Category" value={v.category} onChange={set('category')} options={meta?.propertyCategories ?? []} />
        <SelectInput label="Type" value={v.propertyType} onChange={set('propertyType')} options={meta?.propertyTypes ?? []} />
      </div>
      <div className="three-col">
        <TextInput label={v.listingType === 'Sale' ? 'Price (₹)' : 'Rent / month (₹)'} type="number" min={0} value={v.price} onChange={set('price')} error={errors.price} />
        <TextInput label="Bedrooms" type="number" min={0} value={v.bedrooms} onChange={set('bedrooms')} />
        <TextInput label="Area (sq.ft)" type="number" min={0} value={v.areaSqft} onChange={set('areaSqft')} />
      </div>
      <div className="three-col">
        <TextInput label="City" value={v.city} onChange={set('city')} />
        <TextInput label="Locality" value={v.locality} onChange={set('locality')} />
        <TextInput label="Address" value={v.address} onChange={set('address')} />
      </div>
      <div className="two-col">
        <SelectInput label="Availability" value={v.status} onChange={set('status')} options={meta?.propertyStatuses ?? []} />
        <SelectInput
          label="Assigned Agent"
          value={v.agentId}
          onChange={set('agentId')}
          placeholder="— unassigned —"
          options={users.map((u) => ({ value: u.id, label: u.name }))}
        />
      </div>
      <TextArea label="Description" value={v.description} onChange={set('description')} rows={3} />
    </Modal>
  )
}
