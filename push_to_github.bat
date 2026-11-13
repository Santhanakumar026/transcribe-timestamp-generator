@echo off
set "PATH=%LOCALAPPDATA%\Programs\MinGit\cmd;%PATH%"
cd /d "d:\Websites\Transcribe Timestamp Site"

echo ========================================================
echo  Pushing AudioSync AI to GitHub Repository
echo  Repo: https://github.com/Santhanakumar026/transcribe-timestamp-generator
echo ========================================================
echo.

git push -u origin main

echo.
if %ERRORLEVEL% equ 0 (
    echo [SUCCESS] Files successfully pushed to GitHub!
) else (
    echo [INFO] If prompted above, please complete GitHub sign-in in your browser.
)
pause
