@echo off
echo Starting GhostChat...

:: Start the backend in a new command prompt window
start "GhostChat Backend" cmd /k "cd backend && npm start"

:: Start the frontend in a new command prompt window
start "GhostChat Frontend" cmd /k "cd frontend && npm run dev"

echo GhostChat is starting up!
exit
