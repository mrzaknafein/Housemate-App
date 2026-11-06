#!/usr/bin/env bash
set -e

echo "🔄 [Housemate Auto-Updater] GitHub deposundan son değişiklikler kontrol ediliyor..."

# Mevcut dalı (main veya master) tespit et
BRANCH=$(git rev-parse --abbrev-ref HEAD || echo "main")
git fetch origin "$BRANCH"

LOCAL_HASH=$(git rev-parse HEAD)
REMOTE_HASH=$(git rev-parse "origin/$BRANCH")

if [ "$LOCAL_HASH" = "$REMOTE_HASH" ]; then
  echo "✅ Zaten en güncel sürüm çalışıyor ($LOCAL_HASH)."
  exit 0
fi

echo "🚀 Yeni sürüm tespit edildi ($LOCAL_HASH -> $REMOTE_HASH). Güncelleniyor..."
git pull origin "$BRANCH"

# Yeni commit SHA bilgisini Docker build argümanı olarak geçirerek yeniden derle
# ./data:/app/data volume sayesinde SQLite veritabanı hiç silinmeden korunur!
export GIT_COMMIT_SHA=$(git rev-parse --short HEAD)
docker compose build --build-arg GIT_COMMIT_SHA="$GIT_COMMIT_SHA"
docker compose up -d

echo "🎉 Housemate başarıyla güncellendi! Açık olan tüm kullanıcı ekranları yeni sürümü otomatik algılayıp yenilenecektir."
