import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { useToast } from '../../context/ToastContext'
import { errorMessage, fieldErrors } from '../../services/api'
import {
  activitiesApi,
  dealsApi,
  documentsApi,
  marketingApi,
  tasksApi,
  usersApi,
  visitsApi,
} from '../../services/crm'
import type { Activity, Campaign, Deal, Task, User, Visit } from '../../types'
import { todayIso } from '../../utils/format'
import { SelectInput, TextArea, TextInput } from '../Form'
import { toApi } from '../../utils/forms'
import { FormFooter, Modal } from '../Modal'

type Values = Record<string, string>

/** Shared submit logic: validation errors, API field errors, toast, close. */
function useSubmit() {
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)

  const run = async (
    validate: () => Record<string, string | undefined>,
    action: () => Promise<void>,
    successMsg: string,
  ) => {
    const errs = Object.fromEntries(
      Object.entries(validate()).filter((e): e is [string, string] => !!e[1]),
    )
    setErrors(errs)
    if (Object.keys(errs).length) return
    setSaving(true)
    setFormError(null)
    try {
      await action()
      toast(successMsg)
    } catch (err) {
      setErrors(fieldErrors(err))
      setFormError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }
  return { saving, errors, formError, run }
}

function useOptions() {
  const { users, contacts, properties } = useData()
  return {
    userOpts: users.map((u) => ({ value: u.id, label: u.name })),
    contactOpts: contacts.map((c) => ({ value: c.id, label: c.phone ? `${c.name} · ${c.phone}` : c.name })),
    propertyOpts: properties.map((p) => ({
      value: p.id,
      label: p.locality ? `${p.title} · ${p.locality}` : p.title,
    })),
  }
}

/* ---------------- Deal ---------------- */

export function DealForm({ deal, defaults, onClose, onSaved }: {
  deal?: Deal | null
  defaults?: Partial<Values>
  onClose: () => void
  onSaved: () => void
}) {
  const { meta } = useData()
  const { user } = useAuth()
  const { userOpts, contactOpts, propertyOpts } = useOptions()
  const { saving, errors, formError, run } = useSubmit()
  const [v, setV] = useState<Values>({
    title: deal?.title ?? '',
    contactId: deal?.contactId ?? '',
    propertyId: deal?.propertyId ?? '',
    value: deal?.value?.toString() ?? '',
    expectedClosing: deal?.expectedClosing ?? '',
    stage: deal?.stage ?? 'New Opportunity',
    probability: deal?.probability?.toString() ?? '50',
    commissionPct: deal?.commissionPct?.toString() ?? '2',
    transactionStatus: deal?.transactionStatus ?? 'Not Started',
    agentId: deal ? (deal.agentId ?? '') : (user?.id ?? ''),
    notes: deal?.notes ?? '',
    ...defaults,
  })
  const set = (k: string) => (val: string) => setV((p) => ({ ...p, [k]: val }))
  const commission =
    v.value && v.commissionPct ? Math.round((Number(v.value) * Number(v.commissionPct)) / 100) : null

  const save = () =>
    run(
      () => {
        const e: Record<string, string> = {}
        if (!v.contactId) e.contactId = 'Select a client'
        const p = Number(v.probability)
        if (v.probability && (p < 0 || p > 100)) e.probability = 'Between 0 and 100'
        return e
      },
      async () => {
        const body = toApi(v, ['value', 'probability', 'commissionPct'])
        if (deal) await dealsApi.update(deal.id, body)
        else await dealsApi.create(body)
        onSaved()
        onClose()
      },
      'Deal saved.',
    )

  return (
    <Modal title={deal ? 'Edit Deal' : 'New Deal'} onClose={onClose} onSubmit={save} footer={<FormFooter onCancel={onClose} saving={saving} />}>
      {formError && <div className="form-error">{formError}</div>}
      <TextInput label="Deal Title" value={v.title} onChange={set('title')} placeholder="e.g. Green Valley 3BHK purchase" />
      <SelectInput label="Client" required value={v.contactId} onChange={set('contactId')} options={contactOpts} placeholder="— select —" error={errors.contactId} />
      <SelectInput label="Property" value={v.propertyId} onChange={set('propertyId')} options={propertyOpts} placeholder="— none —" />
      <div className="two-col">
        <TextInput label="Deal Value (₹)" type="number" min={0} value={v.value} onChange={set('value')} error={errors.value} />
        <TextInput label="Expected Closing" type="date" value={v.expectedClosing} onChange={set('expectedClosing')} />
      </div>
      <div className="two-col">
        <SelectInput label="Stage" value={v.stage} onChange={set('stage')} options={meta?.dealStages ?? []} />
        <TextInput label="Probability (%)" type="number" min={0} max={100} value={v.probability} onChange={set('probability')} error={errors.probability} />
      </div>
      <div className="two-col">
        <TextInput label={`Commission (%)${commission !== null ? ` = ₹${commission.toLocaleString('en-IN')}` : ''}`} type="number" min={0} max={100} step="0.01" value={v.commissionPct} onChange={set('commissionPct')} error={errors.commissionPct} />
        <SelectInput label="Transaction Status" value={v.transactionStatus} onChange={set('transactionStatus')} options={meta?.transactionStatuses ?? []} />
      </div>
      <SelectInput label="Agent" value={v.agentId} onChange={set('agentId')} options={userOpts} placeholder="— unassigned —" />
      <TextArea label="Notes" value={v.notes} onChange={set('notes')} />
    </Modal>
  )
}

/* ---------------- Site visit ---------------- */

export function VisitForm({ visit, defaults, onClose, onSaved }: {
  visit?: Visit | null
  defaults?: Partial<Values>
  onClose: () => void
  onSaved: () => void
}) {
  const { meta } = useData()
  const { user } = useAuth()
  const { userOpts, contactOpts, propertyOpts } = useOptions()
  const { saving, errors, formError, run } = useSubmit()
  const [v, setV] = useState<Values>({
    contactId: visit?.contactId ?? '',
    propertyId: visit?.propertyId ?? '',
    visitDate: visit?.visitDate ?? todayIso(),
    visitTime: visit?.visitTime ?? '',
    agentId: visit ? (visit.agentId ?? '') : (user?.id ?? ''),
    status: visit?.status ?? 'Scheduled',
    notes: visit?.notes ?? '',
    feedback: visit?.feedback ?? '',
    ...defaults,
  })
  const [followup, setFollowup] = useState(!visit)
  const set = (k: string) => (val: string) => setV((p) => ({ ...p, [k]: val }))

  const save = () =>
    run(
      () => {
        const e: Record<string, string> = {}
        if (!v.contactId) e.contactId = 'Select a client'
        if (!v.visitDate) e.visitDate = 'Pick a date'
        return e
      },
      async () => {
        const body = toApi(v)
        if (visit) await visitsApi.update(visit.id, body)
        else await visitsApi.create({ ...body, createFollowupTask: followup })
        onSaved()
        onClose()
      },
      'Site visit saved.',
    )

  return (
    <Modal title={visit ? 'Edit Site Visit' : 'Schedule Site Visit'} onClose={onClose} onSubmit={save} footer={<FormFooter onCancel={onClose} saving={saving} />}>
      {formError && <div className="form-error">{formError}</div>}
      <SelectInput label="Client" required value={v.contactId} onChange={set('contactId')} options={contactOpts} placeholder="— select —" error={errors.contactId} />
      <SelectInput label="Property" value={v.propertyId} onChange={set('propertyId')} options={propertyOpts} placeholder="— none —" />
      <div className="two-col">
        <TextInput label="Date" required type="date" value={v.visitDate} onChange={set('visitDate')} error={errors.visitDate} />
        <TextInput label="Time" type="time" value={v.visitTime} onChange={set('visitTime')} error={errors.visitTime} />
      </div>
      <div className="two-col">
        <SelectInput label="Agent" value={v.agentId} onChange={set('agentId')} options={userOpts} placeholder="— unassigned —" />
        <SelectInput label="Status" value={v.status} onChange={set('status')} options={meta?.visitStatuses ?? []} />
      </div>
      <TextArea label="Notes / Instructions" value={v.notes} onChange={set('notes')} />
      <TextArea label="Client Feedback (after visit)" value={v.feedback} onChange={set('feedback')} />
      {!visit && (
        <label className="check-row">
          <input type="checkbox" checked={followup} onChange={(e) => setFollowup(e.target.checked)} />
          Create a follow-up task for the day after the visit
        </label>
      )}
    </Modal>
  )
}

/* ---------------- Task ---------------- */

export function TaskForm({ task, defaults, onClose, onSaved }: {
  task?: Task | null
  defaults?: Partial<Values>
  onClose: () => void
  onSaved: () => void
}) {
  const { meta } = useData()
  const { user } = useAuth()
  const { userOpts, contactOpts } = useOptions()
  const { saving, errors, formError, run } = useSubmit()
  const [v, setV] = useState<Values>({
    title: task?.title ?? '',
    contactId: task?.contactId ?? '',
    type: task?.type ?? 'Call',
    priority: task?.priority ?? 'Medium',
    dueDate: task ? (task.dueDate ?? '') : todayIso(),
    dueTime: task?.dueTime ?? '',
    assigneeId: task ? (task.assigneeId ?? '') : (user?.id ?? ''),
    status: task?.status ?? 'Pending',
    notes: task?.notes ?? '',
    ...defaults,
  })
  const set = (k: string) => (val: string) => setV((p) => ({ ...p, [k]: val }))

  const save = () =>
    run(
      () => (v.title.trim().length < 2 ? { title: 'Title is required' } : {}),
      async () => {
        const body = toApi(v)
        if (task) await tasksApi.update(task.id, body)
        else await tasksApi.create(body)
        onSaved()
        onClose()
      },
      'Task saved.',
    )

  return (
    <Modal title={task ? 'Edit Task' : 'New Task'} onClose={onClose} onSubmit={save} footer={<FormFooter onCancel={onClose} saving={saving} />}>
      {formError && <div className="form-error">{formError}</div>}
      <TextInput label="Title" required value={v.title} onChange={set('title')} error={errors.title} placeholder="e.g. Follow-up call" autoFocus />
      <SelectInput label="Related Client" value={v.contactId} onChange={set('contactId')} options={contactOpts} placeholder="— none —" />
      <div className="two-col">
        <SelectInput label="Type" value={v.type} onChange={set('type')} options={meta?.taskTypes ?? []} />
        <SelectInput label="Priority" value={v.priority} onChange={set('priority')} options={meta?.priorities ?? []} />
      </div>
      <div className="two-col">
        <TextInput label="Due Date" type="date" value={v.dueDate} onChange={set('dueDate')} />
        <TextInput label="Due Time" type="time" value={v.dueTime} onChange={set('dueTime')} error={errors.dueTime} />
      </div>
      <div className="two-col">
        <SelectInput label="Owner" value={v.assigneeId} onChange={set('assigneeId')} options={userOpts} placeholder="— unassigned —" />
        <SelectInput label="Status" value={v.status} onChange={set('status')} options={meta?.taskStatuses ?? []} />
      </div>
      <TextArea label="Notes" value={v.notes} onChange={set('notes')} />
    </Modal>
  )
}

/* ---------------- Communication log ---------------- */

export function ActivityForm({ activity, defaults, onClose, onSaved }: {
  activity?: Activity | null
  defaults?: Partial<Values>
  onClose: () => void
  onSaved: () => void
}) {
  const { meta } = useData()
  const { user } = useAuth()
  const { userOpts, contactOpts } = useOptions()
  const { saving, errors, formError, run } = useSubmit()
  const now = new Date()
  const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  const [v, setV] = useState<Values>({
    contactId: activity?.contactId ?? '',
    type: activity?.type ?? 'Call',
    outcome: activity?.outcome ?? 'Connected',
    agentId: activity ? (activity.agentId ?? '') : (user?.id ?? ''),
    notes: activity?.notes ?? '',
    occurredAt: activity
      ? new Date(new Date(activity.occurredAt).getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
      : localNow,
    ...defaults,
  })
  const set = (k: string) => (val: string) => setV((p) => ({ ...p, [k]: val }))

  const save = () =>
    run(
      () => (!v.contactId ? { contactId: 'Select a contact' } : {}),
      async () => {
        const body = toApi(v)
        body.occurredAt = new Date(v.occurredAt).toISOString()
        if (activity) await activitiesApi.update(activity.id, body)
        else await activitiesApi.create(body)
        onSaved()
        onClose()
      },
      'Activity logged.',
    )

  return (
    <Modal title={activity ? 'Edit Activity' : 'Log Activity'} onClose={onClose} onSubmit={save} footer={<FormFooter onCancel={onClose} saving={saving} />}>
      {formError && <div className="form-error">{formError}</div>}
      <SelectInput label="Contact" required value={v.contactId} onChange={set('contactId')} options={contactOpts} placeholder="— select —" error={errors.contactId} />
      <div className="two-col">
        <SelectInput label="Type" value={v.type} onChange={set('type')} options={meta?.activityTypes ?? []} />
        <SelectInput label="Outcome" value={v.outcome} onChange={set('outcome')} options={meta?.activityOutcomes ?? []} placeholder="—" />
      </div>
      <div className="two-col">
        <SelectInput label="Agent" value={v.agentId} onChange={set('agentId')} options={userOpts} placeholder="—" />
        <TextInput label="When" type="datetime-local" value={v.occurredAt} onChange={set('occurredAt')} />
      </div>
      <TextArea label="Notes" value={v.notes} onChange={set('notes')} rows={4} />
    </Modal>
  )
}

/* ---------------- Campaign ---------------- */

export function CampaignForm({ campaign, onClose, onSaved }: {
  campaign?: Campaign | null
  onClose: () => void
  onSaved: () => void
}) {
  const { meta, refresh } = useData()
  const { saving, errors, formError, run } = useSubmit()
  const [v, setV] = useState<Values>({
    name: campaign?.name ?? '',
    source: campaign?.source ?? 'Facebook/Instagram Ads',
    startDate: campaign?.startDate ?? '',
    endDate: campaign?.endDate ?? '',
    budget: campaign?.budget?.toString() ?? '',
    status: campaign?.status ?? 'Active',
    notes: campaign?.notes ?? '',
  })
  const set = (k: string) => (val: string) => setV((p) => ({ ...p, [k]: val }))

  const save = () =>
    run(
      () => {
        const e: Record<string, string> = {}
        if (v.name.trim().length < 2) e.name = 'Name is required'
        if (v.startDate && v.endDate && v.endDate < v.startDate) e.endDate = 'End date is before start date'
        return e
      },
      async () => {
        const body = toApi(v, ['budget'])
        if (campaign) await marketingApi.campaigns.update(campaign.id, body)
        else await marketingApi.campaigns.create(body)
        refresh(['campaigns'])
        onSaved()
        onClose()
      },
      'Campaign saved.',
    )

  return (
    <Modal title={campaign ? 'Edit Campaign' : 'New Campaign'} onClose={onClose} onSubmit={save} footer={<FormFooter onCancel={onClose} saving={saving} />}>
      {formError && <div className="form-error">{formError}</div>}
      <TextInput label="Campaign Name" required value={v.name} onChange={set('name')} error={errors.name} autoFocus />
      <div className="two-col">
        <SelectInput label="Channel / Source" value={v.source} onChange={set('source')} options={meta?.leadSources ?? []} />
        <SelectInput label="Status" value={v.status} onChange={set('status')} options={meta?.campaignStatuses ?? []} />
      </div>
      <div className="three-col">
        <TextInput label="Start" type="date" value={v.startDate} onChange={set('startDate')} />
        <TextInput label="End" type="date" value={v.endDate} onChange={set('endDate')} error={errors.endDate} />
        <TextInput label="Budget (₹)" type="number" min={0} value={v.budget} onChange={set('budget')} />
      </div>
      <TextArea label="Notes" value={v.notes} onChange={set('notes')} />
    </Modal>
  )
}

/* ---------------- Team member ---------------- */

export function UserForm({ member, onClose, onSaved }: {
  member?: User | null
  onClose: () => void
  onSaved: () => void
}) {
  const { meta, refresh } = useData()
  const { hasRole, user } = useAuth()
  const { saving, errors, formError, run } = useSubmit()
  const [v, setV] = useState<Values>({
    name: member?.name ?? '',
    email: member?.email ?? '',
    phone: member?.phone ?? '',
    password: '',
    role: member?.role ?? 'AGENT',
    designation: member?.designation ?? 'Agent',
    isActive: member ? String(member.isActive) : 'true',
  })
  const set = (k: string) => (val: string) => setV((p) => ({ ...p, [k]: val }))
  const roles = (meta?.roles ?? []).filter((r) => r !== 'ADMIN' || hasRole('ADMIN'))
  const self = member?.id === user?.id

  const save = () =>
    run(
      () => {
        const e: Record<string, string> = {}
        if (v.name.trim().length < 2) e.name = 'Name is required'
        if (!/^\S+@\S+\.\S+$/.test(v.email)) e.email = 'Valid email required'
        if (!member && v.password.length < 8) e.password = 'At least 8 characters'
        if (member && v.password && v.password.length < 8) e.password = 'At least 8 characters'
        return e
      },
      async () => {
        const body: Record<string, unknown> = {
          name: v.name,
          email: v.email,
          phone: v.phone,
          designation: v.designation,
        }
        if (!self) {
          body.role = v.role
          if (member) body.isActive = v.isActive === 'true'
        }
        if (v.password) body.password = v.password
        if (member) await usersApi.update(member.id, body)
        else await usersApi.create(body)
        refresh(['users'])
        onSaved()
        onClose()
      },
      'Team member saved.',
    )

  return (
    <Modal title={member ? 'Edit Team Member' : 'Add Agent / Team Member'} onClose={onClose} onSubmit={save} footer={<FormFooter onCancel={onClose} saving={saving} />}>
      {formError && <div className="form-error">{formError}</div>}
      <TextInput label="Name" required value={v.name} onChange={set('name')} error={errors.name} autoFocus />
      <div className="two-col">
        <TextInput label="Email (login)" required type="email" value={v.email} onChange={set('email')} error={errors.email} autoComplete="off" />
        <TextInput label="Phone" value={v.phone} onChange={set('phone')} />
      </div>
      <div className="two-col">
        <SelectInput label="Access Role" value={v.role} onChange={set('role')} options={roles} error={errors.role} />
        <SelectInput label="Designation" value={v.designation} onChange={set('designation')} options={meta?.designations ?? []} />
      </div>
      {self && <p className="muted" style={{ fontSize: '.76rem' }}>You can't change your own role or status.</p>}
      <TextInput
        label={member ? 'New Password (leave blank to keep)' : 'Password'}
        required={!member}
        type="password"
        value={v.password}
        onChange={set('password')}
        error={errors.password}
        autoComplete="new-password"
      />
      {member && !self && (
        <SelectInput
          label="Account Status"
          value={v.isActive}
          onChange={set('isActive')}
          options={[
            { value: 'true', label: 'Active — can sign in' },
            { value: 'false', label: 'Disabled — cannot sign in' },
          ]}
        />
      )}
    </Modal>
  )
}

/* ---------------- Document upload ---------------- */

const DOC_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]
const DOC_MAX_MB = 10

export function DocumentForm({ defaults, onClose, onSaved }: {
  defaults?: Partial<Values>
  onClose: () => void
  onSaved: () => void
}) {
  const { meta, contacts, properties } = useData()
  const { saving, errors, formError, run } = useSubmit()
  const [file, setFile] = useState<File | null>(null)
  const [v, setV] = useState<Values>({
    category: 'Other',
    contactId: '',
    propertyId: '',
    dealId: '',
    ...defaults,
  })
  const set = (k: string) => (val: string) => setV((p) => ({ ...p, [k]: val }))

  const save = () =>
    run(
      () => {
        if (!file) return { file: 'Choose a file' }
        if (!DOC_TYPES.includes(file.type)) return { file: 'Allowed: PDF, Word, Excel, JPG, PNG, WebP' }
        if (file.size > DOC_MAX_MB * 1024 * 1024) return { file: `Max ${DOC_MAX_MB} MB` }
        return {}
      },
      async () => {
        await documentsApi.upload(file!, v)
        onSaved()
        onClose()
      },
      'Document uploaded.',
    )

  return (
    <Modal title="Upload Document" onClose={onClose} onSubmit={save} footer={<FormFooter onCancel={onClose} saving={saving} label="Upload" />}>
      {formError && <div className="form-error">{formError}</div>}
      <SelectInput label="Category" value={v.category} onChange={set('category')} options={meta?.documentCategories ?? []} />
      <SelectInput label="Related Client" value={v.contactId} onChange={set('contactId')} placeholder="— none —" options={contacts.map((c) => ({ value: c.id, label: c.name }))} />
      <SelectInput label="Related Property" value={v.propertyId} onChange={set('propertyId')} placeholder="— none —" options={properties.map((p) => ({ value: p.id, label: p.title }))} />
      <label>File *</label>
      <input type="file" accept={DOC_TYPES.join(',')} onChange={(e) => setFile(e.target.files?.[0] ?? null)} className={errors.file ? 'invalid' : undefined} />
      {errors.file && <div className="field-error">{errors.file}</div>}
      <p className="muted" style={{ fontSize: '.76rem' }}>
        PDF, Word, Excel or images up to {DOC_MAX_MB} MB. Files are private: only signed-in team members can download them.
      </p>
    </Modal>
  )
}
