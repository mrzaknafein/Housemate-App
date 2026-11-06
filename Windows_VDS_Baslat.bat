@echo off
chcp 65001 >nul
title Housemate — Windows VDS Otomatik Kurulum ve Baslatici
color 0A
cls
echo ====================================================================
echo        HOUSEMATE — WINDOWS VDS OTOMATIK BASLATICI (PORT 80)
echo ====================================================================
echo.
echo Bu dosya Windows VDS sunucunuz uzerinde calisacak sekilde hazirlanmistir.
echo.

:: 1. Windows Firewall (Guvenlik Duvari) Port 80 ve 3000'i Disariya Ac
echo [1/4] Windows Guvenlik Duvarinda Port 80 ve 3000 aciliyor...
netsh advfirewall firewall delete rule name="Housemate Web" >nul 2>&1
netsh advfirewall firewall add rule name="Housemate Web" dir=in action=allow protocol=TCP localport=80,3000 >nul 2>&1
echo   -> Port 80 ve 3000 dis erisime acildi.

:: 2. Node.js Kontrolu
echo [2/4] Node.js kontrol ediliyor...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   -> Node.js bulunamadi, otomatik olarak indiriliyor ve kuruluyor...
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi', '$env:TEMP\node.msi')"
    echo   -> Kurulum yapiliyor, lutfen 30 saniye bekleyin...
    msiexec /i "%TEMP%\node.msi" /quiet /qn /norestart
    set "PATH=%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs;%PATH%"
    echo   -> Node.js kuruldu!
) else (
    echo   -> Node.js hazir.
)

:: 3. Proje Klasoru Kontrolu
echo [3/4] Housemate proje dosyalari kontrol ediliyor...
set "APP_DIR=%~dp0"
if not exist "%APP_DIR%package.json" (
    echo   -> Proje dosyalari GitHub'dan indiriliyor...
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/mrzaknafein/Housemate-App/archive/refs/heads/main.zip' -OutFile '$env:TEMP\hm.zip'; Expand-Archive -Path '$env:TEMP\hm.zip' -DestinationPath 'C:\Housemate_Temp' -Force; Copy-Item -Path 'C:\Housemate_Temp\Housemate-App-main\*' -Destination 'C:\Housemate' -Recurse -Force; Remove-Item 'C:\Housemate_Temp', '$env:TEMP\hm.zip' -Recurse -Force"
    set "APP_DIR=C:\Housemate\"
)

cd /d "%APP_DIR%"

if not exist "%APP_DIR%node_modules" (
    echo   -> Ilk kurulum yapiliyor (npm install), lutfen 1-2 dakika bekleyiniz...
    call npm.cmd install --omit=dev
)

echo   -> Veritabani senkronize ediliyor...
call npx.cmd prisma db push --skip-generate >nul 2>&1

:: 4. Port 80 Uzerinde Canli Baslat
echo [4/4] Housemate Port 80 uzerinde canliya aliniyor...
echo.
echo ====================================================================
echo   🎉 TEBRIKLER! HOUSEMATE WINDOWS VDS'TE YAYINDA!
echo ====================================================================
echo.
echo Ev ve yurt arkadaslarinizla paylasacaginiz CANLI link:
echo 👉 http://148.135.181.63
echo.
echo Bu pencere acik kaldigi surece uygulama 7/24 canli kalacaktir.
echo ====================================================================
echo.

call npx.cmd next start -p 80

pause
