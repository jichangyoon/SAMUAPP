import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function convertRemainingNfts() {
  const inputDir = 'attached_assets/nfts';
  const outputDir = 'public/assets/nfts';
  
  // 이미 변환된 파일들 확인
  const existingFiles = new Set();
  if (fs.existsSync(outputDir)) {
    fs.readdirSync(outputDir).forEach(file => {
      const baseName = path.basename(file, '.webp');
      existingFiles.add(baseName);
    });
  }
  
  // 원본 파일들 가져오기
  const inputFiles = fs.readdirSync(inputDir)
    .filter(file => file.endsWith('.png'))
    .map(file => ({
      name: file,
      number: parseInt(path.basename(file, '.png'))
    }))
    .sort((a, b) => a.number - b.number);
  
  console.log(`총 ${inputFiles.length}개 원본 파일, ${existingFiles.size}개 이미 변환됨`);
  
  let converted = 0;
  let skipped = 0;
  
  for (const file of inputFiles) {
    const baseName = file.number.toString();
    
    if (existingFiles.has(baseName)) {
      skipped++;
      continue;
    }
    
    const inputPath = path.join(inputDir, file.name);
    const outputPath = path.join(outputDir, `${baseName}.webp`);
    
    try {
      await sharp(inputPath)
        .webp({ quality: 85 })
        .toFile(outputPath);
      
      converted++;
      console.log(`✓ ${file.name} → ${baseName}.webp (${converted}/${inputFiles.length - existingFiles.size})`);
      
    } catch (error) {
      console.error(`✗ ${file.name} 변환 실패:`, error.message);
    }
  }
  
  console.log(`\n완료: ${converted}개 새로 변환, ${skipped}개 건너뜀`);
  console.log(`최종 WebP 파일 개수: ${fs.readdirSync(outputDir).length}개`);
}

convertRemainingNfts().catch(console.error);