@echo off
echo 🚀 SAMU 모바일 앱 빌드 시작

REM 의존성 설치
echo 📦 의존성 설치 중...
call npm install
if %errorlevel% neq 0 (
    echo ❌ 의존성 설치 실패
    pause
    exit /b 1
)

REM 웹 빌드
echo 🏗️ 웹 자산 빌드 중...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ 웹 빌드 실패
    pause
    exit /b 1
)

REM Capacitor 동기화
echo 🔄 Capacitor 동기화 중...
call npx cap sync android
if %errorlevel% neq 0 (
    echo ❌ Capacitor 동기화 실패
    pause
    exit /b 1
)

REM Android APK 빌드
echo 📱 Android APK 빌드 중...
cd android
call gradlew.bat assembleDebug
if %errorlevel% neq 0 (
    echo ❌ APK 빌드 실패
    pause
    exit /b 1
)

cd ..

REM 결과 확인
set APK_PATH=android\app\build\outputs\apk\debug\app-debug.apk
if exist "%APK_PATH%" (
    echo ✅ APK 빌드 성공!
    echo 📍 APK 위치: %APK_PATH%
    echo.
    echo 🎉 빌드 완료!
    echo 📱 설치 방법:
    echo 1. %APK_PATH% 파일을 안드로이드 기기로 전송
    echo 2. 안드로이드 설정에서 '알 수 없는 소스' 허용
    echo 3. APK 파일 실행하여 설치
) else (
    echo ❌ APK 파일을 찾을 수 없습니다
    pause
    exit /b 1
)

pause