# Proje Planı: Housemate Native Masaüstü Uygulaması (Native Desktop App)

> **Plan Dosyası:** `native-desktop-app.md`  
> **Oluşturulma Tarihi:** 2026-11-06  
> **Mod:** PLANNING ONLY (Uygulama öncesi onay)  
> **Hedef:** Housemate uygulamasının tarayıcı sekmesinde değil, doğrudan bağımsız, adres çubuğu olmayan yerel bir masaüstü penceresi (Native App Window) olarak açılmasını sağlamak.

---

## 1. Genel Bakış (Overview)
Kullanıcı, `Housemate.exe` çalıştırıldığında Chrome veya Edge tarayıcı sekmelerinde açılması yerine; WhatsApp Desktop, Spotify veya Slack gibi **kendi bağımsız penceresi, özel başlık çubuğu ve uygulama simgesi olan yerel bir Windows penceresinde (Native Desktop App Window)** açılmasını talep etmektedir.

Bu plan, arka planda çalışan Next.js 14 + SQLite standalone çekirdeğini bozmadan, ön yüzde kullanıcıya %100 yerel bir masaüstü deneyimi sunacak mimariyi tanımlar.

---

## 2. Proje Tipi & Mimari Karar (Architecture Trade-offs)
**Proje Tipi:** `DESKTOP_WRAPPER` (Native Windows GUI + Next.js Standalone Core)

### Karşılaştırılan Mimariler:

| Mimari Yaklaşım | Boyut & Performans | Kurulum & Bağımlılık | Karar |
| :--- | :--- | :--- | :---: |
| **A) Windows WebView2 / Edge App Mode Shell** | **~100 KB** / 200ms açılış | Windows 10/11'de kurulu gelir, sıfır ek indirme | 🏆 **SEÇİLEN (ÖNERİLEN)** |
| **B) Electron** | **~180 MB** / 2.5s açılış | Dev paketler, node_modules şişmesi, yüksek RAM | ❌ Aşırı ağır |
| **C) Tauri (Rust)** | **~15 MB** / 300ms açılış | Sistemde Rust & Cargo derleyicisi gerektirir | ⚠️ Gereksiz karmaşık |

### 🏆 Seçilen Çözüm: Çift Katmanlı Native Shell (WebView2 / App Mode)
1. `Housemate.exe`, Windows üzerinde yerel bir pencere başlatır (`--app=http://localhost:3000 --window-size=1280,820`).
2. Pencere adres çubuğu, sekme çubuğu veya tarayıcı butonları içermez; doğrudan yerel bir masaüstü programı olarak çerçevelenir.
3. Görev çubuğunda ve pencere sol üstünde Housemate'in özel ikonu yer alır.
4. Pencere kapatıldığında arka plandaki sunucuyu otomatik durdurur veya sistem tepsisine (Tray) küçültür.

---

## 3. Başarı Kriterleri (Success Criteria)
- [ ] Masaüstündeki `Housemate.exe` tıklandığında hiçbir tarayıcı sekmesi açılmayacak; doğrudan bağımsız bir yerel pencere gelecek.
- [ ] Pencerede URL/adres çubuğu, favoriler çubuğu veya tarayıcı eklentileri görünmeyecek.
- [ ] Pencere boyutu, konumu ve simgesi yerel bir masaüstü uygulaması gibi davranacak (Minimum: 1024x700, Varsayılan: 1280x820).
- [ ] Pencere kapatıldığında (X) veya sistem tepsisinden "Çıkış Yap" dendiğinde tüm arka plan süreçleri temizlenecek.
- [ ] Çevrimdışı / Yerel SQLite verileri eksiksiz yüklenmeye devam edecek.

---

## 4. Dosya Yapısı Değişiklikleri (File Structure)

```
c:\Users\Çağatay\Desktop\Housemate\
├── Housemate.exe              # [Güncellenecek] Bağımsız pencere başlatan yerel Windows yürütücüsü
├── HousemateApp.cs           # [Güncellenecek] Native Window & Process Controller C# kaynak kodu
├── Housemate.ico             # [Mevcut] 48KB çoklu çözünürlüklü uygulama simgesi
├── Baslat.bat                # [Güncellenecek] Native app modunda çalıştırma seçeneği
├── package.json              # [Mevcut] Next.js 14 konfigürasyonu
└── src/                      # [Mevcut] UI & API katmanı (değişiklik gerekmez)
```

---

## 5. Görev Dağılımı ve İş Paketleri (Task Breakdown)

### Görev 1: Native Shell Pencere Yöneticisinin Tasarlanması
- **Ajan:** `devops-engineer`
- **Yetenekler:** `@powershell-windows` + `@clean-code`
- **Öncelik:** P0 (Bloklayıcı)
- **Bağımlılık:** Yok
- **INPUT → OUTPUT → VERIFY:**
  - *INPUT:* `HousemateApp.cs`, `Housemate.ico`, yerel `http://localhost:3000` portu.
  - *OUTPUT:* Tarayıcı sekmesi yerine bağımsız yerel pencere (App Mode Window) oluşturan ve pencere kapandığında süreçleri yöneten C# kodu.
  - *VERIFY:* `csc.exe` ile hatasız derlenmesi.

### Görev 2: Süreç Senkronizasyonu & Sistem Tepsisi Entegrasyonu
- **Ajan:** `devops-engineer`
- **Yetenekler:** `@powershell-windows` + `@architecture`
- **Öncelik:** P1
- **Bağımlılık:** Görev 1
- **INPUT → OUTPUT → VERIFY:**
  - *INPUT:* Pencere kapatma olayları (`FormClosing` / `ProcessExited`).
  - *OUTPUT:* Kullanıcı pencereyi kapattığında sunucuyu arkada yetim bırakmayan temiz yaşam döngüsü yöneticisi.
  - *VERIFY:* Görev Yöneticisi'nde (Task Manager) sahipsiz `node.exe` kalmaması.

### Görev 3: Masaüstü Kısayolunun & Exe Dosyasının Güncellenmesi
- **Ajan:** `devops-engineer`
- **Yetenekler:** `@deployment-procedures`
- **Öncelik:** P1
- **Bağımlılık:** Görev 2
- **INPUT → OUTPUT → VERIFY:**
  - *INPUT:* Derlenen yeni `Housemate.exe`.
  - *OUTPUT:* `c:\Users\Çağatay\Desktop\Housemate.exe` ve `c:\Users\Çağatay\Desktop\Housemate\Housemate.exe` ikilisinin güncellenmesi.
  - *VERIFY:* Masaüstündeki `.exe`ye çift tıklandığında doğrudan yerel pencerenin gelmesi.

### Görev 4: GitHub Senkronizasyonu
- **Ajan:** `devops-engineer`
- **Yetenekler:** `@clean-code`
- **Öncelik:** P2
- **Bağımlılık:** Görev 3
- **INPUT → OUTPUT → VERIFY:**
  - *INPUT:* Güncellenen `HousemateApp.cs`, `Housemate.exe`, `native-desktop-app.md`.
  - *OUTPUT:* `https://github.com/mrzaknafein/Housemate-App` deposuna push.
  - *VERIFY:* GitHub API durumunun 200 OK dönmesi.

---

## 6. Faz X: Doğrulama Kontrol Listesi (Phase X Verification)
- [ ] `npm run lint` kontrolü hatasız tamamlanmalı.
- [ ] `Housemate.exe` çift tıklandığında Chrome/Edge genel sekmesi değil, **yalnızca Housemate başlıklı bağımsız pencere** açılmalı.
- [ ] Pencere içinde adres çubuğu (URL bar) bulunmamalı.
- [ ] Sistem tepsisinde (saatin yanında) simge yer almalı.
- [ ] Pencere kapatıldığında arka plandaki süreçler temiz sonlanmalı.

---
*Bu plan incelemeniz için hazırlanmıştır. Onay verdiğinizde doğrudan uygulamaya geçilecektir.*
