import sharp from 'sharp';
import fs from 'fs';

async function finishConversion() {
  const existing = new Set(fs.readdirSync('public/assets/nfts').map(f => f.replace('.webp', '')));
  const needed = [];
  
  // 1-164까지 확인해서 빠진 번호들 찾기
  for (let i = 1; i <= 164; i++) {
    if (!existing.has(i.toString())) {
      const inputPath = `attached_assets/nfts/${i}.png`;
      if (fs.existsSync(inputPath)) {
        needed.push(i);
      }
    }
  }
  
  console.log(`남은 변환 대상: ${needed.length}개`);
  
  // 10개씩 배치로 변환
  for (let i = 0; i < needed.length; i += 10) {
    const batch = needed.slice(i, i + 10);
    console.log(`배치 ${Math.floor(i/10) + 1}: ${batch.join(', ')}`);
    
    const promises = batch.map(async (num) => {
      const inputPath = `attached_assets/nfts/${num}.png`;
      const outputPath = `public/assets/nfts/${num}.webp`;
      
      try {
        await sharp(inputPath).webp({ quality: 85 }).toFile(outputPath);
        return `✓ ${num}`;
      } catch (e) {
        return `✗ ${num}: ${e.message}`;
      }
    });
    
    const results = await Promise.all(promises);
    results.forEach(result => console.log(result));
  }
  
  const finalCount = fs.readdirSync('public/assets/nfts').length;
  console.log(`최종 WebP 파일 개수: ${finalCount}/164개`);
}

finishConversion().catch(console.error);