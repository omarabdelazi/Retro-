#!/usr/bin/env node
// Gate for product models: every GLB must be Draco compressed and under
// 5 MB, or it does not ship. Run against files before uploading them:
//
//   npm run check:glb -- path/to/model.glb [more.glb ...]
//
// Reads the GLB container header and the glTF JSON chunk; no rendering.
import fs from 'node:fs'

const MAX_BYTES = 5 * 1024 * 1024
const DRACO = 'KHR_draco_mesh_compression'

const files = process.argv.slice(2)
if (files.length === 0) {
  console.error('usage: check-glb <file.glb> [...]')
  process.exit(2)
}

let failed = false

for (const file of files) {
  const problems = []
  let stat
  try {
    stat = fs.statSync(file)
  } catch {
    console.error(`${file}: not found`)
    failed = true
    continue
  }

  if (stat.size > MAX_BYTES) {
    problems.push(
      `too large: ${(stat.size / 1024 / 1024).toFixed(2)} MB (limit 5 MB)`,
    )
  }

  const buffer = fs.readFileSync(file)
  if (buffer.length < 20 || buffer.readUInt32LE(0) !== 0x46546c67) {
    problems.push('not a GLB (bad magic)')
  } else if (buffer.readUInt32LE(4) !== 2) {
    problems.push(`unsupported glTF version ${buffer.readUInt32LE(4)}`)
  } else {
    const jsonLength = buffer.readUInt32LE(12)
    const jsonType = buffer.readUInt32LE(16)
    if (jsonType !== 0x4e4f534a) {
      problems.push('first chunk is not JSON')
    } else {
      try {
        const json = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString('utf8'))
        const extensions = [
          ...(json.extensionsUsed ?? []),
          ...(json.extensionsRequired ?? []),
        ]
        if (!extensions.includes(DRACO)) {
          problems.push('not Draco compressed (KHR_draco_mesh_compression missing)')
        }
      } catch {
        problems.push('JSON chunk is unreadable')
      }
    }
  }

  if (problems.length) {
    failed = true
    console.error(`FAIL ${file}\n  - ${problems.join('\n  - ')}`)
  } else {
    console.log(`ok   ${file} (${(stat.size / 1024 / 1024).toFixed(2)} MB, Draco)`)
  }
}

process.exit(failed ? 1 : 0)
