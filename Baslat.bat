@echo off
chcp 65001 >nul
title Housemate - Ortak Gider Takip
cls
echo ========================================================
echo        HOUSEMATE - ORTAK GIDER TAKIP PLATFORMU
echo ========================================================
echo.
echo Uygulama baslatiliyor, lutfen bekleyin...
echo Tarayiciniz otomatik olarak acilacaktir: http://localhost:3000
echo.
echo Kapatmak istediginizde bu siyah pencereyi kapatmaniz yeterlidir.
echo ========================================================
echo.

cd /d "%~dp0"

:: Tarayıcıyı 2 saniye sonra otomatik aç
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3000"

:: Next.js sunucusunu çalıştır
npm.cmd run start

pause
