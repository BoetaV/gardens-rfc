@echo off
rem Builds the website and puts it online at www.gardensrfc.com (Cloudflare Pages project gardens-rfc).
rem Only needed for photos, videos, sponsors and design changes: content in the Google Sheet updates by itself.
rem The first time on a computer, Cloudflare opens in the browser to ask for permission. Click Allow.
cd /d "%~dp0"
python make_deploy.py || goto :failed
call npx --yes wrangler pages deploy deploy --project-name gardens-rfc --branch main --commit-dirty=true || goto :failed
echo.
echo Done. The website is updated.
pause
exit /b 0
:failed
echo.
echo Something went wrong. Nothing was changed on the website. Read the messages above.
pause
exit /b 1
