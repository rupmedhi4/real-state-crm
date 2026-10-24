import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { useToast } from '../../context/ToastContext'
import { errorMessage, fieldErrors } from '../../services/api'
import { contactsApi } from '../../services/crm'
import type { Contact } from '../../types'
import { SelectInput, TextArea, TextInput } from '../Form'
import { toApi } from '../../utils/forms'
import { FormFooter, Modal } from '../Modal'
import { Avatar } from '../ui'

type Values = Record<string, string>

function initialValues(c: Contact | null | undefined, defaultStage: string, me?: string): Values {
  return {
    name: c?.name ?? '',
    phone: c?.phone ?? '',
    whatsapp: c?.whatsapp ?? '',
    email: c?.email ?? '',
    city: c?.city ?? '',
    address: c?.address ?? '',
    occupation: c?.occupation ?? '',
    source: c?.source ?? 'Referral',
    campaignId: c?.campaignId ?? '',
    propertyInterest: c?.propertyInterest ?? '',
    propertyCategory: c?.propertyCategory ?? 'Residential',
    intent: c?.intent ?? 'Buy',
    configuration: c?.configuration ?? '',
    budgetMin: c?.budgetMin?.toString() ?? '',
    budgetMax: c?.budgetMax?.toString() ?? '',
    preferences: c?.preferences ?? '',
    stage: c?.stage ?? defaultStage,
    priority: c?.priority ?? 'Medium',
    agentId: c ? (c.agentId ?? '') : (me ?? ''),
    nextFollowup: c?.nextFollowup ?? '',
    note: '',
  }
}

/** Add / edit a lead or client, including photo and duplicate check. */
export function ContactForm({ contact, defaultStage = 'New', onClose, onSaved }: {
  contact?: Contact | null
  defaultStage?: string
  onClose: () => void
  onSaved: (c: Contact) => void
}) {
  const { meta, users, campaigns, refresh } = useData()
  const { user, hasRole } = useAuth()
  const toast = useToast()
  const [v, setV] = useState<Values>(() => initialValues(contact, defaultStage, user?.id))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [dupes, setDupes] = useState<{ id: string; name: string }[]>([])
  const canAssign = hasRole('ADMIN', 'MANAGER') || !contact
  const set = (k: string) => (val: string) => setV((p) => ({ ...p, [k]: val }))

  // Warn (not block) when a phone/email already exists, like the legacy app.
  useEffect(() => {
    if (!v.phone && !v.email) return setDupes([])
    const t = setTimeout(() => {
      contactsApi
        .duplicates({ phone: v.phone || undefined, email: v.email || undefined, excludeId: contact?.id })
        .then(setDupes)
        .catch(() => {})
    }, 400)
    return () => clearTimeout(t)
  }, [v.phone, v.email, contact?.id])

  useEffect(() => {
    if (!photo) return setPhotoPreview(null)
    const url = URL.createObjectURL(photo)
    setPhotoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  const save = async () => {
    const errs: Record<string, string> = {}
    if (v.name.trim().length < 2) errs.name = 'Name is required (min 2 characters)'
    if (v.email && !/^\S+@\S+\.\S+$/.test(v.email)) errs.email = 'Enter a valid email'
    if (v.budgetMin && v.budgetMax && Number(v.budgetMin) > Number(v.budgetMax)) {
      errs.budgetMax = 'Max budget should be ≥ min budget'
    }
    setErrors(errs)
    if (Object.keys(errs).length) return

    setSaving(true)
    setFormError(null)
    try {
      const body = toApi(v, ['budgetMin', 'budgetMax'])
      if (!v.note) delete body.note
      if (contact && !hasRole('ADMIN', 'MANAGER')) delete body.agentId
      let saved = contact
        ? await contactsApi.update(contact.id, body)
        : await contactsApi.create(body)
      if (photo) saved = await contactsApi.uploadPhoto(saved.id, photo)
      refresh(['contacts'])
      toast(contact ? 'Contact updated.' : 'Lead saved.')
      onSaved(saved)
      onClose()
    } catch (err) {
      setErrors(fieldErrors(err))
      setFormError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const sources = meta?.leadSources ?? []
  return (
    <Modal
      title={contact ? 'Edit Lead / Client' : defaultStage === 'Qualified' ? 'New Client' : 'New Lead'}
      onClose={onClose}
      onSubmit={save}
      footer={<FormFooter onCancel={onClose} saving={saving} />}
    >
      {formError && <div className="form-error">{formError}</div>}
      {dupes.length > 0 && (
        <div className="form-warn">
          Possible duplicate: {dupes.map((d) => d.name).join(', ')} already has this phone/email.
        </div>
      )}
      <div className="photo-row">
        {photoPreview ? (
          <img src={photoPreview} alt="" className="avatar" style={{ width: 56, height: 56 }} />
        ) : (
          <Avatar name={v.name || '?'} contactId={contact?.id} hasPhoto={contact?.hasPhoto} size={56} version={contact?.updatedAt} />
        )}
        <div style={{ flex: 1 }}>
          <label style={{ margin: 0 }}>Photo (JPG/PNG/WebP, max 5 MB)</label>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
        </div>
      </div>

      <div className="section-label">Basic Details</div>
      <TextInput label="Full Name" required value={v.name} onChange={set('name')} error={errors.name} autoFocus />
      <div className="three-col">
        <TextInput label="Phone" value={v.phone} onChange={set('phone')} error={errors.phone} />
        <TextInput label="WhatsApp" value={v.whatsapp} onChange={set('whatsapp')} />
        <TextInput label="Email" type="email" value={v.email} onChange={set('email')} error={errors.email} />
      </div>
      <div className="three-col">
        <TextInput label="City" value={v.city} onChange={set('city')} />
        <TextInput label="Address" value={v.address} onChange={set('address')} />
        <TextInput label="Occupation" value={v.occupation} onChange={set('occupation')} />
      </div>

      <div className="section-label">Requirement</div>
      <div className="two-col">
        <SelectInput label="Lead Source" value={v.source} onChange={set('source')} options={sources} />
        <SelectInput
          label="Campaign"
          value={v.campaignId}
          onChange={set('campaignId')}
          placeholder="— none —"
          options={campaigns.map((c) => ({ value: c.id, label: c.name }))}
        />
      </div>
      <TextInput label="Interested Property" value={v.propertyInterest} onChange={set('propertyInterest')} placeholder="e.g. 3BHK Flat, Zoo Road" />
      <div className="three-col">
        <SelectInput label="Property Type" value={v.propertyCategory} onChange={set('propertyCategory')} options={meta?.propertyCategories ?? []} />
        <SelectInput label="Intent" value={v.intent} onChange={set('intent')} options={meta?.intents ?? []} />
        <TextInput label="Configuration" value={v.configuration} onChange={set('configuration')} placeholder="3BHK" />
      </div>
      <div className="two-col">
        <TextInput label="Min Budget (₹)" type="number" min={0} value={v.budgetMin} onChange={set('budgetMin')} error={errors.budgetMin} />
        <TextInput label="Max Budget (₹)" type="number" min={0} value={v.budgetMax} onChange={set('budgetMax')} error={errors.budgetMax} />
      </div>
      <TextArea label="Preferences" value={v.preferences} onChange={set('preferences')} placeholder="Preferred localities, floor, amenities…" />

      <div className="section-label">Status</div>
      <div className="three-col">
        <SelectInput label="Stage" value={v.stage} onChange={set('stage')} options={meta?.leadStages ?? []} />
        <SelectInput label="Priority" value={v.priority} onChange={set('priority')} options={meta?.priorities ?? []} />
        {canAssign ? (
          <SelectInput
            label="Assigned Agent"
            value={v.agentId}
            onChange={set('agentId')}
            placeholder="— unassigned —"
            options={users.map((u) => ({ value: u.id, label: u.name }))}
          />
        ) : (
          <TextInput label="Assigned Agent" value={contact?.agent?.name ?? '—'} onChange={() => {}} />
        )}
      </div>
      <TextInput label="Next Follow-up" type="date" value={v.nextFollowup} onChange={set('nextFollowup')} />

      <div className="section-label">Notes</div>
      <TextArea label="Add a note (saved to communication history)" value={v.note} onChange={set('note')} placeholder="Koi extra detail ya nayi note…" />
    </Modal>
  )
}
