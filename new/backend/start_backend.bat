@echo off
echo Starting FleetFlow Backend...
cd /d "%~dp0"
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
