# CLAUDE.md — Taskboard Faz 2

Faz 1 üzerine inşa edilen özellikler. Mevcut kodu bozmadan, adım adım uygula.
Her adımı tamamlamadan diğerine geçme. Onay bekleme.

---

## Faz 2 Özeti

| # | Özellik | Etki |
|---|---------|------|
| 1 | Aktivite logu | Her görev hareketi kayıt altında |
| 2 | Haftalık rapor | Hafta kapanınca otomatik özet |
| 3 | Scratch pad | Board dışı hızlı not alanı |
| 4 | Görev yaşı göstergesi | 3+ gün hareketsiz kart görsel uyarı |
| 5 | Günün görevi | Günlük 1-3 öncelik işaretleme |
| 6 | Klavye kısayolları | Mouse'suz çalışma |
| 7 | Kart kopyalama | Benzer görevleri klonla |
| 8 | Sürükle-bırak | Kolonlar arası mouse ile taşıma |
| 9 | Arama | Başlık + not içinde full-text |

---

## Geliştirme Sırası

```
1. DB migration (ActivityLog, ScratchPad, WeekReport tabloları)
2. Backend: aktivite logu
3. Backend: scratch pad
4. Backend: haftalık rapor
5. Backend: arama endpoint
6. Frontend: görev yaşı göstergesi
7. Frontend: günün görevi
8. Frontend: kart kopyalama
9. Frontend: sürükle-bırak
10. Frontend: aktivite logu UI
11. Frontend: scratch pad UI
12. Frontend: haftalık rapor UI
13. Frontend: arama UI
14. Frontend: klavye kısayolları
15. Son test: docker compose up --build
```

---

## 1. Veritabanı Değişiklikleri

`prisma/schema.prisma`'ya ekle:

```prisma
model ActivityLog {
  id        String   @id @default(uuid())
  taskId    String
  taskTitle String                        // task silinse bile başlık kalır
  action    ActivityAction
  fromStatus Status?
  toStatus   Status?
  createdAt DateTime @default(now())
}

enum ActivityAction {
  CREATED
  STATUS_CHANGED
  UPDATED
  DELETED
  ARCHIVED_AUTO
  ARCHIVED_WEEK_CLOSE
}

model ScratchPad {
  id        Int      @id @default(1)      // tek kayıt
  content   String   @default("")
  updatedAt DateTime @updatedAt
}

model WeekReport {
  id              String   @id @default(uuid())
  weekNumber      Int      @unique
  totalCompleted  Int
  totalCarried    Int      // bir sonraki haftaya taşınan
  tagBreakdown    Json     // { DEV: 3, TEST: 2, ... }
  avgCompletionHours Float? // oluşturulma → done arası ortalama saat
  createdAt       DateTime @default(now())
}
```

`Task` modeline şunu ekle:

```prisma
model Task {
  // mevcut alanlar...
  isTodayTask Boolean  @default(false)   // günün görevi
  // createdAt zaten var — yaş hesabı için kullanılır
}
```

Migration: `npx prisma migrate dev --name faz2`

ScratchPad seed (server.ts start fonksiyonuna ekle):

```typescript
await prisma.scratchPad.upsert({
  where: { id: 1 },
  create: { id: 1, content: '' },
  update: {},
})
```

---

## 2. Backend: Aktivite Logu

### Yardımcı fonksiyon: `backend/src/lib/activity.ts`

```typescript
import { prisma } from '../server'
import { ActivityAction, Status } from '@prisma/client'

export async function logActivity(params: {
  taskId: string
  taskTitle: string
  action: ActivityAction
  fromStatus?: Status
  toStatus?: Status
  tx?: any  // prisma transaction client
}) {
  const client = params.tx || prisma
  return client.activityLog.create({
    data: {
      taskId: params.taskId,
      taskTitle: params.taskTitle,
      action: params.action,
      fromStatus: params.fromStatus,
      toStatus: params.toStatus,
    }
  })
}
```

### Mevcut route'lara log ekle

`tasks.ts` içindeki tüm işlemlere `logActivity` çağrısı ekle:

- `POST /tasks` → `CREATED`
- `PATCH /tasks/:id/status` → `STATUS_CHANGED` (fromStatus, toStatus ile)
- `PATCH /tasks/:id` → `UPDATED`
- `DELETE /tasks/:id` → `DELETED`
- DONE max 10 transaction'ında otomatik arşive düşen kart → `ARCHIVED_AUTO`
- `POST /week/close` transaction'ında → `ARCHIVED_WEEK_CLOSE`

Tüm log yazmaları ilgili işlemle aynı transaction içinde olmalı.

### Yeni endpoint

```
GET /activity?limit=50    → ActivityLog[]  (createdAt desc)
GET /activity?taskId=<id> → ActivityLog[]  (belirli görevin geçmişi)
```

---

## 3. Backend: Scratch Pad

```
GET   /scratch        → { content: string, updatedAt: string }
PATCH /scratch        → { content: string, updatedAt: string }
  body: { content: string }
```

Debounce yazma: frontend her tuş vuruşunda değil, 1 saniye duraksayınca gönderir.
Backend tarafı sadece upsert yapar.

---

## 4. Backend: Haftalık Rapor

`POST /week/close` güncellemesi — hafta kapatılırken rapor otomatik üretilir:

```typescript
// week/close transaction içine ekle:

const completedTasks = // arşive taşınan DONE kartlar
const carriedTasks   = // TODO + IN_PROGRESS kart sayısı

// Tag breakdown
const tagBreakdown: Record<string, number> = {}
completedTasks.forEach(t => {
  tagBreakdown[t.tag] = (tagBreakdown[t.tag] || 0) + 1
})

// Ortalama tamamlanma süresi (saat)
const durations = completedTasks.map(t =>
  (new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime()) / 3600000
)
const avgHours = durations.length
  ? durations.reduce((a, b) => a + b, 0) / durations.length
  : null

await tx.weekReport.create({
  data: {
    weekNumber: currentWeek,
    totalCompleted: completedTasks.length,
    totalCarried: carriedTasks,
    tagBreakdown,
    avgCompletionHours: avgHours,
  }
})
```

### Yeni endpoint

```
GET /reports           → WeekReport[]  (weekNumber desc)
GET /reports/:week     → WeekReport
```

---

## 5. Backend: Arama

```
GET /tasks/search?q=<query>   → Task[]
```

PostgreSQL `ilike` ile başlık ve notta arama:

```typescript
const tasks = await prisma.task.findMany({
  where: {
    OR: [
      { title: { contains: q, mode: 'insensitive' } },
      { notes: { contains: q, mode: 'insensitive' } },
    ]
  },
  orderBy: { createdAt: 'desc' },
  take: 20,
})
```

---

## 6. Frontend: Görev Yaşı Göstergesi

`TaskCard.tsx` içinde:

```typescript
function getTaskAge(createdAt: string): number {
  return Math.floor(
    (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
  )
}
```

Kullanım kuralı:
- Sadece TODO ve IN_PROGRESS kartlarda göster (DONE'da anlamsız)
- 3-6 gün: kart solunda ince sarı (`#fbbf24`) nokta + `{n}g` etiketi
- 7+ gün: kart solunda ince kırmızı (`#f87171`) nokta + `{n}g` etiketi
- 0-2 gün: hiçbir şey gösterme

Etiket kartın sağ üst köşesinde, `font-family: IBM Plex Mono, 10px, --text-faint` rengiyle.

---

## 7. Frontend: Günün Görevi

### Topbar değişikliği

Topbar'a "Günün Görevi" bölümü ekle (logo ile hafta bilgisi arasına):

```
[ taskboard ]  [ 📌 Sidebar yeniden tasarımı  ×  +1 ]  [ Hafta 2 ]  [ ... ]
```

- `PATCH /tasks/:id` ile `isTodayTask: true/false` toggle edilir
- Max 3 görev işaretlenebilir, 4. işaretlenmeye çalışılırsa toast: `"Günlük max 3 görev"`
- Topbar'da işaretli görevler hap (pill) olarak görünür, üzerine tıklanınca kaldırılır
- Board'daki kartta da `📌` ikonu görünür (title'ın sol başında, küçük)

### Gece yarısı sıfırlama

Her `GET /tasks` isteğinde backend, `isTodayTask = true` olan görevlerin
`createdAt` tarihini değil, ayrı bir `todayMarkedAt` alanını kontrol eder.
Eğer `todayMarkedAt` bugünden önceyse otomatik `isTodayTask = false` yapar.

`Task` modeline ekle:
```prisma
todayMarkedAt DateTime?
```

Backend `PATCH /tasks/:id` içinde `isTodayTask: true` set edilirken
`todayMarkedAt: new Date()` da güncelle.

`GET /tasks`'ta her istek başında:
```typescript
await prisma.task.updateMany({
  where: {
    isTodayTask: true,
    todayMarkedAt: { lt: startOfToday() }
  },
  data: { isTodayTask: false }
})
```

`startOfToday()` yardımcı fonksiyon:
```typescript
function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}
```

---

## 8. Frontend: Kart Kopyalama

`TaskCard.tsx` üzerine hover edilince sağ üstte `⧉` butonu çıkar.

Tıklanınca:
1. `POST /tasks` ile aynı title, notes, priority, tag ile yeni görev oluştur
2. Status her zaman `TODO` (kopyalanan kart nerede olursa olsun)
3. Toast: `"Kart kopyalandı"`

Buton stili: `16px, --text-faint rengi, hover'da --text-muted`

---

## 9. Frontend: Sürükle-Bırak

Kütüphane: `@dnd-kit/core` + `@dnd-kit/sortable`

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### Davranış kuralları

- Kart bir kolondan diğerine sürüklenince `PATCH /tasks/:id/status` çağrılır
- İş kuralları korunur: DONE'a bırakınca max 10 kuralı tetiklenir
- Aynı kolon içinde sıraya göre taşıma da çalışır (`position` alanı güncellenir)
- Sürükleme sırasında kart yarı saydam görünür, bırakıldığı kolon highlight alır

### Uygulama yapısı

```tsx
// Board.tsx
<DndContext onDragEnd={handleDragEnd}>
  <Column status="TODO" tasks={todoTasks} />
  <Column status="IN_PROGRESS" tasks={inProgressTasks} />
  <Column status="DONE" tasks={doneTasks} />
</DndContext>
```

```typescript
async function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event
  if (!over) return

  const taskId = active.id as string
  const newStatus = over.data.current?.status as Status

  if (newStatus && newStatus !== active.data.current?.status) {
    await moveTask(taskId, newStatus)
    refetch()
  }
}
```

---

## 10. Frontend: Aktivite Logu UI

`TaskCard.tsx`'e tıklanınca görev detay paneli açılır (sağdan slide-in panel, `position: fixed` değil — board'un sağında genişleyen bir panel).

Panel içeriği:
- Görev başlığı + düzenleme ikonu
- Notlar alanı (düzenlenebilir textarea)
- Mevcut durum + öncelik + tag
- **Aktivite zaman çizelgesi** (alta doğru):

```
● Oluşturuldu          2 gün önce
● TODO → IN_PROGRESS   1 gün önce
● Güncellendi          3 saat önce
```

Zaman gösterimi: `formatDistanceToNow` — `date-fns` kütüphanesi ile:
```bash
npm install date-fns
```

---

## 11. Frontend: Scratch Pad UI

Topbar'da sağ kenara `📝` butonu ekle.

Tıklanınca board'un altında tam genişlikte panel açılır:

```
[ // scratch pad                              ] [ × ]
[ _________________________________________________ ]
[ Textarea — serbest metin, otomatik kayıt        ]
[ _________________________________________________ ]
[ Son kaydedildi: 14:32                           ]
```

- Kullanıcı yazdıkça 1 saniye debounce ile `PATCH /scratch` çağrılır
- Kaydedilince "Son kaydedildi: {saat}" güncellenir
- Font: `IBM Plex Mono 13px`
- Arka plan: `--bg-card`
- Minimum yükseklik: 120px, resize: vertical

---

## 12. Frontend: Haftalık Rapor UI

"Hafta Kapat" modalına rapor bölümü ekle.

**Hafta kapatma onayı modalı** (mevcut) değişmez — sadece onaylandıktan sonra:

Yeni `WeekReportModal` komponenti açılır, hafta kapanma sonucu gösterilir:

```
// hafta 2 raporu

  12          3           DEV ████ 4
tamamlandı  devam eder  TEST ███  3
                        DOC  ██   2
  ⌀ 4.2 saat            OPS  █    1
  tamamlanma süresi
```

Geçmiş hafta raporlarına `GET /reports` ile ulaşılır.
Topbar'a `📊` butonu ekle — tüm geçmiş raporları liste halinde gösterir.

Rapor paneli tasarım kuralları:
- Sayılar: `IBM Plex Mono, 28px, --text-primary`
- Etiketler: `IBM Plex Sans, 11px, --text-faint`
- Tag bar chart: her tag için renkli bar (`▊` karakteri ile veya `<div>` bar)
- Bar renkleri Faz 1'deki tag renkleriyle aynı

---

## 13. Frontend: Arama UI

Topbar'a `🔍` butonu veya `/` kısayolu ile arama açılır.

```
[ /  Görev ara...                              ]
  ┌──────────────────────────────────────────┐
  │ Sidebar yeniden tasarımı     design  TODO │
  │ Qulse CSV import dokümanı    doc    TODO  │
  │ AUTH grup test senaryoları   test   DONE  │
  └──────────────────────────────────────────┘
```

- Input'a yazılınca 300ms debounce ile `GET /tasks/search?q=` çağrılır
- Sonuçlar dropdown olarak açılır (max 8 sonuç)
- Sonuca tıklanınca görev detay paneli açılır
- `ESC` ile kapatılır
- Sonuç yoksa: `"Sonuç bulunamadı"`

---

## 14. Frontend: Klavye Kısayolları

Global `useEffect` ile `keydown` listener ekle. Input/textarea odaklanmışken devre dışı bırak.

| Kısayol | Eylem |
|---------|-------|
| `N` | Yeni görev modalı aç |
| `/` | Arama aç |
| `P` | Scratch pad aç/kapat |
| `R` | Raporlar paneli aç/kapat |
| `ESC` | Açık modal/panel kapat |
| `?` | Kısayol listesi göster |

Kısayol listesi: küçük modal, tüm kısayolları tablo halinde gösterir.

Uygulama:

```typescript
// hooks/useKeyboardShortcuts.ts
export function useKeyboardShortcuts(handlers: Record<string, () => void>) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const active = document.activeElement
      const isInput = active?.tagName === 'INPUT' ||
                      active?.tagName === 'TEXTAREA' ||
                      (active as HTMLElement)?.isContentEditable
      if (isInput) return

      const handler = handlers[e.key.toLowerCase()]
      if (handler) {
        e.preventDefault()
        handler()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handlers])
}
```

---

## Yeni API Endpoint Özeti

```
GET  /activity             → ActivityLog[]
GET  /activity?taskId=<id> → ActivityLog[]
GET  /scratch              → ScratchPad
PATCH /scratch             → ScratchPad
GET  /reports              → WeekReport[]
GET  /reports/:week        → WeekReport
GET  /tasks/search?q=<q>   → Task[]
```

---

## Güncellenmiş Frontend types.ts

```typescript
// Mevcut tiplere ekle:

export interface ActivityLog {
  id: string
  taskId: string
  taskTitle: string
  action: ActivityAction
  fromStatus?: Status
  toStatus?: Status
  createdAt: string
}

export type ActivityAction =
  | 'CREATED'
  | 'STATUS_CHANGED'
  | 'UPDATED'
  | 'DELETED'
  | 'ARCHIVED_AUTO'
  | 'ARCHIVED_WEEK_CLOSE'

export interface ScratchPad {
  content: string
  updatedAt: string
}

export interface WeekReport {
  id: string
  weekNumber: number
  totalCompleted: number
  totalCarried: number
  tagBreakdown: Record<string, number>
  avgCompletionHours: number | null
  createdAt: string
}

// Task tipine ekle:
// isTodayTask: boolean
// todayMarkedAt?: string
```

---

## Yeni Paketler

```bash
# backend
# (yeni paket gerekmez)

# frontend
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm install date-fns
```

---

## Notlar

- Sürükle-bırak ve klavye kısayolları aynı anda çalışmalı — çakışma olmamalı
- Tüm yeni panel açma/kapama işlemleri `ESC` ile çalışmalı
- Aktivite logu mevcut task CRUD'unu yavaşlatmamalı — transaction içinde olsa da index ekle: `ActivityLog` tablosunda `taskId` ve `createdAt` üzerinde index
- Scratch pad içeriği şifreli saklanmaz, düz metin
- Haftalık rapor sadece hafta kapatılınca oluşur, sonradan değiştirilemez
- `docker compose up --build` ile test et, migration hataları varsa düzelt