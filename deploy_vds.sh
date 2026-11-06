#!/bin/bash
set -e

echo "=========================================================="
echo "   HOUSEMATE VDS OTOMATIK KURULUM BASLIYOR..."
echo "=========================================================="

echo "[1/4] Paketler ve bagimliliklar guncelleniyor..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y >/dev/null 2>&1
apt-get install -y git curl >/dev/null 2>&1

echo "[2/4] Docker kontrol ediliyor..."
if ! command -v docker &> /dev/null; then
    echo "  -> Docker kuruluyor..."
    curl -fsSL https://get.docker.com | sh
fi

echo "[3/4] Housemate depodan indiriliyor..."
rm -rf /opt/housemate
git clone https://github.com/mrzaknafein/Housemate-App.git /opt/housemate
cd /opt/housemate

mkdir -p ./data
chmod -R 777 ./data

echo "[4/4] Docker konteyneri derleniyor ve port 80 uzerinden baslatiliyor..."
docker compose down 2>/dev/null || true
docker compose up -d --build

echo "=========================================================="
echo "   TEBRIKLER! HOUSEMATE BASARIYLA YAYINA ALINDI! 🎉"
echo "=========================================================="
echo "Uygulama aktif ve calisiyor."
