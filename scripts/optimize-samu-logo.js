import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function optimizeSamuLogo() {
  const inputPath = path.join(__dirname, '..', 'client/public/assets/images/logos/samu-logo.jpg');
  const outputPath = path.join(__dirname, '..', 'client/src/assets/samu-logo.webp');
  
  console.log('🔄 SAMU 로고 WebP 최적화 시작...');
  console.log(`📁 입력: ${inputPath}`);
  console.log(`📁 출력: ${outputPath}`);
  
  try {
    // 원본 파일 크기 확인
    const originalStats = fs.statSync(inputPath);
    const originalSize = originalStats.size;
    
    console.log(`📊 원본 크기: ${(originalSize / 1024).toFixed(1)}KB`);
    
    // WebP로 변환 (80% 품질)
    await sharp(inputPath)
      .webp({ quality: 80 })
      .toFile(outputPath);
    
    // 변환된 파일 크기 확인
    const convertedStats = fs.statSync(outputPath);
    const convertedSize = convertedStats.size;
    const reduction = ((originalSize - convertedSize) / originalSize) * 100;
    
    console.log(`📊 변환 크기: ${(convertedSize / 1024).toFixed(1)}KB`);
    console.log(`📈 용량 절약: ${reduction.toFixed(1)}% (${((originalSize - convertedSize) / 1024).toFixed(1)}KB 절약)`);
    console.log('✅ SAMU 로고 WebP 변환 완료!');
    
  } catch (error) {
    console.error('❌ 변환 중 오류:', error);
  }
}

optimizeSamuLogo();