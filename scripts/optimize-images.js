import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function optimizeImage(inputPath, outputPath, quality = 80) {
  try {
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    await sharp(inputPath)
      .webp({ quality })
      .toFile(outputPath);
    
    const originalSize = fs.statSync(inputPath).size;
    const optimizedSize = fs.statSync(outputPath).size;
    const savings = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);
    
    console.log(`✓ ${path.basename(inputPath)} → ${path.basename(outputPath)} (${savings}% 용량 절약)`);
    return { original: originalSize, optimized: optimizedSize };
  } catch (error) {
    console.error(`✗ ${inputPath} 변환 실패:`, error.message);
    return null;
  }
}

async function optimizeDirectory(inputDir, outputDir, quality = 80) {
  const files = fs.readdirSync(inputDir);
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif'];
  const stats = { totalOriginal: 0, totalOptimized: 0, count: 0 };

  for (const file of files) {
    const inputPath = path.join(inputDir, file);
    const ext = path.extname(file).toLowerCase();
    
    if (imageExtensions.includes(ext)) {
      const baseName = path.basename(file, ext);
      const outputPath = path.join(outputDir, `${baseName}.webp`);
      
      const result = await optimizeImage(inputPath, outputPath, quality);
      if (result) {
        stats.totalOriginal += result.original;
        stats.totalOptimized += result.optimized;
        stats.count++;
      }
    }
  }

  return stats;
}

async function main() {
  console.log('🚀 이미지 WebP 변환 시작...\n');

  // NFT 이미지들 변환
  console.log('📁 NFT 이미지 변환 중...');
  const nftStats = await optimizeDirectory('attached_assets/nfts', 'public/assets/nfts', 85);
  
  // 로고 이미지들 변환
  console.log('\n📁 로고 이미지 변환 중...');
  const logoStats = await optimizeDirectory('client/src/assets', 'client/src/assets/webp', 90);
  
  // 전체 통계
  const totalStats = {
    totalOriginal: nftStats.totalOriginal + logoStats.totalOriginal,
    totalOptimized: nftStats.totalOptimized + logoStats.totalOptimized,
    count: nftStats.count + logoStats.count
  };

  console.log('\n📊 변환 완료 통계:');
  console.log(`총 ${totalStats.count}개 이미지 변환`);
  console.log(`원본 크기: ${(totalStats.totalOriginal / 1024 / 1024).toFixed(2)}MB`);
  console.log(`최적화 크기: ${(totalStats.totalOptimized / 1024 / 1024).toFixed(2)}MB`);
  console.log(`총 절약: ${((totalStats.totalOriginal - totalStats.totalOptimized) / totalStats.totalOriginal * 100).toFixed(1)}%`);
}

main().catch(console.error);