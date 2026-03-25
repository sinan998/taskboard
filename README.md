# taskboard

Tek kullanıcılı, kişisel Kanban board uygulaması. Docker Compose ile tek komutla ayağa kalkar.

---

## Özellikler

- **Kanban board** — TODO / IN_PROGRESS / DONE kolonları
- **DONE limiti** — 10 kart dolunca en eski kart otomatik arşive düşer
- **Haftalık kapanış** — DONE kartları arşive taşır, haftalık rapor üretir
- **Çoklu board** — İş / kişisel gibi bağımsız board'lar
- **Proje etiketleri** — Görevleri projelere göre grupla ve filtrele
- **Bağlantılı görevler** — Bloklama (BLOCKS) ve genel (RELATES_TO) ilişkileri
- **Aktivite logu** — Her görev hareketi kayıt altında
- **Scratch pad** — Board dışı hızlı not alanı (otomatik kayıt)
- **Tam metin arama** — Başlık ve not içinde anlık arama
- **Sürükle-bırak** — Kolonlar arası ve kolon içi sıralama
- **Odak modu** — Tek kart tam genişlikte, sol/sağ ok ile geçiş
- **Görev yaşı göstergesi** — 3+ gün hareketsiz kartlarda görsel uyarı
- **Günün görevi** — Günlük max 3 görev işaretleme
- **Tahmini süre** — Kart bazında saat takibi, board yük özeti
- **CSV export** — Görevleri ve arşivi dışa aktar
- **Webhook API** — Dışarıdan görev oluşturma
- **Klavye kısayolları** — Mouse'suz çalışma

---

## Tech Stack

| Katman     | Teknoloji                              |
|------------|----------------------------------------|
| Frontend   | React 18 + Vite + TypeScript           |
| Backend    | Fastify 4 + TypeScript                 |
| ORM        | Prisma 5                               |
| Veritabanı | PostgreSQL 16                          |
| Proxy      | Nginx                                  |
| Container  | Docker Compose                         |

---

## Kurulum

### Gereksinimler

- [Docker](https://docs.docker.com/get-docker/) ve Docker Compose

### Adımlar

```bash
# 1. Repoyu klonla
git clone https://github.com/sinan998/taskboard.git
cd taskboard

# 2. (İsteğe bağlı) Port ayarla
echo "APP_PORT=8080" > .env

# 3. Ayağa kaldır
docker compose up --build -d
```

Uygulama `http://localhost:8080` adresinde çalışır (varsayılan port).

---

## Konfigürasyon

### Proje kökü `.env`

| Değişken   | Varsayılan | Açıklama                       |
|------------|------------|--------------------------------|
| `APP_PORT` | `8080`     | Uygulamanın dinlediği dış port |

Port 80 kullanmak için: `APP_PORT=80`

### Backend ortam değişkenleri

`docker-compose.yml` içinde tanımlıdır. Üretim ortamında aşağıdakileri mutlaka değiştir:

| Değişken           | Varsayılan                       | Açıklama                         |
|--------------------|----------------------------------|----------------------------------|
| `JWT_SECRET`       | `change_this_secret_in_production` | JWT imzalama anahtarı          |
| `AUTH_USERNAME`    | `admin`                          | Giriş kullanıcı adı              |
| `AUTH_PASSWORD`    | `admin123`                       | Giriş şifresi                    |
| `WEBHOOK_SECRET`   | `change_this_webhook_secret`     | Webhook kimlik doğrulama anahtarı |
| `DATABASE_URL`     | (postgres container)             | Prisma bağlantı URL'i            |

---

## Kullanım

### İlk giriş

Varsayılan kullanıcı adı `admin`, şifre `admin123`.

### Temel akış

1. **Yeni görev** — `N` kısayolu veya `+ Yeni Görev` butonu
2. **Durum değiştir** — Kartı sürükle veya detay panelinden değiştir
3. **Hafta kapat** — Sağ üstteki `Hafta Kapat` butonu → onay → DONE kartlar arşive taşınır

### Klavye kısayolları

| Kısayol | Eylem                               |
|---------|-------------------------------------|
| `N`     | Yeni görev modalı                   |
| `/`     | Arama                               |
| `P`     | Scratch pad aç/kapat                |
| `R`     | Raporlar paneli                     |
| `F`     | Odak modu                           |
| `B`     | Board seçici                        |
| `←` `→` | Odak modunda önceki/sonraki kart   |
| `ESC`   | Açık modal veya paneli kapat        |
| `?`     | Kısayol listesi                     |

---

## Webhook API

Harici araçlardan (script, CI, cron job vb.) görev oluşturmak için:

```bash
curl -X POST http://localhost:8080/api/webhook/tasks \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: change_this_webhook_secret" \
  -d '{
    "title": "Sunucu loglarını kontrol et",
    "tag": "OPS",
    "priority": "HIGH"
  }'
```

**Body alanları:**

| Alan        | Zorunlu | Varsayılan     | Değerler                              |
|-------------|---------|----------------|---------------------------------------|
| `title`     | ✓       | —              | string                                |
| `notes`     | —       | —              | string                                |
| `priority`  | —       | `MEDIUM`       | `HIGH` \| `MEDIUM` \| `LOW`          |
| `tag`       | —       | `DEV`          | `DEV` \| `TEST` \| `DESIGN` \| `DOC` \| `BUG` \| `OPS` |
| `boardId`   | —       | varsayılan board | string (board ID)                  |
| `projectId` | —       | —              | string (proje ID)                     |

---

## Proje Yapısı

```
taskboard/
├── docker-compose.yml
├── .env                    # APP_PORT
├── frontend/
│   ├── Dockerfile          # multi-stage: build + nginx
│   ├── nginx/default.conf
│   └── src/
│       ├── api.ts          # tüm API çağrıları
│       ├── types.ts        # TypeScript tipleri
│       └── components/     # React bileşenleri
└── backend/
    ├── Dockerfile
    ├── prisma/
    │   └── schema.prisma
    └── src/
        ├── server.ts       # Fastify + route kayıtları
        ├── auth.ts         # JWT middleware
        ├── lib/
        │   └── activity.ts # aktivite logu yardımcısı
        └── routes/         # 12 route dosyası
```

---

## Diğer Komutlar

```bash
# Logları izle
docker compose logs -f api

# Durdur
docker compose down

# Veritabanını sıfırla (tüm veriler silinir)
docker compose down -v
```
