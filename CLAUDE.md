# CLAUDE.md — Taskboard

Kişisel Jira benzeri görev takip uygulaması. Bu dosyayı okuduktan sonra hiçbir şey sormadan
aşağıdaki adımları sırayla uygula. Her adımı tamamladıktan sonra bir sonrakine geç.

---

## Proje Özeti

Tek kullanıcılı, Docker Compose ile çalışan Kanban board uygulaması.
Görevleri TODO → IN_PROGRESS → DONE akışıyla takip eder.
DONE kolonunda max 10 kart sınırı vardır; haftalık olarak manuel kapatılır.

---

## Tech Stack

| Katman      | Teknoloji                        |
|-------------|----------------------------------|
| Frontend    | React + Vite + TypeScript        |
| Backend     | Fastify + TypeScript             |
| ORM         | Prisma                           |
| Veritabanı  | PostgreSQL 16 (ayrı container)   |
| Proxy       | Nginx (SPA + API tek port)       |
| Konteyner   | Docker Compose                   |

---

## Proje Dizin Yapısı

```
taskboard/
├── docker-compose.yml
├── nginx/
│   └── default.conf
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── api.ts               # tüm fetch çağrıları
│       ├── types.ts             # shared tipler
│       ├── components/
│       │   ├── Board.tsx
│       │   ├── Column.tsx
│       │   ├── TaskCard.tsx
│       │   ├── NewTaskModal.tsx
│       │   ├── CloseWeekModal.tsx
│       │   ├── ArchivePanel.tsx
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
        └── routes/
            ├── tasks.ts
            ├── archive.ts
            └── week.ts
```

---

## Docker Compose

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
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf
      - frontend_build:/usr/share/nginx/html
    depends_on:
      - api
    restart: unless-stopped

volumes:
  pgdata:
  frontend_build:
```

**Not:** Frontend build artifact'ı nginx volume'a kopyalanır.
Bunun için `frontend` servisine `build` ve volume mount ekle, ya da
multi-stage Dockerfile kullan (tercih edilen yöntem aşağıda).

Nginx + frontend için multi-stage Dockerfile kullan:
`frontend/Dockerfile` içinde önce `npm run build`, ardından nginx image'ına kopyala.
`docker-compose.yml`'de ayrı nginx servisi yerine frontend servisi 80 portunu expose eder.

Revize edilmiş servisler:

```yaml
services:
  postgres:
    # yukarıdaki ile aynı

  api:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://taskboard:taskboard_secret@postgres:5432/taskboard
      JWT_SECRET: change_this_secret_in_production
      PORT: 3001
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "${APP_PORT}:80"
    depends_on:
      - api
    restart: unless-stopped
```

**Not:** `APP_PORT` proje kökündeki `.env` dosyasından okunur. Default: `8080`.
Port 80 kullanmak için `.env`'de `APP_PORT=80` yap.

---

## Nginx Konfigürasyonu

`nginx/default.conf` (frontend Dockerfile içindeki nginx için de geçerli):

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
  id        String   @id @default(uuid())
  title     String
  notes     String?
  status    Status   @default(TODO)
  priority  Priority @default(MEDIUM)
  tag       Tag      @default(DEV)
  position  Int      @default(0)   // sıralama için
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model ArchivedTask {
  id           String   @id @default(uuid())
  title        String
  notes        String?
  priority     Priority
  tag          Tag
  weekNumber   Int
  archivedAt   DateTime @default(now())
  archiveReason ArchiveReason @default(AUTO)
}

model WeekMeta {
  id         Int      @id @default(1)  // tek kayıt
  weekNumber Int      @default(1)
  startedAt  DateTime @default(now())
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
  AUTO       // DONE max 10 kuralı
  WEEK_CLOSE // hafta kapatma
}
```

---

## Backend API Endpoints

### Auth

Uygulama tek kullanıcılı. Basit sabit kullanıcı adı/şifre `.env`'den okunur.
JWT ile session yönetimi yapılır.

```
POST /auth/login
  body: { username: string, password: string }
  response: { token: string }
```

Diğer tüm endpoint'ler `Authorization: Bearer <token>` header'ı gerektirir.
Geçersiz/eksik token → 401 döner.

### Tasks

```
GET    /tasks              → Task[]  (status'a göre filtrele: ?status=TODO)
POST   /tasks              → Task    (yeni görev oluştur)
PATCH  /tasks/:id          → Task    (title, notes, status, priority, tag güncelle)
DELETE /tasks/:id          → 204     (görevi sil)
PATCH  /tasks/:id/status   → Task    (sadece status güncelle — durum geçişi)
```

**DONE'a taşıma iş kuralı (PATCH /tasks/:id/status):**

Bir görev DONE'a taşındığında:
1. Mevcut DONE kart sayısını say.
2. Eğer 10'a ulaşıldıysa (`count >= 10`), `createdAt` en eski DONE kartı
   `ArchivedTask`'a taşı, `Task`'tan sil. `archiveReason = AUTO`.
3. Görevi DONE'a taşı.

Bu işlem tek bir Prisma transaction içinde yapılmalı.

### Archive

```
GET /archive               → ArchivedTask[]  (weekNumber'a göre desc sırala)
GET /archive?week=<n>      → ArchivedTask[]  (belirli hafta)
```

### Week

```
GET  /week                 → WeekMeta
POST /week/close           → { weekNumber: number, archivedCount: number }
```

**Hafta kapatma iş kuralı (POST /week/close):**

1. Tüm DONE durumundaki `Task` kayıtlarını `ArchivedTask`'a taşı.
   `archiveReason = WEEK_CLOSE`.
2. `Task` tablosundan bu kayıtları sil.
3. `WeekMeta.weekNumber`'ı 1 artır.
4. `WeekMeta.startedAt`'ı güncelle.
5. TODO ve IN_PROGRESS kartlar dokunulmadan kalır.

Tüm işlem tek Prisma transaction.

---

## Backend Dosyaları

### `backend/src/server.ts`

```typescript
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { authRoutes } from './routes/auth'
import { taskRoutes } from './routes/tasks'
import { archiveRoutes } from './routes/archive'
import { weekRoutes } from './routes/week'
import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient()

const app = Fastify({ logger: true })

app.register(cors, { origin: true })
app.register(jwt, { secret: process.env.JWT_SECRET || 'dev_secret' })

app.register(authRoutes, { prefix: '/auth' })
app.register(taskRoutes, { prefix: '/tasks' })
app.register(archiveRoutes, { prefix: '/archive' })
app.register(weekRoutes, { prefix: '/week' })

const start = async () => {
  await prisma.$connect()
  // WeekMeta seed — yoksa oluştur
  await prisma.weekMeta.upsert({
    where: { id: 1 },
    create: { id: 1, weekNumber: 1 },
    update: {},
  })
  await app.listen({ port: Number(process.env.PORT) || 3001, host: '0.0.0.0' })
}

start()
```

### `backend/src/auth.ts`

Middleware: her route'dan önce JWT doğrular.

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

### `backend/src/routes/auth.ts`

```typescript
// POST /auth/login
// username ve password env'den oku: AUTH_USERNAME, AUTH_PASSWORD
// Eşleşirse JWT imzala ve dön
```

### `backend/package.json` dependencies

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

### `backend/Dockerfile`

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

# Migration + start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
```

---

## Frontend

### `frontend/src/types.ts`

```typescript
export type Status = 'TODO' | 'IN_PROGRESS' | 'DONE'
export type Priority = 'HIGH' | 'MEDIUM' | 'LOW'
export type Tag = 'DEV' | 'TEST' | 'DESIGN' | 'DOC' | 'BUG' | 'OPS'
export type ArchiveReason = 'AUTO' | 'WEEK_CLOSE'

export interface Task {
  id: string
  title: string
  notes?: string
  status: Status
  priority: Priority
  tag: Tag
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
```

### `frontend/src/api.ts`

Tüm API çağrıları burada toplanır. Base URL: `/api`.
Token localStorage'da saklanır.

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
export const login = (u: string, p: string) => ...
export const logout = () => localStorage.removeItem('token')

// Tasks
export const getTasks = (status?: string) => ...
export const createTask = (data: Partial<Task>) => ...
export const updateTask = (id: string, data: Partial<Task>) => ...
export const deleteTask = (id: string) => ...
export const moveTask = (id: string, status: Status) => ...

// Archive
export const getArchive = (week?: number) => ...

// Week
export const getWeek = () => ...
export const closeWeek = () => ...
```

### Uygulama Akışı

1. Uygulama açılırken token yoksa login ekranı göster.
2. Token varsa board'u göster.
3. Board açılırken `GET /tasks`, `GET /week` çağrılarını paralel yap.

---

## UI Tasarım Sistemi

### Renkler (CSS değişkenleri olarak tanımla)

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

  /* Öncelik renkleri */
  --p-high:  #f87171;
  --p-med:   #fbbf24;
  --p-low:   #4b5563;

  /* Kolon renkleri */
  --col-todo:#64748b;
  --col-prog:#60a5fa;
  --col-done:#34d399;

  /* Tag renkleri */
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
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet">
```

- Body: `IBM Plex Sans`
- Logo, sayaçlar, tag'ler, tarihler: `IBM Plex Mono`

### Bileşenler

**TopBar:**
- Sol: `taskboard` logosu (mor nokta + IBM Plex Mono)
- Orta: `Hafta {n}` yazısı (IBM Plex Mono, soluk renk)
- Sağ: Arşiv butonu (kart sayısıyla) | Hafta Kapat butonu | + Yeni Görev butonu

**Board:** 3 sütunlu grid, 12px gap, 14px padding

**Column:**
- Header: kolon adı + renkli nokta + kart sayacı
- DONE kolonunda ayrıca `{n}/10` göstergesi — 8+ olunca sarı renk alır
- Body: kartlar dikey liste
- Footer: `+ görev ekle` dashed buton

**TaskCard:**
- Sol kenarda 3px öncelik çubuğu (kırmızı/sarı/gri)
- Başlık: 13px, font-weight 500
- DONE kartlarında üstü çizili + soluk renk
- Alt satır: tag pill (sol) + öncelik etiketi (sağ)
- Hover: hafif yukarı kayma + border açılır

**NewTaskModal:**
- Alanlar: title (required), notes (textarea, opsiyonel), status (select), priority (select), tag (select)
- Overlay tıklanınca kapanır
- ESC tuşuyla kapanır

**CloseWeekModal:**
- "Hafta Kapat" butonuna basınca açılır
- DONE kart sayısını ve TODO+IN_PROGRESS toplam sayısını gösterir
- Onay butonu: "Haftayı Kapat ↩"

**ArchivePanel:**
- Topbar'daki "Arşiv" butonuyla açılır/kapanır
- Board'un altında slide-down ile açılır
- Her kayıt: başlık (üstü çizili) + hafta numarası + tag
- Haftaya göre grupla (en yenisi üstte)

**Toast:**
- Ekranın alt ortasında çıkar
- 3 saniye sonra kaybolur
- Otomatik arşivlemede: `↓ Otomatik arşivlendi: {title}`
- Hafta kapatmada: `✓ Hafta kapatıldı — {n} kart arşivlendi`

**LoginPage:**
- Tam ekran, koyu arka plan
- Logo + kullanıcı adı + şifre inputu + giriş butonu
- Hata durumunda "Kullanıcı adı veya şifre hatalı" mesajı

---

## İş Kuralları (Özet)

1. **Görev durumları:** TODO → IN_PROGRESS → DONE (tek yön)
2. **DONE max 10:** 11. kart eklenince en eski `createdAt`'e göre otomatik arşive düşer
3. **Hafta kapatma:** Manuel butona basılır → onay modalı → DONE'lar arşive, diğerleri kalır → hafta numarası +1
4. **Arşiv kalıcıdır:** Silinmez, sadece görüntülenir
5. **Tek kullanıcı:** Sabit username/password, JWT session

---

## Environment Variables

**Proje kökü `.env`** (Docker Compose port ayarı):

```
APP_PORT=8080
```

**`backend/.env`** (Docker Compose env olarak da geçilir):

```
DATABASE_URL=postgresql://taskboard:taskboard_secret@postgres:5432/taskboard
JWT_SECRET=change_this_secret_in_production
PORT=3001
AUTH_USERNAME=admin
AUTH_PASSWORD=admin123
```

**Not:** VPS'e taşırken `JWT_SECRET` ve `AUTH_PASSWORD` mutlaka değiştir.
Port 80 kullanmak için proje kökündeki `.env`'de `APP_PORT=80` yap.

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

Uygulama `http://localhost` adresinden erişilebilir.

---

## Geliştirme Sırası

Bu sırayı takip et, her adımı bitirmeden diğerine geçme:

1. `docker-compose.yml` ve Dockerfile'ları oluştur
2. Prisma schema + migration
3. Backend: auth route + JWT middleware
4. Backend: tasks CRUD (iş kuralları dahil)
5. Backend: archive + week routes
6. Frontend: types + api.ts
7. Frontend: LoginPage
8. Frontend: Board + Column + TaskCard (statik veri ile)
9. Frontend: NewTaskModal + CloseWeekModal + ArchivePanel
10. Frontend: API entegrasyonu (statik veriyi kaldır)
11. Frontend: Toast sistemi
12. Son test: `docker compose up --build` ile end-to-end çalıştır

---

## Notlar

- Prisma transaction kullan: DONE'a taşıma ve hafta kapatma atomik olmalı
- Frontend'de tüm state React state ile yönet (Redux/Zustand gerekmez)
- API hata durumlarında toast ile kullanıcıya bildir
- Mobil uyumluluk gerekmez, sadece desktop
- Test yazma, direkt çalışan kod yaz