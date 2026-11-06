@echo off
title Housemate Windows VDS Launcher
color 0a
cls
echo ========================================================
echo        HOUSEMATE WINDOWS VDS LAUNCHER
echo ========================================================
echo.

echo [1/4] Windows Firewall Port 80 ve 3000 aciliyor...
netsh advfirewall firewall delete rule name="Housemate Web" >nul 2>&1
netsh advfirewall firewall add rule name="Housemate Web" dir=in action=allow protocol=TCP localport=80,3000 >nul 2>&1
echo Port 80 ve 3000 acildi.
echo.

echo [2/4] Node.js kontrol ediliyor...
where node >nul 2>&1
if errorlevel 1 goto INSTALL_NODE
echo Node.js kurulu ve hazir.
goto LOCATE_APP

:INSTALL_NODE
echo Node.js bulunamadi, otomatik indiriliyor...
powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi', '%TEMP%\node.msi')"
echo Node.js kuruluyor, lutfen bekleyin...
msiexec /i "%TEMP%\node.msi" /quiet /qn /norestart
set "PATH=%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs;%PATH%"
echo Node.js kuruldu.
goto LOCATE_APP

:LOCATE_APP
echo.
echo [3/4] Uygulama klasoru ve veritabani hazirlaniyor...
if exist "package.json" goto PREPARE_ENV
if exist "hm\package.json" cd hm & goto PREPARE_ENV
if exist "Housemate\package.json" cd Housemate & goto PREPARE_ENV
if exist "C:\Users\Administrator\Desktop\hm\package.json" cd /d "C:\Users\Administrator\Desktop\hm" & goto PREPARE_ENV

echo Proje dosyalari indiriliyor...
powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('https://github.com/mrzaknafein/Housemate-App/archive/refs/heads/main.zip', '%TEMP%\hm.zip'); Expand-Archive -Path '%TEMP%\hm.zip' -DestinationPath 'C:\Housemate_Temp' -Force; Copy-Item -Path 'C:\Housemate_Temp\Housemate-App-main\*' -Destination '.' -Recurse -Force; Remove-Item 'C:\Housemate_Temp', '%TEMP%\hm.zip' -Recurse -Force"
goto PREPARE_ENV

:PREPARE_ENV
if not exist ".env" (
  echo DATABASE_URL="file:./dev.db"> .env
  echo NEXT_PUBLIC_APP_VERSION="1.0.0">> .env
)

if exist "node_modules" goto SYNC_DB
echo Ilk kurulum yapiliyor (npm install)... Lutfen bekleyin...
call npm.cmd install

:SYNC_DB
echo Veritabani tablolari olusturuluyor...
call npx.cmd prisma generate
call npx.cmd prisma db push --accept-data-loss

if exist ".next\BUILD_ID" goto START_SERVER
echo.
echo Next.js uygulamasi derleniyor (npm run build)... Lutfen 1-2 dakika bekleyin...
call npm.cmd run build

:START_SERVER
echo.
echo ========================================================
echo   TEBRIKLER! HOUSEMATE WINDOWS VDS TE YAYINDA!
echo ========================================================
echo.
echo Canli Link: http://148.135.181.63
echo.
echo SCT AFK Service ile port cakismasi yoktur.
echo Bu pencere acik kaldigi surece uygulama calisacaktir.
echo ========================================================
echo.

call npx.cmd next start -p 80
if errorlevel 1 goto TRY_3000
goto END

:TRY_3000
echo Port 80 mesgul, Port 3000 deneniyor...
echo Canli Link: http://148.135.181.63:3000
call npx.cmd next start -p 3000

:END
pause
