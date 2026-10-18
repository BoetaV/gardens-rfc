@echo off
rem Starts the website on this computer for testing: http://localhost:8080
cd /d "%~dp0"
start "" http://localhost:8080
python server.py
pause
