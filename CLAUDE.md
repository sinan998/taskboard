# CLAUDE.md — Taskboard

Tek kullanıcılı, Docker Compose ile çalışan Kanban board uygulaması.
Görevleri TODO → IN_PROGRESS → DONE akışıyla takip eder.

---

## Proje Özeti

Kişisel Jira benzeri görev takip uygulaması. Temel özellikler:

- Kanban board (TODO / IN_PROGRESS / DONE)
- DONE kolonunda max 10 kart; 11. kart gelince en eski otomatik arşive düşer
- Haftalık manuel kapanış; hafta numarası ve rapor üretilir
- Aktivite logu, scratch pad, tam metin arama
- Sürükle-bırak kart taşıma, klavye kısayolları
- Çoklu board ve proje etiketleri
- Bağlantılı görevler (bloklama ilişkileri)
- Odak modu, CSV export, webhook API
- Tek kullanıcı, JWT session

---

## Tech Stack

| Katman      | Teknoloji                        |
|-------------|----------------------------------|
| Frontend    | React + Vite + TypeScript        |
| Backend     | Fastify + TypeScript             |
| ORM         | Prisma                           |
| Veritabanı  | PostgreSQL 16                    |
| Proxy       | Nginx (SPA + API tek port)       |
| Konteyner   | Docker Compose                   |

### Paketler

**Backend:**
```json
{
  "dependencies": {
    "@fastify/cors": "^9",
    "@fastify/jwt": "^8",
    "@prisma/client": "^5",
    "fastify": "^4"
  },
  "devDependencies": {
    "prisma": "^5",
    "tsx": "^4",
    "typescript": "^5",
    "@types/node": "^20"
  }
}
```

**Frontend:**
```json
{
  "dependencies": {
    "@dnd-kit/core": "latest",
    "@dnd-kit/sortable": "latest",
    "@dnd-kit/utilities": "latest",
    "date-fns": "latest",
    "react": "^18",
    "react-dom": "^18"
  }
}
```

---

## Proje Dizin Yapısı

```
taskboard/
├── docker-compose.yml
├── .env                         # APP_PORT
├── frontend/
│   ├── Dockerfile               # multi-stage: build + nginx
│   ├── nginx/
│   │   └── default.conf
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── api.ts               # tüm fetch çağrıları
│       ├── types.ts             # shared tipler
│       ├── hooks/
│       │   └── useKeyboardShortcuts.ts
│       ├── components/
│       │   ├── Board.tsx        # DndContext + kolon grid
│       │   ├── Column.tsx       # SortableContext
│       │   ├── TaskCard.tsx     # kart + yaş + günün görevi + kopyala
│       │   ├── TaskDetailPanel.tsx  # aktivite logu + ilişkiler
│       │   ├── FocusMode.tsx    # tam ekran odak
│       │   ├── NewTaskModal.tsx
│       │   ├── CloseWeekModal.tsx
│       │   ├── WeekReportModal.tsx
│       │   ├── ArchivePanel.tsx
│       │   ├── ScratchPad.tsx
│       │   ├── SearchBar.tsx
│       │   ├── ProjectPanel.tsx
│       │   ├── BoardSelector.tsx
│       │   └── Toast.tsx
│       └── index.css
└── backend/
    ├── Dockerfile
    ├── package.json
    ├── tsconfig.json
    ├── prisma/
    │   └── schema.prisma
    └── src/
        ├── server.ts
        ├── auth.ts              # JWT middleware
        ├── lib/
        │   └── activity.ts      # logActivity yardımcı
        └── routes/
            ├── auth.ts
            ├── tasks.ts
            ├── archive.ts
            ├── week.ts
            ├── activity.ts
            ├── scratch.ts
            ├── reports.ts
            ├── projects.ts
            ├── boards.ts
            ├── relations.ts
            ├── export.ts
            └── webhook.ts
```

---

## Altyapı

### Docker Compose

`docker-compose.yml`:

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: taskboard
      POSTGRES_USER: taskboard
      POSTGRES_PASSWORD: taskboard_secret
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U taskboard"]
      interval: 5s
      timeout: 5s
      retries: 5

  api:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://taskboard:taskboard_secret@postgres:5432/taskboard
      JWT_SECRET: change_this_secret_in_production
      PORT: 3001
      AUTH_USERNAME: admin
      AUTH_PASSWORD: admin123
      WEBHOOK_SECRET: change_this_webhook_secret
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "${APP_PORT:-8080}:80"
    depends_on:
      - api
    restart: unless-stopped

volumes:
  pgdata:
```

### Frontend Dockerfile (multi-stage)

`frontend/Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### Backend Dockerfile

`backend/Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
```

### Nginx Konfigürasyonu

`frontend/nginx/default.conf`:

```nginx
server {
    listen 80;

    location /api/ {
        proxy_pass http://api:3001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
}
```

---

## Veritabanı Şeması

`backend/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Task {
  id             String    @id @default(uuid())
  title          String
  notes          String?
  status         Status    @default(TODO)
  priority       Priority  @default(MEDIUM)
  tag            Tag       @default(DEV)
  position       Int       @default(0)
  isTodayTask    Boolean   @default(false)
  todayMarkedAt  DateTime?
  estimatedHours Float?
  projectId      String?
  project        Project?  @relation(fields: [projectId], references: [id])
  boardId        String?
  board          Board?    @relation(fields: [boardId], references: [id])
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
}

model ArchivedTask {
  id            String        @id @default(uuid())
  title         String
  notes         String?
  priority      Priority
  tag           Tag
  weekNumber    Int
  archivedAt    DateTime      @default(now())
  archiveReason ArchiveReason @default(AUTO)
}

model WeekMeta {
  id         Int      @id @default(1)
  weekNumber Int      @default(1)
  startedAt  DateTime @default(now())
}

model ActivityLog {
  id         String         @id @default(uuid())
  taskId     String
  taskTitle  String
  action     ActivityAction
  fromStatus Status?
  toStatus   Status?
  createdAt  DateTime       @default(now())

  @@index([taskId])
  @@index([createdAt])
}

model ScratchPad {
  id        Int      @id @default(1)
  content   String   @default("")
  updatedAt DateTime @updatedAt
}

model WeekReport {
  id                  String   @id @default(uuid())
  weekNumber          Int      @unique
  totalCompleted      Int
  totalCarried        Int
  tagBreakdown        Json
  avgCompletionHours  Float?
  boardId             String?
  totalEstimatedHours Float?
  totalActualHours    Float?
  createdAt           DateTime @default(now())
}

model Project {
  id        String   @id @default(uuid())
  name      String
  color     String   @default("#a78bfa")
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
  id         String       @id @default(uuid())
  fromTaskId String
  toTaskId   String
  type       RelationType @default(BLOCKS)
  createdAt  DateTime     @default(now())

  @@unique([fromTaskId, toTaskId])
}

enum Status {
  TODO
  IN_PROGRESS
  DONE
}

enum Priority {
  HIGH
  MEDIUM
  LOW
}

enum Tag {
  DEV
  TEST
  DESIGN
  DOC
  BUG
  OPS
}

enum ArchiveReason {
  AUTO
  WEEK_CLOSE
}

enum ActivityAction {
  CREATED
  STATUS_CHANGED
  UPDATED
  DELETED
  ARCHIVED_AUTO
  ARCHIVED_WEEK_CLOSE
}

enum RelationType {
  BLOCKS
  RELATES_TO
}
```

### Seed (server.ts start fonksiyonunda)

```typescript
await prisma.weekMeta.upsert({ where: { id: 1 }, create: { id: 1, weekNumber: 1 }, update: {} })
await prisma.scratchPad.upsert({ where: { id: 1 }, create: { id: 1, content: '' }, update: {} })
await prisma.board.upsert({
  where: { id: 'default' },
  create: { id: 'default', name: 'Ana Board', isDefault: true },
  update: {},
})
await prisma.task.updateMany({ where: { boardId: null }, data: { boardId: 'default' } })
```

---

## API Endpoints

Tüm endpoint'ler `Authorization: Bearer <token>` gerektirir, webhook hariç.

### Auth

```
POST /auth/login   body: { username, password } → { token }
```

### Tasks

```
GET    /tasks                    → Task[]  (?status=, ?boardId=, ?projectId=)
POST   /tasks                    → Task
PATCH  /tasks/:id                → Task   (title, notes, status, priority, tag, isTodayTask, estimatedHours)
DELETE /tasks/:id                → 204
PATCH  /tasks/:id/status         → Task   (status geçişi + DONE max 10 kuralı)
GET    /tasks/search?q=<query>   → Task[] (başlık + not full-text, max 20)
GET    /tasks/:id/relations      → { blocks, blockedBy, relatesTo }
POST   /tasks/:id/relations      → TaskRelation  body: { toTaskId, type }
DELETE /tasks/:id/relations/:rid → 204
```

### Archive

```
GET /archive          → ArchivedTask[]  (weekNumber desc)
GET /archive?week=<n> → ArchivedTask[]
```

### Week

```
GET  /week              → WeekMeta
POST /week/close        → { weekNumber, archivedCount }  (?boardId=)
```

### Activity

```
GET /activity             → ActivityLog[]  (createdAt desc, limit 50)
GET /activity?taskId=<id> → ActivityLog[]
```

### Scratch Pad

```
GET   /scratch   → { content, updatedAt }
PATCH /scratch   → { content, updatedAt }  body: { content }
```

### Reports

```
GET /reports        → WeekReport[]  (weekNumber desc)
GET /reports/:week  → WeekReport
```

### Projects

```
GET    /projects      → Project[]
POST   /projects      → Project   body: { name, color }
PATCH  /projects/:id  → Project
DELETE /projects/:id  → 204  (bağlı görevlerin projectId → null)
```

### Boards

```
GET    /boards           → Board[]
POST   /boards           → Board   body: { name }
PATCH  /boards/:id       → Board
DELETE /boards/:id       → 204  (varsayılan silinemez; görevler varsayılana taşınır)
GET    /boards/:id/workload → { totalEstimatedHours, todoHours, inProgressHours, taskCount }
```

### Export

```
GET /export/tasks?boardId=<id>    → CSV
GET /export/archive?boardId=<id>  → CSV
```

### Webhook

```
POST /webhook/tasks   (JWT yok; X-Webhook-Secret header ile doğrulama)
  body: { title, notes?, priority?, tag?, boardId?, projectId? }
  → Task
```

---

## Backend Dosyaları

### `backend/src/server.ts`

```typescript
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'
import { authRoutes }     from './routes/auth'
import { taskRoutes }     from './routes/tasks'
import { archiveRoutes }  from './routes/archive'
import { weekRoutes }     from './routes/week'
import { activityRoutes } from './routes/activity'
import { scratchRoutes }  from './routes/scratch'
import { reportRoutes }   from './routes/reports'
import { projectRoutes }  from './routes/projects'
import { boardRoutes }    from './routes/boards'
import { relationRoutes } from './routes/relations'
import { exportRoutes }   from './routes/export'
import { webhookRoutes }  from './routes/webhook'

export const prisma = new PrismaClient()

const app = Fastify({ logger: true })

app.register(cors, { origin: true })
app.register(jwt, { secret: process.env.JWT_SECRET || 'dev_secret' })

app.register(authRoutes,    { prefix: '/auth' })
app.register(taskRoutes,    { prefix: '/tasks' })
app.register(archiveRoutes, { prefix: '/archive' })
app.register(weekRoutes,    { prefix: '/week' })
app.register(activityRoutes,{ prefix: '/activity' })
app.register(scratchRoutes, { prefix: '/scratch' })
app.register(reportRoutes,  { prefix: '/reports' })
app.register(projectRoutes, { prefix: '/projects' })
app.register(boardRoutes,   { prefix: '/boards' })
app.register(relationRoutes,{ prefix: '/tasks' })  // /tasks/:id/relations
app.register(exportRoutes,  { prefix: '/export' })
app.register(webhookRoutes, { prefix: '/webhook' })

const start = async () => {
  await prisma.$connect()
  // seed
  await prisma.weekMeta.upsert({ where: { id: 1 }, create: { id: 1, weekNumber: 1 }, update: {} })
  await prisma.scratchPad.upsert({ where: { id: 1 }, create: { id: 1, content: '' }, update: {} })
  await prisma.board.upsert({
    where: { id: 'default' },
    create: { id: 'default', name: 'Ana Board', isDefault: true },
    update: {},
  })
  await prisma.task.updateMany({ where: { boardId: null }, data: { boardId: 'default' } })
  await app.listen({ port: Number(process.env.PORT) || 3001, host: '0.0.0.0' })
}

start()
```

### `backend/src/auth.ts`

```typescript
import { FastifyRequest, FastifyReply } from 'fastify'

export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify()
  } catch {
    reply.status(401).send({ error: 'Unauthorized' })
  }
}
```

### `backend/src/lib/activity.ts`

```typescript
import { prisma } from '../server'
import { ActivityAction, Status } from '@prisma/client'

export async function logActivity(params: {
  taskId: string
  taskTitle: string
  action: ActivityAction
  fromStatus?: Status
  toStatus?: Status
  tx?: any
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

**Aktivite logu tetiklenme noktaları:**
- `POST /tasks` → `CREATED`
- `PATCH /tasks/:id/status` → `STATUS_CHANGED` (fromStatus, toStatus)
- `PATCH /tasks/:id` → `UPDATED`
- `DELETE /tasks/:id` → `DELETED`
- DONE max 10 transaction'ında otomatik arşiv → `ARCHIVED_AUTO`
- `POST /week/close` transaction'ında → `ARCHIVED_WEEK_CLOSE`

Tüm log yazmaları ilgili işlemle aynı transaction içinde olmalı.

---

## Frontend

### `frontend/src/types.ts`

```typescript
export type Status        = 'TODO' | 'IN_PROGRESS' | 'DONE'
export type Priority      = 'HIGH' | 'MEDIUM' | 'LOW'
export type Tag           = 'DEV' | 'TEST' | 'DESIGN' | 'DOC' | 'BUG' | 'OPS'
export type ArchiveReason = 'AUTO' | 'WEEK_CLOSE'
export type ActivityAction =
  | 'CREATED' | 'STATUS_CHANGED' | 'UPDATED' | 'DELETED'
  | 'ARCHIVED_AUTO' | 'ARCHIVED_WEEK_CLOSE'
export type RelationType  = 'BLOCKS' | 'RELATES_TO'

export interface Task {
  id: string
  title: string
  notes?: string
  status: Status
  priority: Priority
  tag: Tag
  position: number
  isTodayTask: boolean
  todayMarkedAt?: string
  estimatedHours?: number
  projectId?: string
  project?: Pick<Project, 'id' | 'name' | 'color'>
  boardId?: string
  isBlocked?: boolean   // backend tarafından hesaplanır
  createdAt: string
  updatedAt: string
}

export interface ArchivedTask {
  id: string
  title: string
  notes?: string
  priority: Priority
  tag: Tag
  weekNumber: number
  archivedAt: string
  archiveReason: ArchiveReason
}

export interface WeekMeta {
  weekNumber: number
  startedAt: string
}

export interface ActivityLog {
  id: string
  taskId: string
  taskTitle: string
  action: ActivityAction
  fromStatus?: Status
  toStatus?: Status
  createdAt: string
}

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
  totalEstimatedHours?: number
  totalActualHours?: number
  createdAt: string
}

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

export interface TaskRelation {
  id: string
  fromTaskId: string
  toTaskId: string
  type: RelationType
  createdAt: string
}
```

### `frontend/src/api.ts`

Tüm API çağrıları burada toplanır. Base URL: `/api`. Token localStorage'da.

```typescript
const BASE = '/api'

function getToken() { return localStorage.getItem('token') }
function headers() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  }
}

// Auth
export const login  = (u: string, p: string) => ...
export const logout = () => localStorage.removeItem('token')

// Tasks
export const getTasks      = (params?: { status?: string, boardId?: string, projectId?: string }) => ...
export const createTask    = (data: Partial<Task>) => ...
export const updateTask    = (id: string, data: Partial<Task>) => ...
export const deleteTask    = (id: string) => ...
export const moveTask      = (id: string, status: Status) => ...
export const searchTasks   = (q: string) => ...
export const cloneTask     = (id: string) => ...

// Relations
export const getRelations    = (taskId: string) => ...
export const addRelation     = (taskId: string, toTaskId: string, type: RelationType) => ...
export const deleteRelation  = (taskId: string, relationId: string) => ...

// Archive
export const getArchive = (week?: number) => ...

// Week
export const getWeek   = () => ...
export const closeWeek = (boardId?: string) => ...

// Activity
export const getActivity = (params?: { taskId?: string, limit?: number }) => ...

// Scratch pad
export const getScratch    = () => ...
export const updateScratch = (content: string) => ...

// Reports
export const getReports    = () => ...
export const getReport     = (week: number) => ...

// Projects
export const getProjects    = () => ...
export const createProject  = (data: { name: string, color: string }) => ...
export const updateProject  = (id: string, data: Partial<Project>) => ...
export const deleteProject  = (id: string) => ...

// Boards
export const getBoards      = () => ...
export const createBoard    = (data: { name: string }) => ...
export const updateBoard    = (id: string, data: Partial<Board>) => ...
export const deleteBoard    = (id: string) => ...
export const getBoardWorkload = (id: string) => ...

// Export
export async function downloadCSV(url: string, filename: string) {
  const res = await fetch(url, { headers: headers() })
  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}
```

### Uygulama Akışı

1. Token yoksa `LoginPage` göster.
2. Token varsa `Board` göster; `GET /tasks`, `GET /week`, `GET /boards` paralel çağrılır.
3. Board değişince ilgili boardId ile veriler yeniden yüklenir.

---

## UI Tasarım Sistemi

### Renkler

```css
:root {
  --bg-app:      #0f0f11;
  --bg-surface:  #161618;
  --bg-card:     #1e1e22;
  --border:      #252528;
  --border-hover:#3f3f50;
  --text-primary:#e2e0db;
  --text-muted:  #94a3b8;
  --text-faint:  #52525b;
  --accent:      #a78bfa;
  --accent-hover:#c4b5fd;

  --p-high:  #f87171;
  --p-med:   #fbbf24;
  --p-low:   #4b5563;

  --col-todo:#64748b;
  --col-prog:#60a5fa;
  --col-done:#34d399;

  --tag-dev-bg:    #1e3a5f; --tag-dev-fg:    #60a5fa;
  --tag-bug-bg:    #3b1e1e; --tag-bug-fg:    #f87171;
  --tag-test-bg:   #1e3b2e; --tag-test-fg:   #34d399;
  --tag-doc-bg:    #2e2214; --tag-doc-fg:    #fbbf24;
  --tag-design-bg: #2e1e3b; --tag-design-fg: #c084fc;
  --tag-ops-bg:    #1e2e3b; --tag-ops-fg:    #67e8f9;
}
```

### Fontlar

```html
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet">
```

- Body: `IBM Plex Sans`
- Logo, sayaçlar, tag'ler, tarihler, kod alanları: `IBM Plex Mono`

### Bileşenler

**TopBar:**
- Sol: `taskboard` logosu → board seçici dropdown → proje filtresi dropdown
- Orta: Günün görevi pill'leri (max 3) → `Hafta {n}`
- Sağ: Board yük özeti pill | `📝` scratch pad | `🔍` arama | `📊` raporlar | `⊞` projeler | `⬇` CSV export | Arşiv | Hafta Kapat | + Yeni Görev

**Board:** 3 sütunlu grid, 12px gap, 14px padding; `DndContext` ile sarılı

**Column:**
- Header: kolon adı + renkli nokta + kart sayacı
- DONE kolonunda `{n}/10` göstergesi — 8+ olunca sarı
- Footer: `+ görev ekle` dashed buton

**TaskCard:**
- Sol kenarda 3px öncelik çubuğu
- `📌` ikonu (günün görevi), `⊘` ikonu (bloke)
- Başlık: 13px, font-weight 500; DONE'da üstü çizili
- Alt satır: tag pill + proje renk noktası + proje adı + öncelik etiketi
- Sağ üst (hover): `⧉` kopyala butonu, `⤢` odak modu butonu
- Sağ alt (varsa): `⏱ {n}s` tahmini süre (IBM Plex Mono 10px)
- Görev yaşı (sadece TODO/IN_PROGRESS): sağ üst köşe `{n}g` etiketi
  - 3-6 gün: sarı nokta
  - 7+ gün: kırmızı nokta
- Hover: hafif yukarı kayma + border açılır

**TaskDetailPanel:** Karta tıklanınca board'un sağında açılır
- Başlık + düzenleme, notlar textarea, durum/öncelik/tag
- Aktivite zaman çizelgesi (`date-fns formatDistanceToNow`)
- İlişkiler bölümü (bloklıyor / bloke edilmiş / bağlantılı)

**FocusMode:** `F` kısayolu veya `⤢` butonu
- Board yerine tek kart tam genişlikte
- Başlık (IBM Plex Mono 24px), notlar, aktivite logu
- Sol/sağ ok ile aynı kolondaki kartlar arası geçiş
- `ESC` veya `⤡` ile kapanır; odak modundayken sadece odak kısayolları aktif

**NewTaskModal:** title (zorunlu), notes, status, priority, tag, estimatedHours
**CloseWeekModal:** DONE kart sayısı + TODO/IN_PROGRESS toplam; onay: "Haftayı Kapat ↩"
**WeekReportModal:** Hafta kapanınca açılır; tamamlanan, devam eden, tag breakdown chart, ort. süre
**ArchivePanel:** Topbar arşiv butonuyla board altında slide-down; haftaya göre gruplu liste
**ScratchPad:** Topbar `📝` butonu; board altında tam genişlik; 1s debounce kayıt; IBM Plex Mono
**SearchBar:** `/` kısayolu veya 🔍 butonu; 300ms debounce; max 8 sonuç dropdown; ESC kapatır

**Toast:** Ekran alt ortası, 3 saniye
- Otomatik arşiv: `↓ Otomatik arşivlendi: {title}`
- Hafta kapanışı: `✓ Hafta kapatıldı — {n} kart arşivlendi`
- Kart kopyalama: `"Kart kopyalandı"`
- Günlük limit aşımı: `"Günlük max 3 görev"`
- API hataları

**LoginPage:** Tam ekran; logo + kullanıcı adı + şifre + giriş butonu; "Kullanıcı adı veya şifre hatalı"

---

## Klavye Kısayolları

Global `useKeyboardShortcuts` hook — input/textarea odaklanmışken devre dışı.

| Kısayol | Eylem |
|---------|-------|
| `N` | Yeni görev modalı |
| `/` | Arama |
| `P` | Scratch pad aç/kapat |
| `R` | Raporlar paneli |
| `F` | Odak modu (ilk IN_PROGRESS kart) |
| `B` | Board seçici |
| `←` `→` | Odak modunda önceki/sonraki kart |
| `ESC` | Açık modal/panel kapat |
| `?` | Kısayol listesi |

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
      if (handler) { e.preventDefault(); handler() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handlers])
}
```

---

## İş Kuralları

1. **Görev durumları:** TODO → IN_PROGRESS → DONE (tek yön)
2. **DONE max 10:** Bir görev DONE'a taşınırken DONE sayısı 10'sa, `createdAt` en eski DONE kartı `ArchivedTask`'a taşı (`archiveReason = AUTO`), sonra görevi DONE yap. Tek transaction.
3. **Hafta kapatma:** Tüm DONE görevleri arşive (`archiveReason = WEEK_CLOSE`), `WeekReport` üret, `weekNumber +1`, `startedAt` güncelle. TODO/IN_PROGRESS dokunulmaz. Tek transaction.
4. **Haftalık rapor:** Hafta kapatılınca otomatik üretilir; sonradan değiştirilemez.
5. **Arşiv kalıcıdır:** Silinmez, sadece görüntülenir.
6. **Günün görevi:** Max 3 kart işaretlenebilir. `todayMarkedAt` bugünden önceyse `isTodayTask` otomatik `false` yapılır (`GET /tasks` başında `updateMany`).
7. **Bağlantılı görev döngüsü:** A → B → A ilişkisi engellenmeli (400 dön).
8. **Varsayılan board silinemez** (400 dön); içindeki görevler silinmeden önce varsayılana taşınır.
9. **Webhook:** Rate limit — aynı IP'den dakikada max 30 istek (in-memory).
10. **Tek kullanıcı:** Sabit username/password env'den, JWT session.

---

## Sürükle-Bırak

`@dnd-kit/core` + `@dnd-kit/sortable` kullanılır.

```tsx
// Board.tsx
<DndContext onDragEnd={handleDragEnd}>
  <Column status="TODO" tasks={todoTasks} />
  <Column status="IN_PROGRESS" tasks={inProgressTasks} />
  <Column status="DONE" tasks={doneTasks} />
</DndContext>
```

- Kart kolonlar arası taşınınca `PATCH /tasks/:id/status` çağrılır
- Aynı kolon içi sıralama `position` alanı güncellenerek yapılır
- Sürükleme sırasında kart yarı saydam; bırakılan kolon highlight alır
- İş kuralları korunur (DONE max 10)

---

## CSV Export

```typescript
// backend — harici paket kullanılmaz
function toCSV(headers: string[], rows: string[][]): string {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  return [headers.join(','), ...rows.map(r => r.map(escape).join(','))].join('\n')
}
```

Response headers:
```typescript
reply.header('Content-Type', 'text/csv; charset=utf-8')
reply.header('Content-Disposition', 'attachment; filename="tasks-hafta-{n}.csv"')
```

Büyük veri setlerinde `reply.raw` ile stream yazılır.

---

## Webhook Kullanımı

```bash
curl -X POST http://localhost/api/webhook/tasks \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your_secret" \
  -d '{"title": "Script çıktısını kontrol et", "tag": "OPS", "priority": "HIGH"}'
```

---

## Environment Variables

**Proje kökü `.env`:**
```
APP_PORT=8080
```

**`backend/.env`** (docker-compose env olarak da geçilir):
```
DATABASE_URL=postgresql://taskboard:taskboard_secret@postgres:5432/taskboard
JWT_SECRET=change_this_secret_in_production
PORT=3001
AUTH_USERNAME=admin
AUTH_PASSWORD=admin123
WEBHOOK_SECRET=change_this_webhook_secret
```

> VPS'e taşırken `JWT_SECRET`, `AUTH_PASSWORD` ve `WEBHOOK_SECRET` mutlaka değiştir.

---

## Build & Run

```bash
# İlk kurulum
docker compose up --build -d

# Logları izle
docker compose logs -f api

# Durdur
docker compose down

# Veritabanını sıfırla (dikkatli!)
docker compose down -v
```

Uygulama `http://localhost:8080` (veya `.env`'deki `APP_PORT`) adresinden erişilebilir.

---

## Notlar

- Prisma transaction kullan: DONE'a taşıma, hafta kapatma ve ilgili aktivite logları atomik olmalı
- Frontend'de tüm state React state ile yönet (Redux/Zustand gerekmez)
- API hata durumlarında toast ile kullanıcıya bildir
- Mobil uyumluluk gerekmez, sadece desktop
- Test yazma, direkt çalışan kod yaz
- `ActivityLog` tablosunda `taskId` ve `createdAt` üzerinde index var (performans)
- Scratch pad düz metin, şifrelenmez
- Sürükle-bırak ve klavye kısayolları çakışmaz; tüm panel açma/kapama ESC ile çalışır
- Odak modu açıkken yalnızca odak modu kısayolları (`←` `→` `ESC`) aktif
