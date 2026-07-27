import 'dotenv/config'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Development seed. Destructive: it clears every domain table before
// inserting. Auth rows are created directly in auth.users so the signup
// trigger builds the profiles; on a hosted Supabase project these users
// exist for data purposes only — create real logins through the dashboard
// or the admin API and they will pick up profiles the same way.

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is not set')

const client = postgres(url, { max: 1, prepare: false })
const db = drizzle(client, { schema })

// Fixed IDs so reseeding is stable and tests can reference rows.
const USERS = {
  admin: '10000000-0000-4000-a000-000000000001',
  workshop: '10000000-0000-4000-a000-000000000002',
  customer: '10000000-0000-4000-a000-000000000003',
}

const W = {
  joinery: '20000000-0000-4000-a000-000000000001',
  finishing: '20000000-0000-4000-a000-000000000002',
  carving: '20000000-0000-4000-a000-000000000003',
  upholstery: '20000000-0000-4000-a000-000000000004',
  assembly: '20000000-0000-4000-a000-000000000005',
}

const P = (n: number) => `30000000-0000-4000-a000-0000000000${String(n).padStart(2, '0')}`
const C = (n: number) => `40000000-0000-4000-a000-00000000000${n}`
const R = (n: number) => `50000000-0000-4000-a000-00000000000${n}`
const O = (n: number) => `60000000-0000-4000-a000-00000000000${n}`
const I = (n: number) => `70000000-0000-4000-a000-0000000000${String(n).padStart(2, '0')}`
const J = (n: number) => `80000000-0000-4000-a000-0000000000${String(n).padStart(2, '0')}`
const PAY = (n: number) => `90000000-0000-4000-a000-00000000000${n}`

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000)
const dateIn = (n: number) =>
  new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

async function main() {
  // ---- clear, respecting FK direction -------------------------------------
  await db.execute(sql`
    truncate table public.order_events, public.payouts, public.jobs,
      public.order_items, public.orders restart identity cascade
  `)
  await db.execute(sql`
    delete from auth.users where id in
      (${USERS.admin}::uuid, ${USERS.workshop}::uuid, ${USERS.customer}::uuid)
  `)
  await db.execute(sql`
    truncate table public.room_hotspots, public.rooms,
      public.collection_products, public.collections,
      public.product_workshops, public.products, public.workshops cascade
  `)

  // ---- one user per role --------------------------------------------------
  await db.execute(sql`
    insert into auth.users (id, email, raw_user_meta_data) values
      (${USERS.admin}::uuid, 'admin@retro.example', '{"full_name":"Retro Admin"}'),
      (${USERS.workshop}::uuid, 'joinery@retro.example', '{"full_name":"Damietta Joinery Manager"}'),
      (${USERS.customer}::uuid, 'customer@retro.example', '{"full_name":"Test Customer"}')
  `)

  await db.insert(schema.workshops).values([
    { id: W.joinery, slug: 'damietta-joinery', nameEn: 'Damietta Joinery', nameAr: 'نجارة دمياط', active: true },
    { id: W.finishing, slug: 'finishing-house', nameEn: 'Finishing House', nameAr: 'بيت التشطيب', active: true },
    { id: W.carving, slug: 'ras-el-bar-carving', nameEn: 'Ras El Bar Carving', nameAr: 'نحت رأس البر', active: true },
    { id: W.upholstery, slug: 'upholstery-house', nameEn: 'Upholstery House', nameAr: 'بيت التنجيد', active: true },
    { id: W.assembly, slug: 'assembly-hall', nameEn: 'Assembly Hall', nameAr: 'صالة التجميع', active: true },
  ])

  // profiles were created by the signup trigger; assign the roles
  await db.execute(sql`
    update public.profiles set role = 'admin' where id = ${USERS.admin}::uuid
  `)
  await db.execute(sql`
    update public.profiles set role = 'workshop', workshop_id = ${W.joinery}::uuid
    where id = ${USERS.workshop}::uuid
  `)

  // ---- 12 products across 4 rooms -----------------------------------------
  await db.insert(schema.products).values([
    // dining
    { id: P(1), slug: 'nile-dining-table', nameEn: 'Nile Dining Table', nameAr: 'طاولة النيل', room: 'dining', category: 'dining-table', species: 'beech', joinery: 'mortise-and-tenon', finish: 'hardwax oil', dimensionsMm: { w: 2000, d: 1000, h: 750 }, price: '68000', currency: 'EGP' },
    { id: P(2), slug: 'damietta-sideboard', nameEn: 'Damietta Sideboard', nameAr: 'بوفيه دمياط', room: 'dining', category: 'sideboard', species: 'oak', joinery: 'dovetail', finish: 'hardwax oil', dimensionsMm: { w: 1800, d: 450, h: 850 }, price: '54000', currency: 'EGP' },
    { id: P(3), slug: 'rosetta-dining-chair', nameEn: 'Rosetta Dining Chair', nameAr: 'كرسي رشيد', room: 'dining', category: 'chair', species: 'beech', joinery: 'mortise-and-tenon', finish: 'water-based lacquer', dimensionsMm: { w: 460, d: 520, h: 820 }, price: '9500', currency: 'EGP' },
    // living
    { id: P(4), slug: 'delta-coffee-table', nameEn: 'Delta Coffee Table', nameAr: 'طاولة الدلتا', room: 'living', category: 'coffee-table', species: 'walnut', joinery: 'mitred dovetail', finish: 'hardwax oil', dimensionsMm: { w: 1200, d: 600, h: 420 }, price: '32000', currency: 'EGP' },
    { id: P(5), slug: 'port-said-bookshelf', nameEn: 'Port Said Bookshelf', nameAr: 'مكتبة بورسعيد', room: 'living', category: 'bookshelf', species: 'oak', joinery: 'housed dado', finish: 'shellac', dimensionsMm: { w: 1000, d: 350, h: 1900 }, price: '46000', currency: 'EGP' },
    { id: P(6), slug: 'luxor-armchair', nameEn: 'Luxor Armchair', nameAr: 'كرسي الأقصر', room: 'living', category: 'armchair', species: 'beech', joinery: 'mortise-and-tenon', finish: 'hardwax oil', dimensionsMm: { w: 700, d: 780, h: 900 }, price: '28000', currency: 'EGP' },
    // bedroom
    { id: P(7), slug: 'delta-bed', nameEn: 'Delta Bed', nameAr: 'سرير الدلتا', room: 'bedroom', category: 'bed', species: 'oak', joinery: 'dovetail', finish: 'hardwax oil', dimensionsMm: { w: 1800, d: 2100, h: 1100 }, price: '92000', currency: 'EGP' },
    { id: P(8), slug: 'fayoum-wardrobe', nameEn: 'Fayoum Wardrobe', nameAr: 'دولاب الفيوم', room: 'bedroom', category: 'wardrobe', species: 'beech', joinery: 'frame-and-panel', finish: 'shellac', dimensionsMm: { w: 2400, d: 650, h: 2200 }, price: '120000', currency: 'EGP' },
    { id: P(9), slug: 'siwa-nightstand', nameEn: 'Siwa Nightstand', nameAr: 'كومودينو سيوة', room: 'bedroom', category: 'nightstand', species: 'walnut', joinery: 'dovetail', finish: 'hardwax oil', dimensionsMm: { w: 500, d: 400, h: 550 }, price: '14500', currency: 'EGP' },
    // majlis
    { id: P(10), slug: 'majlis-seating-base', nameEn: 'Majlis Seating Base', nameAr: 'قاعدة المجلس', room: 'majlis', category: 'seating', species: 'beech', joinery: 'mortise-and-tenon', finish: 'hardwax oil', dimensionsMm: { w: 2600, d: 800, h: 320 }, price: '75000', currency: 'EGP' },
    { id: P(11), slug: 'majlis-coffee-table', nameEn: 'Majlis Coffee Table', nameAr: 'طاولة المجلس', room: 'majlis', category: 'coffee-table', species: 'walnut', joinery: 'dovetail', finish: 'hardwax oil', dimensionsMm: { w: 900, d: 900, h: 380 }, price: '36000', currency: 'EGP' },
    { id: P(12), slug: 'mashrabiya-screen', nameEn: 'Mashrabiya Screen', nameAr: 'حاجز مشربية', room: 'majlis', category: 'screen', species: 'beech', joinery: 'turned-and-pegged lattice', finish: 'shellac', dimensionsMm: { w: 1500, d: 40, h: 2000 }, price: '58000', currency: 'EGP' },
  ])

  // production chains: joinery first, finishing last
  await db.insert(schema.productWorkshops).values([
    { productId: P(1), workshopId: W.joinery, sequence: 1 }, { productId: P(1), workshopId: W.assembly, sequence: 2 }, { productId: P(1), workshopId: W.finishing, sequence: 3 },
    { productId: P(2), workshopId: W.joinery, sequence: 1 }, { productId: P(2), workshopId: W.finishing, sequence: 2 },
    { productId: P(3), workshopId: W.joinery, sequence: 1 }, { productId: P(3), workshopId: W.upholstery, sequence: 2 }, { productId: P(3), workshopId: W.finishing, sequence: 3 },
    { productId: P(4), workshopId: W.joinery, sequence: 1 }, { productId: P(4), workshopId: W.finishing, sequence: 2 },
    { productId: P(5), workshopId: W.joinery, sequence: 1 }, { productId: P(5), workshopId: W.assembly, sequence: 2 }, { productId: P(5), workshopId: W.finishing, sequence: 3 },
    { productId: P(6), workshopId: W.joinery, sequence: 1 }, { productId: P(6), workshopId: W.upholstery, sequence: 2 }, { productId: P(6), workshopId: W.finishing, sequence: 3 },
    { productId: P(7), workshopId: W.joinery, sequence: 1 }, { productId: P(7), workshopId: W.carving, sequence: 2 }, { productId: P(7), workshopId: W.finishing, sequence: 3 },
    { productId: P(8), workshopId: W.joinery, sequence: 1 }, { productId: P(8), workshopId: W.assembly, sequence: 2 }, { productId: P(8), workshopId: W.finishing, sequence: 3 },
    { productId: P(9), workshopId: W.joinery, sequence: 1 }, { productId: P(9), workshopId: W.finishing, sequence: 2 },
    { productId: P(10), workshopId: W.joinery, sequence: 1 }, { productId: P(10), workshopId: W.upholstery, sequence: 2 }, { productId: P(10), workshopId: W.finishing, sequence: 3 },
    { productId: P(11), workshopId: W.joinery, sequence: 1 }, { productId: P(11), workshopId: W.finishing, sequence: 2 },
    { productId: P(12), workshopId: W.joinery, sequence: 1 }, { productId: P(12), workshopId: W.carving, sequence: 2 }, { productId: P(12), workshopId: W.finishing, sequence: 3 },
  ])

  // ---- 3 collections ------------------------------------------------------
  await db.insert(schema.collections).values([
    { id: C(1), slug: 'founders', nameEn: 'Founders', nameAr: 'المؤسسون', descriptionEn: 'The first twelve pieces out of the Damietta workshops.', descriptionAr: 'أول اثنتي عشرة قطعة من ورش دمياط.' },
    { id: C(2), slug: 'majlis', nameEn: 'Majlis', nameAr: 'المجلس', descriptionEn: 'Floor seating, low tables, and turned screens for the majlis.', descriptionAr: 'جلسات أرضية وطاولات منخفضة وحواجز مخروطة للمجلس.' },
    { id: C(3), slug: 'heritage', nameEn: 'Heritage', nameAr: 'التراث', descriptionEn: 'Shellac finishes and joinery carried from older hands.', descriptionAr: 'تشطيبات الشلاك ونجارة توارثتها الأيادي.' },
  ])
  await db.insert(schema.collectionProducts).values([
    { collectionId: C(1), productId: P(1), position: 1 },
    { collectionId: C(1), productId: P(7), position: 2 },
    { collectionId: C(1), productId: P(10), position: 3 },
    { collectionId: C(2), productId: P(10), position: 1 },
    { collectionId: C(2), productId: P(11), position: 2 },
    { collectionId: C(2), productId: P(12), position: 3 },
    { collectionId: C(3), productId: P(2), position: 1 },
    { collectionId: C(3), productId: P(5), position: 2 },
    { collectionId: C(3), productId: P(12), position: 3 },
  ])

  // ---- 4 room scenes ------------------------------------------------------
  await db.insert(schema.rooms).values([
    { id: R(1), slug: 'dining', nameEn: 'Dining', nameAr: 'السفرة', sceneImageUrl: '/scenes/dining.jpg' },
    { id: R(2), slug: 'living', nameEn: 'Living', nameAr: 'المعيشة', sceneImageUrl: '/scenes/living.jpg' },
    { id: R(3), slug: 'bedroom', nameEn: 'Bedroom', nameAr: 'غرفة النوم', sceneImageUrl: '/scenes/bedroom.jpg' },
    { id: R(4), slug: 'majlis', nameEn: 'Majlis', nameAr: 'المجلس', sceneImageUrl: '/scenes/majlis.jpg' },
  ])
  await db.insert(schema.roomHotspots).values([
    { roomId: R(1), productId: P(1), x: 0.48, y: 0.62, labelEn: 'Nile Dining Table', labelAr: 'طاولة النيل' },
    { roomId: R(1), productId: P(2), x: 0.82, y: 0.44, labelEn: 'Damietta Sideboard', labelAr: 'بوفيه دمياط' },
    { roomId: R(2), productId: P(4), x: 0.5, y: 0.7, labelEn: 'Delta Coffee Table', labelAr: 'طاولة الدلتا' },
    { roomId: R(3), productId: P(7), x: 0.5, y: 0.55, labelEn: 'Delta Bed', labelAr: 'سرير الدلتا' },
    { roomId: R(4), productId: P(11), x: 0.45, y: 0.66, labelEn: 'Majlis Coffee Table', labelAr: 'طاولة المجلس' },
    { roomId: R(4), productId: P(12), x: 0.15, y: 0.4, labelEn: 'Mashrabiya Screen', labelAr: 'حاجز مشربية' },
  ])

  // ---- 6 orders in varied states ------------------------------------------
  const customer = USERS.customer
  await db.insert(schema.orders).values([
    { id: O(1), customerId: customer, status: 'pending', paymentStatus: 'unpaid', subtotal: '38000', total: '38000', currency: 'EGP', createdAt: daysAgo(0), shippingAddress: { name: 'Test Customer', phone: '+201000000001', line1: '12 Corniche St', city: 'Damietta', country: 'EG' } },
    { id: O(2), customerId: customer, status: 'paid', paymentStatus: 'paid', paymentRef: 'pay_seed_0002', subtotal: '68000', total: '68000', currency: 'EGP', createdAt: daysAgo(3), shippingAddress: { name: 'Test Customer', phone: '+201000000001', line1: '12 Corniche St', city: 'Damietta', country: 'EG' } },
    { id: O(3), customerId: customer, status: 'in_production', paymentStatus: 'paid', paymentRef: 'pay_seed_0003', subtotal: '121000', total: '121000', currency: 'EGP', createdAt: daysAgo(14), shippingAddress: { name: 'Test Customer', phone: '+201000000001', line1: '12 Corniche St', city: 'Damietta', country: 'EG' } },
    // o4 starts in_production; the trigger moves it to ready below
    { id: O(4), customerId: customer, status: 'in_production', paymentStatus: 'paid', paymentRef: 'pay_seed_0004', subtotal: '36000', total: '36000', currency: 'EGP', createdAt: daysAgo(30), shippingAddress: { name: 'Test Customer', phone: '+201000000001', line1: '12 Corniche St', city: 'Damietta', country: 'EG' } },
    // a Kuwait-market order: prices frozen in KWD, three decimal places
    { id: O(5), customerId: customer, status: 'shipped', paymentStatus: 'paid', paymentRef: 'pay_seed_0005', subtotal: '1330.500', total: '1380.500', currency: 'KWD', createdAt: daysAgo(45), shippingAddress: { name: 'Test Customer', phone: '+96550000001', line1: 'Block 4, Street 12', city: 'Kuwait City', country: 'KW' } },
    { id: O(6), customerId: customer, status: 'cancelled', paymentStatus: 'refunded', paymentRef: 'pay_seed_0006', subtotal: '58000', total: '58000', currency: 'EGP', createdAt: daysAgo(60), shippingAddress: { name: 'Test Customer', phone: '+201000000001', line1: '12 Corniche St', city: 'Damietta', country: 'EG' } },
  ])

  await db.insert(schema.orderItems).values([
    { id: I(11), orderId: O(1), productId: P(3), qty: 4, unitPrice: '9500' },
    { id: I(21), orderId: O(2), productId: P(1), qty: 1, unitPrice: '68000' },
    { id: I(31), orderId: O(3), productId: P(7), qty: 1, unitPrice: '92000' },
    { id: I(32), orderId: O(3), productId: P(9), qty: 2, unitPrice: '14500' },
    { id: I(41), orderId: O(4), productId: P(11), qty: 1, unitPrice: '36000' },
    { id: I(51), orderId: O(5), productId: P(2), qty: 1, unitPrice: '1330.500' },
  ])

  await db.insert(schema.jobs).values([
    // o2 just paid — chain queued
    { id: J(1), orderItemId: I(21), productId: P(1), qty: 1, workshopId: W.joinery, sequence: 1, status: 'pending', createdAt: daysAgo(3), dueDate: dateIn(11) },
    { id: J(2), orderItemId: I(21), productId: P(1), qty: 1, workshopId: W.assembly, sequence: 2, status: 'pending', createdAt: daysAgo(3), dueDate: dateIn(25) },
    { id: J(3), orderItemId: I(21), productId: P(1), qty: 1, workshopId: W.finishing, sequence: 3, status: 'pending', createdAt: daysAgo(3), dueDate: dateIn(39) },
    // o3 mid-production, created long enough ago to read as overdue
    { id: J(4), orderItemId: I(31), productId: P(7), qty: 1, workshopId: W.joinery, sequence: 1, status: 'in_progress', createdAt: daysAgo(13), acceptedAt: daysAgo(12), startedAt: daysAgo(10), dueDate: dateIn(-3) },
    { id: J(5), orderItemId: I(31), productId: P(7), qty: 1, workshopId: W.carving, sequence: 2, status: 'pending', createdAt: daysAgo(13), dueDate: dateIn(9) },
    { id: J(6), orderItemId: I(31), productId: P(7), qty: 1, workshopId: W.finishing, sequence: 3, status: 'pending', createdAt: daysAgo(13), dueDate: dateIn(23) },
    { id: J(7), orderItemId: I(32), productId: P(9), qty: 2, workshopId: W.joinery, sequence: 1, status: 'accepted', createdAt: daysAgo(13), acceptedAt: daysAgo(11), dueDate: dateIn(-1) },
    { id: J(8), orderItemId: I(32), productId: P(9), qty: 2, workshopId: W.finishing, sequence: 2, status: 'pending', createdAt: daysAgo(13), dueDate: dateIn(13) },
    // o4 both steps accepted; completed below through the trigger path
    { id: J(9), orderItemId: I(41), productId: P(11), qty: 1, workshopId: W.joinery, sequence: 1, status: 'accepted', createdAt: daysAgo(29), acceptedAt: daysAgo(28), dueDate: dateIn(-15) },
    { id: J(10), orderItemId: I(41), productId: P(11), qty: 1, workshopId: W.finishing, sequence: 2, status: 'accepted', createdAt: daysAgo(29), acceptedAt: daysAgo(25), dueDate: dateIn(-1) },
    // o5 long done
    { id: J(11), orderItemId: I(51), productId: P(2), qty: 1, workshopId: W.joinery, sequence: 1, status: 'completed', createdAt: daysAgo(44), acceptedAt: daysAgo(44), startedAt: daysAgo(43), completedAt: daysAgo(40), dueDate: dateIn(-30) },
    { id: J(12), orderItemId: I(51), productId: P(2), qty: 1, workshopId: W.finishing, sequence: 2, status: 'completed', createdAt: daysAgo(44), acceptedAt: daysAgo(40), startedAt: daysAgo(39), completedAt: daysAgo(37), dueDate: dateIn(-25) },
  ])

  // completing o4's jobs fires log_job_event and advance_order_when_complete;
  // the order should come out the other side as 'ready'
  await db.execute(sql`
    update public.jobs set status = 'completed', completed_at = now()
    where order_item_id = ${I(41)}::uuid
  `)

  await db.insert(schema.payouts).values([
    { id: PAY(1), workshopId: W.joinery, jobId: J(11), amount: '12000', currency: 'EGP', status: 'transferred', transferredAt: daysAgo(35) },
    { id: PAY(2), workshopId: W.finishing, jobId: J(12), amount: '9000', currency: 'EGP', status: 'pending' },
    { id: PAY(3), workshopId: W.joinery, jobId: J(9), amount: '11000', currency: 'EGP', status: 'pending' },
  ])

  // ---- verify the trigger did its job -------------------------------------
  const [readyOrder] = await db.execute(sql`
    select status from public.orders where id = ${O(4)}::uuid
  `)
  if (readyOrder?.status !== 'ready') {
    throw new Error(`expected order 4 to be ready, got ${String(readyOrder?.status)}`)
  }

  const counts = await db.execute(sql`
    select
      (select count(*) from public.workshops) as workshops,
      (select count(*) from public.products) as products,
      (select count(distinct room) from public.products) as rooms,
      (select count(*) from public.collections) as collections,
      (select count(*) from public.orders) as orders,
      (select count(*) from public.jobs) as jobs,
      (select count(*) from public.profiles) as profiles,
      (select count(*) from public.order_events) as events
  `)
  console.log('seeded:', counts[0])
  console.log('order 4 reached ready through the trigger')
}

main()
  .then(() => client.end())
  .catch(async (err) => {
    console.error(err)
    await client.end()
    process.exit(1)
  })
