@echo off
title Housemate Windows VDS Launcher
color 0a
cls
echo ========================================================
echo        HOUSEMATE WINDOWS VDS LAUNCHER PORT 80
echo ========================================================
echo.

echo [1/3] Windows Firewall Port 80 ve 3000 aciliyor
netsh advfirewall firewall delete rule name="Housemate Web" >nul 2>&1
netsh advfirewall firewall add rule name="Housemate Web" dir=in action=allow protocol=TCP localport=80,3000 >nul 2>&1
echo Port 80 ve 3000 acildi.
echo.

echo [2/3] Node.js kontrol ediliyor
where node >nul 2>&1
if errorlevel 1 goto INSTALL_NODE
echo Node.js kurulu ve hazir.
goto CHECK_APP

:INSTALL_NODE
echo Node.js bulunamadi, indiriliyor
powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi', '%TEMP%\node.msi')"
echo Node.js kuruluyor, lutfen 30 saniye bekleyin
msiexec /i "%TEMP%\node.msi" /quiet /qn /norestart
set "PATH=%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs;%PATH%"
echo Node.js kuruldu.
goto CHECK_APP

:CHECK_APP
echo.
echo [3/3] Uygulama dosyalari kontrol ediliyor
if exist "package.json" goto RUN_APP
if exist "Housemate\package.json" goto CD_HOUSEMATE

echo Proje GitHub dan indiriliyor
powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('https://github.com/mrzaknafein/Housemate-App/archive/refs/heads/main.zip', '%TEMP%\hm.zip'); Expand-Archive -Path '%TEMP%\hm.zip' -DestinationPath 'C:\Housemate_Temp' -Force; Copy-Item -Path 'C:\Housemate_Temp\Housemate-App-main\*' -Destination '.' -Recurse -Force; Remove-Item 'C:\Housemate_Temp', '%TEMP%\hm.zip' -Recurse -Force"
goto RUN_APP

:CD_HOUSEMATE
cd Housemate

:RUN_APP
if not exist "node_modules" goto INSTALL_DEPS
goto SYNC_DB

:INSTALL_DEPS
echo Ilk kurulum yapiliyor npm install
call npm.cmd install --omit=dev

:SYNC_DB
echo Veritabani senkronize ediliyor
call npx.cmd prisma db push --skip-generate >nul 2>&1

echo.
echo ========================================================
echo   TEBRIKLER! HOUSEMATE WINDOWS VDS TE YAYINDA!
echo ========================================================
echo.
echo Canli link:
echo    http://148.135.181.63
echo.
echo Bu pencere acik kaldigi surece uygulama calisacaktir.
echo ========================================================
echo.

call npx.cmd next start -p 80

pause
