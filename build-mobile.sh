#!/bin/bash

echo "🚀 SAMU 모바일 앱 빌드 시작"

# 색상 정의
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 의존성 설치
echo -e "${BLUE}📦 의존성 설치 중...${NC}"
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 의존성 설치 실패${NC}"
    exit 1
fi

# 웹 빌드
echo -e "${BLUE}🏗️ 웹 자산 빌드 중...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 웹 빌드 실패${NC}"
    exit 1
fi

# Capacitor 동기화
echo -e "${BLUE}🔄 Capacitor 동기화 중...${NC}"
npx cap sync android
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Capacitor 동기화 실패${NC}"
    exit 1
fi

# Android APK 빌드
echo -e "${BLUE}📱 Android APK 빌드 중...${NC}"
cd android
chmod +x ./gradlew
./gradlew assembleDebug
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ APK 빌드 실패${NC}"
    exit 1
fi

cd ..

# 결과 확인
APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK_PATH" ]; then
    echo -e "${GREEN}✅ APK 빌드 성공!${NC}"
    echo -e "${YELLOW}📍 APK 위치: $APK_PATH${NC}"
    
    # APK 정보 표시
    APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
    echo -e "${BLUE}📊 APK 크기: $APK_SIZE${NC}"
    
    echo -e "\n${GREEN}🎉 빌드 완료!${NC}"
    echo -e "${YELLOW}📱 설치 방법:${NC}"
    echo "1. $APK_PATH 파일을 안드로이드 기기로 전송"
    echo "2. 안드로이드 설정에서 '알 수 없는 소스' 허용"
    echo "3. APK 파일 실행하여 설치"
else
    echo -e "${RED}❌ APK 파일을 찾을 수 없습니다${NC}"
    exit 1
fi