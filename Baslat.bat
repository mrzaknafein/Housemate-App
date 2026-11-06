@echo off
chcp 65001 >nul
title Housemate - Ortak Gider Takip (Native Desktop App)
cls
echo ========================================================
echo        HOUSEMATE - YEREL MASAUSTU UYGULAMASI
echo ========================================================
echo.
echo Uygulama penceresi aciliyor, lutfen bekleyin...
echo.
echo Kapatmak istediginizde uygulama penceresini kapatabilirsiniz.
echo ========================================================
echo.

cd /d "%~dp0"

:: 2 saniye sonra bağımsız yerel uygulama penceresi olarak aç
start "" cmd /c "timeout /t 2 /nobreak >nul & start \"\" msedge.exe --app=http://localhost:3000 --window-size=1280,840 --user-data-dir=\"%~dp0.native-profile\""

:: Next.js sunucusunu çalıştır
npm.cmd run start

pause
