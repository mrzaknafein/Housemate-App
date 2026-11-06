@echo off
chcp 65001 >nul
title Housemate — VDS Tek Tikla Otomatik Kurulum
color 0B
cls
echo ====================================================================
echo             HOUSEMATE — VDS TEK TIKLA OTOMATIK KURULUM
echo ====================================================================
echo.
echo Hedef VDS IP: 148.135.181.63
echo.
echo VDS sunucunuza baglanilacak ve Housemate Docker ile kurulacaktir.
echo Sifrenizi sordugunda root sifrenizi yazip ENTER tusuna basiniz.
echo (Guvenlik geregi sifre yazilirken ekranda yildiz veya karakter gorunmez).
echo ====================================================================
echo.

set VDS_IP=148.135.181.63
set SSH_PORT=22

set SCRIPT_PATH=%~dp0deploy_vds.sh
if not exist "%SCRIPT_PATH%" (
    set SCRIPT_PATH=C:\Users\Çağatay\Desktop\Housemate\deploy_vds.sh
)

echo Baglanti kuruluyor: root@%VDS_IP% (Port: %SSH_PORT%)...
echo.

ssh -p %SSH_PORT% -o StrictHostKeyChecking=no root@%VDS_IP% "bash -s" < "%SCRIPT_PATH%"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ====================================================================
    echo   🎉 TEBRIKLER! VDS KURULUMU BASARIYLA TAMAMLANDI!
    echo ====================================================================
    echo.
    echo Uygulamaniz artik tum dunya ve arkadaslariniz icin canli yayinda:
    echo 👉 http://%VDS_IP%
    echo.
    echo Bu linki ev arkadasina atabilirsin.
    echo Girdiginiz tum harcamalar iki tarafa da ANLIK olarak gidecektir.
    echo ====================================================================
    echo.
    
    :: Masaüstü yerel .exe'nin de VDS'e bağlanması için server-url.txt oluştur
    echo http://%VDS_IP% > "C:\Users\Çağatay\Desktop\Housemate\server-url.txt"
    
    :: Tarayıcıda canlı VDS adresini aç
    start http://%VDS_IP%
) else (
    echo.
    echo ====================================================================
    echo [UYARI] Baglanti veya kurulum sirasinda bir hata olustu.
    echo Lutfen VDS IP'sinin acik oldugunu ve dogru sifre girdiginizi kontrol edin.
    echo ====================================================================
)

echo.
pause
