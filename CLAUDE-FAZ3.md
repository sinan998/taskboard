# CLAUDE.md — Taskboard Faz 3

Faz 1 ve Faz 2 üzerine inşa edilen güç kullanıcı özellikleri.
Mevcut kodu bozmadan, adım adım uygula. Her adımı tamamlamadan diğerine geçme. Onay bekleme.

---

## Faz 3 Özeti

| # | Özellik | Etki |
|---|---------|------|
| 1 | Odak modu | Tek karta tam ekran odak |
| 2 | Tahmini süre | Görev yük takibi |
| 3 | Proje etiketleri | Paralel projeleri ayır |
| 4 | Bağlantılı görevler | Bloke ilişkileri görselleştir |
| 5 | Çoklu board | İş / kişisel ayrımı |
| 6 | CSV export | Verileri dışarı aktar |
| 7 | Webhook / API | Dışarıdan görev aç |

---

## Geliştirme Sırası

```
1. DB migration (Project, TaskRelation tabloları + yeni alanlar)
2. Backend: proje CRUD
3. Backend: çoklu board
4. Backend: bağlantılı görevler
5. Backend: tahmini süre
6. Backend: CSV export
7. Backend: webhook endpoint
8. Frontend: proje etiketleri UI
9. Frontend: çoklu board UI
10. Frontend: bağlantılı görevler UI
11. Frontend: tahmini süre UI
12. Frontend: odak modu
13. Frontend: CSV export butonu
14. Son test: docker compose up --build
```

---

## 1. Veritabanı Değişiklikleri

`prisma/schema.prisma`'ya ekle:

```prisma
model Project {
  id        String   @id @default(uuid())
  name      String
  color     String   @default("#a78bfa")  // hex renk kodu
  createdAt DateTime @default(now())
  tasks     Task[]
}

model Board {
  id        String   @id @default(uuid())
  name      String
  isDefault Boolean  @default(false)
  createdAt DateTime @default(now())
  tasks     Task[]
}

model TaskRelation {
  id          String       @id @default(uuid())
  fromTaskId  String
  toTaskId    String
  type        RelationType @default(BLOCKS)
  createdAt   DateTime     @default(now())

  @@unique([fromTaskId, toTaskId])
}

enum RelationType {
  BLOCKS      // fromTask, toTask'ı bloke ediyor
  RELATES_TO  // genel ilişki
}
```

`Task` modeline ekle:

```prisma
model Task {
  // mevcut alanlar...
  estimatedHours Float?    // tahmini süre (saat)
  projectId      String?
  project        Project?  @relation(fields: [projectId], references: [id])
  boardId        String?
  board          Board?    @relation(fields: [boardId], references: [id])
}
```

`WeekReport` modeline ekle:

```prisma
model WeekReport {
  // mevcut alanlar...
  boardId        String?   // hangi board'un raporu
  totalEstimatedHours Float?
  totalActualHours    Float?  // createdAt → DONE arası gerçek süre
}
```

Migration: `npx prisma migrate dev --name faz3`

### Seed: varsayılan board

`server.ts` start fonksiyonuna ekle:

```typescript
await prisma.board.upsert({
  where: { id: 'default' },
  create: { id: 'default', name: 'Ana Board', isDefault: true },
  update: {},
})

// Mevcut board'suz görevleri varsayılan board'a ata
await prisma.task.updateMany({
  where: { boardId: null },
  data: { boardId: 'default' },
})
```

---

## 2. Backend: Proje CRUD

### Endpoints

```
GET    /projects           → Project[]
POST   /projects           → Project
  body: { name: string, color: string }
PATCH  /projects/:id       → Project
DELETE /projects/:id       → 204
  (projeye bağlı görevlerin projectId'si null yapılır)
```

### Proje filtresi

`GET /tasks?projectId=<id>` filtresi ekle.

`GET /tasks` response'una proje bilgisi dahil et:

```typescript
include: { project: { select: { id: true, name: true, color: true } } }
```

---

## 3. Backend: Çoklu Board

### Endpoints

```
GET    /boards             → Board[]
POST   /boards             → Board
  body: { name: string }
PATCH  /boards/:id         → Board
DELETE /boards/:id         → 204
  (varsayılan board silinemez — 400 dön)
  (board'daki görevler varsayılan board'a taşınır)
```

### Board filtresi

Tüm görev endpoint'lerinde `boardId` query parametresi zorunlu hale gelir:

```
GET /tasks?boardId=<id>
POST /tasks → body'de boardId zorunlu
```

`boardId` gelmezse varsayılan board kullanılır.

Hafta kapatma (`POST /week/close`) board bazlı çalışır:

```
POST /week/close?boardId=<id>
```

BoardId gelmezse tüm board'ları kapatır.

---

## 4. Backend: Bağlantılı Görevler

### Endpoints

```
GET  /tasks/:id/relations        → { blocks: Task[], blockedBy: Task[], relatesTo: Task[] }
POST /tasks/:id/relations        → TaskRelation
  body: { toTaskId: string, type: RelationType }
DELETE /tasks/:id/relations/:relationId → 204
```

### İş kuralı

Bir görev `BLOCKS` ilişkisiyle başka bir göreve bağlıysa ve o görev
hâlâ TODO veya IN_PROGRESS durumundaysa:

`GET /tasks` response'unda bu görev `isBlocked: true` alanıyla döner.

```typescript
// tasks.ts içinde GET /tasks'a ekle:
const relations = await prisma.taskRelation.findMany({
  where: { toTaskId: { in: tasks.map(t => t.id) }, type: 'BLOCKS' }
})
const blockedIds = new Set(
  relations
    .filter(r => {
      const fromTask = tasks.find(t => t.id === r.fromTaskId)
      return fromTask && fromTask.status !== 'DONE'
    })
    .map(r => r.toTaskId)
)
return tasks.map(t => ({ ...t, isBlocked: blockedIds.has(t.id) }))
```

---

## 5. Backend: Tahmini Süre

`Task` modeline `estimatedHours` zaten eklendi.

### Endpoint güncelleme

`POST /tasks` ve `PATCH /tasks/:id` body'sine `estimatedHours?: number` ekle.

### Board yük özeti

```
GET /boards/:id/workload   → {
  totalEstimatedHours: number,
  todoHours: number,
  inProgressHours: number,
  taskCount: { todo: number, inProgress: number, done: number }
}
```

---

## 6. Backend: CSV Export

```
GET /export/tasks?boardId=<id>    → CSV dosyası
GET /export/archive?boardId=<id>  → CSV dosyası
```

Response headers:

```typescript
reply.header('Content-Type', 'text/csv; charset=utf-8')
reply.header('Content-Disposition', 'attachment; filename="tasks-hafta-{n}.csv"')
```

CSV formatı — tasks:

```
id,title,notes,status,priority,tag,project,estimatedHours,createdAt,updatedAt
```

CSV formatı — archive:

```
id,title,priority,tag,project,weekNumber,archiveReason,archivedAt
```

CSV oluşturmak için harici paket kullanma, manuel string birleştir:

```typescript
function toCSV(headers: string[], rows: string[][]): string {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  return [
    headers.join(','),
    ...rows.map(r => r.map(escape).join(','))
  ].join('\n')
}
```

---

## 7. Backend: Webhook

### Endpoint

```
POST /webhook/tasks        → Task (yeni görev oluşturur)
```

Bu endpoint JWT gerektirmez — bunun yerine `X-Webhook-Secret` header'ı ile doğrulama yapılır.

`.env`'e ekle:

```
WEBHOOK_SECRET=change_this_webhook_secret
```

Doğrulama:

```typescript
const secret = request.headers['x-webhook-secret']
if (secret !== process.env.WEBHOOK_SECRET) {
  return reply.status(401).send({ error: 'Invalid webhook secret' })
}
```

Body:

```typescript
{
  title: string       // zorunlu
  notes?: string
  priority?: Priority // default: MEDIUM
  tag?: Tag           // default: DEV
  boardId?: string    // default: varsayılan board
  projectId?: string
}
```

Aktivite logu: `CREATED` olarak kayıt edilir.

### Örnek kullanım (README'ye ekle)

```bash
curl -X POST http://localhost/api/webhook/tasks \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your_secret" \
  -d '{"title": "Script çıktısını kontrol et", "tag": "OPS", "priority": "HIGH"}'
```

---

## 8. Frontend: Proje Etiketleri UI

### Proje yönetimi

Topbar'a `⊞` (veya proje ikonu) butonu ekle.
Tıklanınca yan panel açılır:

```
// projeler

  [ + Yeni proje ]

  ● Qulse          [düzenle] [sil]
  ● Migros R10     [düzenle] [sil]
  ● Kişisel        [düzenle] [sil]
```

Proje rengi: 8 sabit renk seçeneği sunar (mor, mavi, yeşil, sarı, kırmızı, turuncu, pembe, gri).

### Görev kartında proje etiketi

`TaskCard.tsx` içinde tag pill'in yanına proje renk noktası + adı ekle:

```
[ test ]  ● Qulse   yüksek
```

### Board filtresi

Topbar'a proje filtresi dropdown ekle:
`Tüm Projeler | Qulse | Migros R10 | Kişisel`

Seçilince `GET /tasks?projectId=<id>` çağrılır.

---

## 9. Frontend: Çoklu Board UI

### Board seçici

Topbar'ın en soluna logo ile arama arasına board seçici ekle:

```
[ taskboard ]  [ Ana Board ▾ ]  ...
```

Dropdown:
```
✓ Ana Board
  Kişisel
  ──────────
  + Yeni board
```

Board değişince tüm veri o board için yeniden yüklenir.

### Board yük özeti

Board seçicinin yanında küçük pill:

```
[ Ana Board ▾ ]  [ 12.5s tahmini · 5 aktif ]
```

`GET /boards/:id/workload` ile güncellenir.

### Board silme

Board silinince içindeki görevler "Ana Board"a taşınır.
Silme öncesi onay modalı: `"{n} görev Ana Board'a taşınacak. Devam?"`

---

## 10. Frontend: Bağlantılı Görevler UI

Görev detay panelinde (Faz 2'de eklenen aktivite logu paneli) yeni bölüm:

```
// ilişkiler

  Bloklıyor:
  ⬡ Sidebar tasarımı bitmeden deploy yapma    IN_PROGRESS

  Bağlantılı:
  ⬡ Playwright test senaryoları               TODO

  [ + İlişki ekle ]
```

### Bloke gösterge

`isBlocked: true` olan kartlarda başlığın solunda `⊘` ikonu (`#f87171` rengi).
Hover'da tooltip: `"Bloke edilmiş — ilişkiyi görmek için aç"`

### İlişki ekleme

`+ İlişki ekle` tıklanınca arama kutusu açılır (Faz 2 arama altyapısını kullan).
Görev seçilir, ilişki tipi seçilir (Bloke eder / Bağlantılı), kaydedilir.

---

## 11. Frontend: Tahmini Süre UI

### Görev formuna ekle

`NewTaskModal` ve görev detay paneline `estimatedHours` alanı ekle:

```
Tahmini süre: [ 2 ] saat
```

Input: number, min: 0.5, max: 99, step: 0.5

### Kart üzerinde göster

Tahmini süresi olan kartlarda sağ alt köşede:

```
⏱ 2s
```

`IBM Plex Mono, 10px, --text-faint`

### Board yük özeti

Topbar'daki pill güncellenir:
- `12.5s tahmini` = TODO + IN_PROGRESS kartların toplam tahmini süresi
- `5 aktif` = TODO + IN_PROGRESS kart sayısı

---

## 12. Frontend: Odak Modu

Klavye kısayolu: `F` (Faz 2 kısayol sistemine ekle)
Ya da kart üzerinde hover'da çıkan `⤢` butonu.

### Davranış

Odak modunda:
- Board kaybolur
- Tek kart tam genişlikte, merkezi bir panelde açılır
- Başlık büyük font ile (`IBM Plex Mono, 24px`)
- Notlar düzenlenebilir
- Aktivite logu altta görünür
- Sol/sağ ok ile aynı kolondaki diğer kartlar arası geçiş yapılır
- `ESC` veya `⤡` butonu ile normal görünüme dön

### Odak modu layout

```
┌─────────────────────────────────────────────┐
│  ← Ana Board  /  IN_PROGRESS          ⤡ ✕  │
│                                             │
│  Sidebar yeniden tasarımı                   │
│  ─────────────────────────                  │
│  ● Qulse   design   YÜKSEK   ⏱ 4s          │
│                                             │
│  Notlar                                     │
│  ┌─────────────────────────────────────┐    │
│  │ Qase.io'daki sidebar'a bak...       │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Aktivite                                   │
│  ● Oluşturuldu          2 gün önce          │
│  ● TODO → IN_PROGRESS   1 gün önce          │
│                                             │
│            ← önceki    sonraki →            │
└─────────────────────────────────────────────┘
```

Arka plan: `--bg-app` üzerinde `--bg-surface` panel, `border: 1px solid --border`.
`position: fixed` değil — wrapper div ile tam genişlik/yükseklik.

---

## 13. Frontend: CSV Export Butonu

Topbar'a `⬇` (download) butonu ekle, dropdown:

```
  Görevleri İndir (.csv)
  Arşivi İndir (.csv)
```

Tıklanınca `GET /export/tasks?boardId=<id>` veya `GET /export/archive?boardId=<id>` çağrılır.
Response blob olarak alınır, `<a download>` ile indirilir:

```typescript
async function downloadCSV(url: string, filename: string) {
  const res = await fetch(url, { headers: headers() })
  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}
```

---

## Yeni API Endpoint Özeti

```
GET    /projects
POST   /projects
PATCH  /projects/:id
DELETE /projects/:id

GET    /boards
POST   /boards
PATCH  /boards/:id
DELETE /boards/:id
GET    /boards/:id/workload

GET    /tasks/:id/relations
POST   /tasks/:id/relations
DELETE /tasks/:id/relations/:relationId

GET    /export/tasks?boardId=<id>
GET    /export/archive?boardId=<id>

POST   /webhook/tasks   (JWT gerektirmez, X-Webhook-Secret ile doğrulama)
```

---

## Güncellenmiş types.ts

```typescript
export interface Project {
  id: string
  name: string
  color: string
  createdAt: string
}

export interface Board {
  id: string
  name: string
  isDefault: boolean
  createdAt: string
}

export interface BoardWorkload {
  totalEstimatedHours: number
  todoHours: number
  inProgressHours: number
  taskCount: { todo: number; inProgress: number; done: number }
}

export type RelationType = 'BLOCKS' | 'RELATES_TO'

export interface TaskRelation {
  id: string
  fromTaskId: string
  toTaskId: string
  type: RelationType
  createdAt: string
}

// Task tipine ekle:
// estimatedHours?: number
// projectId?: string
// project?: Pick<Project, 'id' | 'name' | 'color'>
// boardId?: string
// isBlocked?: boolean
```

---

## Klavye Kısayolları Güncellemesi (Faz 2'ye ekle)

| Kısayol | Eylem |
|---------|-------|
| `F` | Odak modu aç (seçili kart yoksa ilk IN_PROGRESS kartı) |
| `B` | Board seçici aç |
| `←` `→` | Odak modunda önceki/sonraki kart |

---

## .env Güncellemesi

```
# Mevcut değişkenlere ekle:
WEBHOOK_SECRET=change_this_webhook_secret
```

---

## Yeni Paketler

```bash
# backend - yeni paket gerekmez

# frontend - yeni paket gerekmez
# (dnd-kit ve date-fns Faz 2'de zaten eklendi)
```

---

## Notlar

- Çoklu board eklenince tüm mevcut görevler varsayılan board'a atanmalı (migration seed)
- Webhook endpoint rate limit ekle: aynı IP'den dakikada max 30 istek (basit in-memory)
- CSV export büyük veri setlerinde stream olarak yazılmalı (Fastify reply.raw)
- Odak modu açıkken klavye kısayolları sadece odak modu kısayollarını dinlemeli
- Bağlantılı görev döngüsü engellenmeli: A → B → A ilişkisi kurulmamalı (400 dön)
- `docker compose up --build` ile test et, migration hataları varsa düzelt