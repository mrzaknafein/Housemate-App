# Housemate — Full-Stack Ortak Gider & Fatura Takip Platformu Planı

## 1. Overview (Proje Özeti & Vizyon)
**Housemate**, ev veya yurt arkadaşlarının aylık sabit faturalarını ve tekrarlayan ortak giderlerini, özelleştirilebilir ay döngüleri (custom billing cycle), kategori bazlı dinamik bölüşüm oranları ve her gider kalemi için ayrı aylık değişim/trend grafikleriyle takip edebildiği, şifresiz (oda kodu bazlı) çalışan **Light Premium** tasarımlı gerçek zamanlı bir web uygulamasıdır.

- **Proje Tipi:** **WEB (Full-Stack Next.js App Router + Prisma SQLite + Docker VDS)**
- **Tasarım Dili:** Light Premium (`#cd853f` Peru/Sıcak Bronz ana vurgu, `#eecbad` Yumuşak Krem ikincil yüzey/kenarlık, `#97ffff` Canlı Camgöbeği + `#0f172a` koyu antrasit metin kontrast kuralı, `#faf8f5` sıcak taş zemin).
- **Temel Mimari Kararlar (Onaylanan):**
  1. **Senkronizasyon:** SWR (3 saniyelik akıllı polling + Optimistic UI + sekme odaklandığında anında revalidation) ve istemci tarafı sürüm kontrolü (`AutoUpdateBanner` ile yeni güncelleme geldiğinde tüm aktif ekranların otomatik yenilenmesi).
  2. **Tarihsel Bölüşüm Bütünlüğü:** Geçmiş dönemlerin bölüşüm oranları (`PeriodCategorySplit`) dondurulur; odaya yeni biri katıldığında yalnızca aktif dönemin varsayılan eşit oranları güncellenir (özel/manuel ayarlanmış oranlar korunur).
  3. **Manuel Geçmiş Dönem Girişi:** Kullanıcılar yeni oda açtığında bile "+ Geçmiş Ay / Dönem Gir" özelliğiyle önceki aylara/dönemlere geçiş yapıp geçmiş fatura ve harcamalarını elle girebilir; grafikler ve artış/azalış yüzdeleri anında hesaplanır.
  4. **Demo & Seed Sistemi:** Hazır `HM-DEMO` (Ev) ve `HM-YURT` (Yurt) odaları + yeni odalarda tek tıkla "Örnek Veri Yükle" özelliği.
  5. **GitHub & Otomatik Güncelleme (Self-Update CD):** GitHub reposuna yeni commit/dağıtım gönderildiğinde VDS sunucusunun güncellemeyi otomatik çekip (`git pull` + `docker compose up -d --build`) kesintisiz güncellenmesi ve bağlı tüm kullanıcı tarayıcılarının yeni sürümü algılayıp kendi kendine güncellenmesi.

---

## 2. Success Criteria (Başarı Kriterleri)
- [x] Şifresiz Onboarding: İsim + Ev/Yurt seçimiyle `HM-XXXX` formatında 6 haneli benzersiz oda kodu üretimi ve mevcut odaya kodla katılım, `localStorage` + HTTP-Only Cookie ile kalıcı oturum.
- [x] Ev ve Yurt Modülleri: Ev için (`Kira`, `Elektrik`, `Su`, `Doğalgaz`, `İnternet`), Yurt için (`Oda Ortak Market/Atıştırmalık`, `Damacana Su`, `Çamaşırhane/Kurutma`, `Ortak Abonelikler`) varsayılan kategoriler ve `+ Yeni Gider / Hizmet Ekle` ile aynı kategori altındaki çoklu harcamaların otomatik gruplanması (Aggregation).
- [x] Dinamik Bölüşüm Oranı: Kişi sayısına göre otomatik eşit bölüşüm, kategori bazlı özel yüzde tanımlama (`%60 - %40` vb.), geçmiş dönem oranlarının korunması.
- [x] Özel Ay Döngüsü (1-28 arası sıfırlama günü) + **Geçmiş Dönemleri Elle Girebilme** (istediği geçmiş dönemi oluşturup/seçip veri girme).
- [x] Her Gider Kalemi İçin Ayrı Aylık Trend Grafiği (Recharts) ve `%X Artış / %Y Azalış` karşılaştırma rozetleri.
- [x] GitHub Push sonrası VDS otomatik güncelleme scripti/workflow'u ve bağlı istemcilerde otomatik sürüm yenileme.
- [x] Docker (`output: 'standalone'`, `./data:/app/data` SQLite kalıcı volume), `nginx.conf` ve `DEPLOY.md` dosyalarının eksiksiz teslimi.

---

## 3. Tech Stack (Teknoloji Yığını)

| Katman | Teknoloji | Gerekçe |
|--------|-----------|---------|
| **Framework** | Next.js (App Router, TypeScript, `output: 'standalone'`) | VDS ve Docker üzerinde düşük bellek tüketimi, API + UI tek çatı |
| **Stil & UI** | Tailwind CSS + Framer Motion + Lucide React | Light Premium renk paleti (`#cd853f`, `#eecbad`, `#97ffff`), akıcı geçişler |
| **Grafikler** | Recharts | Her gider kategorisi için duyarlı (responsive) aylık çizgi/sütun trend grafikleri |
| **Veritabanı & ORM** | SQLite + Prisma ORM | Sıfır harici sunucu maliyeti, Docker volume (`/app/data/housemate.db`) ile kalıcı dosya |
| **Canlı Senkronizasyon** | SWR (Polling + Mutate) + Version Hash Watcher | Multi-user anlık veri senkronizasyonu ve yeni dağıtım sonrası istemci oto-güncelleme |
| **Dağıtım & Otomasyon** | Docker Compose + Nginx + GitHub Actions / Auto-Updater | GitHub'a yüklenen yeni sürümün sunucuda ve kullanıcılarda kendi kendine güncellenmesi |

---

## 4. Task Breakdown (Görev Kırılımı & Agent Atamaları)

### P0: Temel Altyapı & Veritabanı Mimarisi
- [x] **Task 1 (`task_db_schema`)**: Next.js (TypeScript, Tailwind, App Router, `output: 'standalone'`) projesinin kurulumu ve Prisma SQLite şemasının (`Room`, `Member`, `Category`, `BillingPeriod`, `Expense`, `CategorySplit`, `PeriodCategorySplit`) oluşturulması.
- [x] **Task 2 (`task_billing_and_seed`)**: Özel ay döngüsü (1-28. gün) hesaplama kütüphanesi (`billing-cycle.ts`), dinamik bölüşüm motoru (`split-calculator.ts`) ve `HM-DEMO` (Ev) / `HM-YURT` (Yurt) 4 dönemlik geçmiş örnek verilerini içeren seed mekanizmasının yazılması.

### P1: Backend API & Gerçek Zamanlı Senkronizasyon Uç Noktaları
- [x] **Task 3 (`task_api_routes`)**: Şifresiz oturum (`/api/auth`), oda verisi & SWR senkronizasyonu (`/api/rooms/[code]`), gider ekleme & aynı kategoride gruplama (`/api/rooms/[code]/expenses`), manuel geçmiş dönem oluşturma (`/api/rooms/[code]/periods`), oran özelleştirme (`/api/rooms/[code]/categories`) ve sürüm kontrolü (`/api/version`) API uç noktalarının geliştirilmesi.

### P2: Light Premium Arayüz, Ev/Yurt Panelleri & Recharts Analitik
- [x] **Task 4 (`task_ui_onboarding_and_theme`)**: Light Premium renk paleti (`#cd853f`, `#eecbad`, `#97ffff` üzerine `#0f172a` koyu antrasit yazı kuralı, `#faf8f5` arka plan) ile Karşılama/Onboarding ekranının kodlanması.
- [x] **Task 5 (`task_ui_dashboard_and_history`)**: Ev ve Yurt ana paneli (`RoomHeader`, `ExpenseCategoryCard`, `AddExpenseModal`, `SplitRatioModal`, `BillingPeriodSelector`) bileşenlerinin inşası ve kullanıcının geçmiş ayları/dönemleri elle oluşturup veri girebilmesi.
- [x] **Task 6 (`task_ui_analytics_charts`)**: Her gider kalemi için ayrı Recharts aylık değişim grafiği ve `% Artış / % Azalış` trend rozetlerini sunan `CategoryAnalyticsGrid` bileşeninin geliştirilmesi.

### P3: VDS Docker Dağıtımı & GitHub Otomatik Güncelleme (Self-Update) Mimarisi
- [x] **Task 7 (`task_docker_nginx_autoupdate`)**: Multi-stage `Dockerfile`, SQLite kalıcı volume (`./data:/app/data`) içeren `docker-compose.yml`, `nginx.conf`, `deploy/auto-update.sh`, `.github/workflows/deploy.yml`, `AutoUpdateBanner.tsx` ve `DEPLOY.md` rehberinin hazırlanması.

---

## 5. Phase X: Final Verification (Doğrulama Kontrol Listesi)
- [x] `npm run lint && npx tsc --noEmit` (Sıfır tip ve lint hatası)
- [x] `npm run build` (Next.js standalone üretim derlemesi başarılı)
- [x] Kontrast ve Tasarım Denetimi: `#cd853f`, `#eecbad`, `#97ffff` (üzerinde `#0f172a` metin) kuralları uygulandı, mor/violet renk kullanılmadı.
- [x] Fonksiyonel Denetim: Ev & Yurt modları, geçmiş ayları elle girebilme, kategori bazlı bölüşüm oranı, her kalem için ayrı aylık Recharts grafiği ve GitHub oto-güncelleme altyapısı doğrulandı.

## ✅ PHASE X COMPLETE
- Lint: ✅ Pass (`✔ No ESLint warnings or errors`)
- Security: ✅ No critical issues
- Build: ✅ Success (`next build` standalone mode)
- Date: 2026-11-06
