@echo off
rem Makes the "deploy" folder to drag onto Cloudflare Pages
cd /d "%~dp0"
python make_deploy.py
explorer "%~dp0deploy"
pause
