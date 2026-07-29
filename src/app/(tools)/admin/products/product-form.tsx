'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { checkGlb } from '@/lib/glb'
import { createClient } from '@/lib/supabase/browser'

type WorkshopOption = { id: string; nameEn: string }

export type ProductFormValues = {
  slug: string
  nameEn: string
  nameAr: string
  room: string
  category: string
  species: string
  joinery: string
  finish: string
  price: string
  currency: string
  w: number
  d: number
  h: number
  descriptionEn: string
  descriptionAr: string
  images: string
  modelGlbUrl: string
  active: boolean
  steps: { workshopId: string }[]
}

const CURRENCIES = ['EGP', 'AED', 'SAR', 'KWD']
const ROOMS = ['dining', 'living', 'bedroom', 'majlis', 'office']

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

export function ProductForm({
  action,
  workshops,
  initial,
}: {
  action: (formData: FormData) => Promise<void>
  workshops: WorkshopOption[]
  initial: ProductFormValues
}) {
  const [steps, setSteps] = useState(initial.steps)
  const [room, setRoom] = useState(initial.room)
  const [curr, setCurr] = useState(initial.currency)
  const [images, setImages] = useState(initial.images)
  const [modelUrl, setModelUrl] = useState(initial.modelGlbUrl)
  const [uploading, setUploading] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // uploads land in the public Supabase buckets; storage RLS only lets
  // admins write, so this runs on the signed-in session
  async function uploadAsset(bucket: 'images' | 'models', file: File) {
    const supabase = createClient()
    const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      contentType: file.type || undefined,
    })
    if (error) throw new Error(error.message)
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
  }

  async function handleImageFiles(files: FileList | null) {
    if (!files?.length) return
    setUploadError(null)
    setUploading('photos')
    try {
      const urls: string[] = []
      for (const file of Array.from(files)) {
        urls.push(await uploadAsset('images', file))
      }
      setImages((prev) => [prev.trim(), ...urls].filter(Boolean).join('\n'))
    } catch (error) {
      setUploadError(`Photo upload failed: ${(error as Error).message}`)
    } finally {
      setUploading(null)
    }
  }

  async function handleModelFile(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    setUploadError(null)

    const verdict = checkGlb(await file.arrayBuffer())
    if (!verdict.ok) {
      setUploadError(
        verdict.reason === 'too-large'
          ? `Model is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is 5 MB. Compress it first: npx @gltf-transform/cli optimize in.glb out.glb --compress draco`
          : verdict.reason === 'not-draco'
            ? 'Model is not Draco compressed. Run: npx @gltf-transform/cli optimize in.glb out.glb --compress draco'
            : 'That file is not a valid .glb model.',
      )
      return
    }

    setUploading('model')
    try {
      setModelUrl(await uploadAsset('models', file))
    } catch (error) {
      setUploadError(`Model upload failed: ${(error as Error).message}`)
    } finally {
      setUploading(null)
    }
  }

  function moveStep(index: number, delta: -1 | 1) {
    setSteps((prev) => {
      const next = [...prev]
      const target = index + delta
      if (target < 0 || target >= next.length) return prev
      const [row] = next.splice(index, 1)
      next.splice(target, 0, row!)
      return next
    })
  }

  return (
    <form action={action} className="max-w-3xl space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name (English)">
          <Input name="nameEn" defaultValue={initial.nameEn} required />
        </Field>
        <Field label="Name (Arabic)">
          <Input name="nameAr" defaultValue={initial.nameAr} dir="rtl" lang="ar" required />
        </Field>
        <Field label="Slug">
          <Input name="slug" defaultValue={initial.slug} required />
        </Field>
        <Field label="Category">
          <Input name="category" defaultValue={initial.category} required />
        </Field>
        <Field label="Room">
          <Select value={room} onValueChange={setRoom}>
            <SelectTrigger>
              <SelectValue placeholder="Room" />
            </SelectTrigger>
            <SelectContent>
              {ROOMS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="room" value={room} />
        </Field>
        <Field label="Species">
          <Input name="species" defaultValue={initial.species} required />
        </Field>
        <Field label="Joinery">
          <Input name="joinery" defaultValue={initial.joinery} required />
        </Field>
        <Field label="Finish">
          <Input name="finish" defaultValue={initial.finish} required />
        </Field>
      </div>

      <div className="grid grid-cols-5 gap-3">
        <Field label="Width (mm)">
          <Input name="w" type="number" min={1} defaultValue={initial.w || ''} required />
        </Field>
        <Field label="Depth (mm)">
          <Input name="d" type="number" min={1} defaultValue={initial.d || ''} required />
        </Field>
        <Field label="Height (mm)">
          <Input name="h" type="number" min={1} defaultValue={initial.h || ''} required />
        </Field>
        <Field label="Price">
          <Input name="price" type="number" min={0} step="0.001" defaultValue={initial.price} required />
        </Field>
        <Field label="Currency">
          <Select value={curr} onValueChange={setCurr}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="currency" value={curr} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Description (English)">
          <Textarea name="descriptionEn" defaultValue={initial.descriptionEn} />
        </Field>
        <Field label="Description (Arabic)">
          <Textarea name="descriptionAr" defaultValue={initial.descriptionAr} dir="rtl" lang="ar" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Photos — upload files or paste URLs, one per line">
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={uploading !== null}
            onChange={(e) => {
              void handleImageFiles(e.target.files)
              e.target.value = ''
            }}
            className="block w-full text-sm text-ink file:me-3 file:rounded-xs file:border file:border-stone file:bg-bone file:px-3 file:py-1.5 file:text-sm file:text-ink hover:file:border-ochre"
          />
          <Textarea
            name="images"
            value={images}
            onChange={(e) => setImages(e.target.value)}
            className="mt-2"
          />
        </Field>
        <Field label="3D model — upload a GLB (Draco, under 5 MB) or paste a URL">
          <input
            type="file"
            accept=".glb,model/gltf-binary"
            disabled={uploading !== null}
            onChange={(e) => {
              void handleModelFile(e.target.files)
              e.target.value = ''
            }}
            className="block w-full text-sm text-ink file:me-3 file:rounded-xs file:border file:border-stone file:bg-bone file:px-3 file:py-1.5 file:text-sm file:text-ink hover:file:border-ochre"
          />
          <Input
            name="modelGlbUrl"
            value={modelUrl}
            onChange={(e) => setModelUrl(e.target.value)}
            className="mt-2"
          />
        </Field>
      </div>

      {uploading ? (
        <p className="text-sm text-stone">Uploading {uploading}…</p>
      ) : null}
      {uploadError ? (
        <p className="border border-walnut/50 bg-walnut/10 px-3 py-2 text-sm text-walnut">
          {uploadError}
        </p>
      ) : null}

      <fieldset className="space-y-2">
        <legend className="text-sm text-stone">
          Production chain — the order below is the sequence
        </legend>
        {steps.map((step, index) => (
          <div key={`${step.workshopId}-${index}`} className="flex items-center gap-2">
            <span className="w-6 text-sm text-stone">{index + 1}</span>
            <div className="w-64">
              <Select
                value={step.workshopId}
                onValueChange={(v) =>
                  setSteps((prev) =>
                    prev.map((s, i) => (i === index ? { workshopId: v } : s)),
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Workshop" />
                </SelectTrigger>
                <SelectContent>
                  {workshops.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.nameEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" variant="ghost" size="xs" onClick={() => moveStep(index, -1)}>
              Up
            </Button>
            <Button type="button" variant="ghost" size="xs" onClick={() => moveStep(index, 1)}>
              Down
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => setSteps((prev) => prev.filter((_, i) => i !== index))}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setSteps((prev) => [...prev, { workshopId: '' }])}
        >
          Add step
        </Button>
        <input type="hidden" name="steps" value={JSON.stringify(steps)} />
      </fieldset>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-base">
          <input
            type="checkbox"
            name="active"
            defaultChecked={initial.active}
            className="size-4 accent-walnut"
          />
          Active on the storefront
        </label>
        <Button type="submit">Save product</Button>
      </div>
    </form>
  )
}
