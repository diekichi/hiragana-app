@echo off
echo ひらがなアプリを起動しています...
echo.
echo Chromeが開いたらそちらで使ってください。
echo この画面は閉じないでください。
echo.
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" "http://localhost:8787"
python -m http.server 8787
pause
