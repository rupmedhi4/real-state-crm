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

import { preparePropertyImage } from '../../utils/property-images'

const MAX_SOURCE_MB = 20
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
  const maxImages = meta?.maxImagesPerProperty ?? 20
  const maxMb = meta?.maxImageSizeMb ?? 5
  const savedId = useRef(property?.id)
  const processing = useRef(false)
  const [preparing, setPreparing] = useState(false)
  const [progress, setProgress] = useState('')
  const [optimise, setOptimise] = useState(true)
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
    bathrooms: property?.bathrooms?.toString() ?? '',
    balconies: property?.balconies?.toString() ?? '',
    parkingSpaces: property?.parkingSpaces?.toString() ?? '',
    floorNumber: property?.floorNumber?.toString() ?? '',
    totalFloors: property?.totalFloors?.toString() ?? '',
    furnishing: property?.furnishing?.toString() ?? '',
    possessionStatus: property?.possessionStatus?.toString() ?? '',
    facing: property?.facing?.toString() ?? '',
    reraNumber: property?.reraNumber?.toString() ?? '',
    ownerName: property?.ownerName?.toString() ?? '',
    ownerPhone: property?.ownerPhone?.toString() ?? '',
    amenities: property?.amenities?.toString() ?? '',

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

  const addFiles = async (files: FileList | File[]) => {
    if (processing.current || saving) return;
    processing.current = true;
    setPreparing(true);
    const accepted: PendingImage[] = [];
    const rejected: string[] = [];
    const selected = Array.from(files);
    const room = Math.max(0, maxImages - existing.length - pending.length);
    if (selected.length > room) toast(`Only ${room} more photos can be added (maximum ${maxImages}).`, 'error');
    try {
      for (const original of selected.slice(0, room)) {
        if (!IMAGE_TYPES.includes(original.type)) { rejected.push(`${original.name} (use JPG, PNG or WebP)`); continue; }
        if (original.size > MAX_SOURCE_MB * 1024 * 1024) { rejected.push(`${original.name} (over ${MAX_SOURCE_MB} MB)`); continue; }
        try {
          const file = optimise ? await preparePropertyImage(original) : original;
          if (file.size > maxMb * 1024 * 1024) { rejected.push(`${file.name} (over ${maxMb} MB after processing)`); continue; }
          accepted.push({ file, preview: URL.createObjectURL(file) });
        } catch { rejected.push(`${original.name} (could not read image)`); }
      }
      if (rejected.length) toast(`Skipped: ${rejected.join(', ')}`, 'error');
      setPending((current) => [...current, ...accepted]);
    } finally { processing.current = false; setPreparing(false); }
  };

  const removeExisting = async (img: PropertyImage) => {
    if (!savedId.current || saving || preparing) return
    try {
      const updated = await propertiesApi.removeImage(savedId.current, img.id)
      setExisting(updated.images)
      onSaved(updated)
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }

  const makeCover = async (img: PropertyImage) => {
    if (!savedId.current || saving || preparing) return
    try {
      const updated = await propertiesApi.reorderImages(savedId.current, [img.id])
      setExisting(updated.images)
      onSaved(updated)
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }

  const save = async () => {
    if (saving || processing.current) return
    if (v.title.trim().length < 2) return setErrors({ title: 'Title is required' })
    setSaving(true)
    setErrors({})
    setFormError(null)
    try {
      const body = toApi(v, ['price', 'bedrooms', 'areaSqft', 'bathrooms', 'balconies', 'parkingSpaces', 'floorNumber', 'totalFloors'])
      let saved = savedId.current
        ? await propertiesApi.update(savedId.current, body)
        : await propertiesApi.create(body)
      savedId.current = saved.id
      // One photo per request keeps memory bounded and lets a retry resume at
      // the failed photo without creating a second property or resending successes.
      const queue = [...pending]
      for (let i = 0; i < queue.length; i++) {
        setProgress(`Uploading photo ${i + 1} of ${queue.length}…`)
        try {
          saved = await propertiesApi.uploadImages(saved.id, [queue[i].file])
          setExisting(saved.images)
          URL.revokeObjectURL(queue[i].preview)
          setPending((current) => current.filter((image) => image.preview !== queue[i].preview))
        } catch (err) {
          onSaved(saved)
          refresh(['properties'])
          setFormError(`Property saved. ${queue.length - i} photo(s) still pending: ${errorMessage(err)}. Save again to retry.`)
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
      setProgress('')
      setSaving(false)
    }
  }

  return (
    <Modal
      title={property ? 'Edit Property' : 'New Property'}
      onClose={() => { if (!saving && !preparing) onClose() }}
      onSubmit={save}
      size="wide"
      footer={<FormFooter onCancel={onClose} saving={saving || preparing} label={preparing ? 'Preparing photos…' : progress || 'Save property'} />}
    >
      {formError && <div className="form-error">{formError}</div>}
      <fieldset disabled={saving || preparing} className="property-fields">
      {meta?.features?.photos !== false && <>
      <div className="section-label">Property photos · {existing.length + pending.length}/{maxImages}</div>
      <label className="check-row"><input type="checkbox" checked={optimise} onChange={(e) => setOptimise(e.target.checked)} /> Optimise photos for faster uploads and lower storage use (up to 1920px)</label>
      <div
        className={`img-drop ${dragOver ? 'dragover' : ''}`}
        role="button" tabIndex={0} aria-label="Add property photos"
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!saving && !preparing) fileInput.current?.click() } }}
        onClick={() => { if (!saving && !preparing) fileInput.current?.click() }}
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
        📷 Click or drop property photos here (JPG/PNG/WebP, up to {maxImages} photos, {maxMb} MB per uploaded photo)
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
      {preparing && <p role="status" className="muted">Preparing photos…</p>}
      {progress && <p role="status">{progress}</p>}
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

      </>}
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
      <div className="section-label">Specifications</div>
      <div className="three-col">
        <TextInput label="Bathrooms" type="number" min={0} value={v.bathrooms} onChange={set('bathrooms')} error={errors.bathrooms} />
        <TextInput label="Balconies" type="number" min={0} value={v.balconies} onChange={set('balconies')} error={errors.balconies} />
        <TextInput label="Parking spaces" type="number" min={0} value={v.parkingSpaces} onChange={set('parkingSpaces')} error={errors.parkingSpaces} />
      </div>
      <div className="three-col">
        <TextInput label="Floor (0 = ground)" type="number" value={v.floorNumber} onChange={set('floorNumber')} error={errors.floorNumber} />
        <TextInput label="Total floors" type="number" min={0} value={v.totalFloors} onChange={set('totalFloors')} error={errors.totalFloors} />
        <SelectInput label="Facing" value={v.facing} onChange={set('facing')} placeholder="Select facing" options={['North', 'South', 'East', 'West', 'North-east', 'North-west', 'South-east', 'South-west']} />
      </div>
      <div className="two-col">
        <SelectInput label="Furnishing" value={v.furnishing} onChange={set('furnishing')} placeholder="Select furnishing" options={['Unfurnished', 'Semi-furnished', 'Furnished']} />
        <SelectInput label="Possession" value={v.possessionStatus} onChange={set('possessionStatus')} placeholder="Select possession" options={['Ready to move', 'Under construction', 'Resale']} />
      </div>
      <TextInput label="RERA registration number" value={v.reraNumber} onChange={set('reraNumber')} error={errors.reraNumber} />
      <TextArea label="Amenities" value={v.amenities} onChange={set('amenities')} rows={2} placeholder="Lift, power backup, security, gym, water supply…" />
      <div className="section-label">Owner contact · internal team use</div>
      <div className="two-col">
        <TextInput label="Owner name" value={v.ownerName} onChange={set('ownerName')} error={errors.ownerName} />
        <TextInput label="Owner phone" value={v.ownerPhone} onChange={set('ownerPhone')} error={errors.ownerPhone} />
      </div>
      <TextArea label="Description" value={v.description} onChange={set('description')} rows={3} />
      </fieldset>
    </Modal>
  )
}
