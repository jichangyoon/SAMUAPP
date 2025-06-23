import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixNft78() {
  const inputPath = path.join(__dirname, '..', 'attached_assets/78_1750656071692.png');
  const outputPath = path.join(__dirname, '..', 'public/assets/nfts/78.webp');
  
  console.log('🔄 NFT #78 WebP 변환 시작...');
  console.log(`📁 입력: ${inputPath}`);
  console.log(`📁 출력: ${outputPath}`);
  
  try {
    // 원본 파일 크기 확인
    const originalStats = fs.statSync(inputPath);
    const originalSize = originalStats.size;
    
    console.log(`📊 원본 크기: ${(originalSize / 1024).toFixed(1)}KB`);
    
    // 먼저 기존 파일이 있는지 확인
    let existingSize = 0;
    if (fs.existsSync(outputPath)) {
      const existingStats = fs.statSync(outputPath);
      existingSize = existingStats.size;
      console.log(`📊 기존 파일 크기: ${(existingSize / 1024).toFixed(1)}KB`);
    }
    
    // WebP로 변환 (90% 품질 - NFT는 픽셀아트라 높은 품질 필요)
    await sharp(inputPath)
      .webp({ quality: 90 })
      .toFile(outputPath);
    
    // 변환된 파일 크기 확인
    const convertedStats = fs.statSync(outputPath);
    const convertedSize = convertedStats.size;
    const reduction = ((originalSize - convertedSize) / originalSize) * 100;
    
    console.log(`📊 변환 크기: ${(convertedSize / 1024).toFixed(1)}KB`);
    console.log(`📈 용량 절약: ${reduction.toFixed(1)}% (${((originalSize - convertedSize) / 1024).toFixed(1)}KB 절약)`);
    console.log('✅ NFT #78 WebP 변환 완료!');
    
  } catch (error) {
    console.error('❌ 변환 중 오류:', error);
  }
}

fixNft78();