# Housemate — VDS Sunucu Kurulum & Otomatik Güncelleme (Docker + Nginx + SSL) Rehberi

Bu rehber, **Housemate** uygulamasını bir Ubuntu/Debian VDS sunucusu üzerinde Docker, kalıcı SQLite veritabanı (`./data:/app/data`), Nginx Reverse Proxy, Let's Encrypt ücretsiz SSL ve **GitHub üzerinden kendi kendine otomatik güncelleme (Self-Update)** ile dakikalar içinde canlıya almanız için hazırlanmıştır.

---

## 1. VDS'e SSH ile Bağlanma ve Ön Hazırlık

Terminalinizi açıp VDS sunucunuza bağlanın:

```bash
ssh root@SUNUCU_IP_ADRESINIZ
```

Docker, Docker Compose, Git ve Nginx kurulu değilse tek komutla kurun:

```bash
apt update && apt upgrade -y
apt install -y git curl nginx certbot python3-certbot-nginx
curl -fsSL https://get.docker.com | sh
```

---

## 2. Projeyi Klonlama ve Tek Komutla Ayağa Kaldırma

Projenizi `/opt/housemate` dizinine klonlayın ve kalıcı SQLite veri klasörünü (`./data`) oluşturup Docker ile başlatın:

```bash
git clone https://github.com/mrzaknafein/Housemate-App.git /opt/housemate
cd /opt/housemate

# Kalıcı SQLite veritabanı klasörünü oluşturun ve yazma izni verin
mkdir -p ./data
chmod -R 777 ./data

# Container'ı derleyip arka planda başlatın
docker compose up -d --build
```

> **Not:** Container başlarken otomatik olarak `prisma db push` çalıştırarak `/app/data/housemate.db` (yerel `./data/housemate.db`) dosyasını oluşturur. Container silinse veya güncellense bile verileriniz `./data` klasöründe güvende kalır.

Uygulamanın yerel olarak çalıştığını doğrulayın:

```bash
curl http://127.0.0.1:3000/api/version
```

---

## 3. Nginx Reverse Proxy Yapılandırması

Kök dizindeki `nginx.conf` (veya `deploy/nginx.conf`) dosyasını Nginx'e kopyalayın:

```bash
cp /opt/housemate/nginx.conf /etc/nginx/sites-available/housemate
```

Dosya içindeki `ornekalanadi.com` kısmını kendi alan adınızla (veya sunucu IP adresinizle) değiştirin:

```bash
nano /etc/nginx/sites-available/housemate
```

Siteyi aktif edin ve Nginx'i yeniden yükleyin:

```bash
ln -s /etc/nginx/sites-available/housemate /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

---

## 4. Certbot (Let's Encrypt) ile Ücretsiz SSL Sertifikası Alma

Alan adınızın DNS A kaydını VDS IP adresinize yönlendirdikten sonra tek komutla ücretsiz HTTPS sertifikasını kurun:

```bash
certbot --nginx -d ornekalanadi.com -d www.ornekalanadi.com
```

Certbot otomatik olarak `nginx.conf` dosyanızı HTTPS (443) yönlendirmesiyle güncelleyecek ve sertifikanızı her 90 günde bir otomatik yenileyecektir.

---

## 5. GitHub'dan Kendi Kendine Güncelleme (Auto-Update / Self-Update)

Ben yeni bir özelliği veya güncellemeyi GitHub reponuza yüklediğimde (`git push`), VDS sunucunuzun ve tüm kullanıcı ekranlarının **hiçbir veri kaybetmeden kendi kendine güncellenmesi** için iki yöntem hazırlandı:

### Yöntem A: VDS Üzerinde Otomatik Cron Kontrolü (Sıfır Ayar — En Kolayı)
VDS üzerinde `deploy/auto-update.sh` scriptini her 2 dakikada bir GitHub'ı kontrol edecek şekilde `crontab`'a ekleyin:

```bash
chmod +x /opt/housemate/deploy/auto-update.sh
(crontab -l 2>/dev/null; echo "*/2 * * * * cd /opt/housemate && ./deploy/auto-update.sh >> /var/log/housemate-update.log 2>&1") | crontab -
```

Artık GitHub'a yeni bir dağıtım gönderildiğinde:
1. VDS yeni commit'i otomatik algılar, `git pull` yapar ve `./data` veritabanına dokunmadan `docker compose up -d --build` ile yeni imajı devreye alır.
2. Uygulaması açık olan tüm ev/yurt arkadaşlarının tarayıcısındaki **`AutoUpdateBanner`** (`/api/version` kontrolcüsü) yeni sürümü algılar ve ekranları otomatik olarak yeni sürüme geçirir.

### Yöntem B: GitHub Actions (`.github/workflows/deploy.yml`)
İsterseniz GitHub reponuzun **Settings → Secrets and variables → Actions** bölümüne şu bilgileri ekleyerek her push'ta anında SSH dağıtımı da tetikleyebilirsiniz:
- `VDS_HOST`: Sunucu IP adresiniz
- `VDS_USER`: `root`
- `VDS_SSH_KEY`: SSH Private Key
- `VDS_PROJECT_PATH`: `/opt/housemate`
