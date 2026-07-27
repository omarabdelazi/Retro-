import { defineCloudflareConfig } from '@opennextjs/cloudflare'

// Defaults are right for this app: every page is server-rendered on demand
// against the database, so no incremental cache binding is needed yet.
export default defineCloudflareConfig({})
