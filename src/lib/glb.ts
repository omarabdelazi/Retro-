// Client-side GLB inspection, mirroring scripts/check-glb.mjs: a model must
// be a valid glTF 2 binary, under 5 MB, and Draco compressed to ship.

export const GLB_MAX_BYTES = 5 * 1024 * 1024

export type GlbCheck =
  | { ok: true }
  | { ok: false; reason: 'not-glb' | 'too-large' | 'not-draco' }

export function checkGlb(buffer: ArrayBuffer): GlbCheck {
  if (buffer.byteLength > GLB_MAX_BYTES) return { ok: false, reason: 'too-large' }

  const view = new DataView(buffer)
  if (buffer.byteLength < 20 || view.getUint32(0, true) !== 0x46546c67) {
    return { ok: false, reason: 'not-glb' }
  }
  if (view.getUint32(4, true) !== 2) return { ok: false, reason: 'not-glb' }

  const jsonLength = view.getUint32(12, true)
  if (view.getUint32(16, true) !== 0x4e4f534a || 20 + jsonLength > buffer.byteLength) {
    return { ok: false, reason: 'not-glb' }
  }

  try {
    const json = JSON.parse(
      new TextDecoder().decode(new Uint8Array(buffer, 20, jsonLength)),
    ) as { extensionsUsed?: string[]; extensionsRequired?: string[] }
    const extensions = [
      ...(json.extensionsUsed ?? []),
      ...(json.extensionsRequired ?? []),
    ]
    if (!extensions.includes('KHR_draco_mesh_compression')) {
      return { ok: false, reason: 'not-draco' }
    }
  } catch {
    return { ok: false, reason: 'not-glb' }
  }

  return { ok: true }
}
