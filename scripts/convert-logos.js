import sharp from 'sharp';
import fs from 'fs';

async function convertLogos() {
  const logos = [
    { input: 'client/src/assets/doctorbird-logo.png', output: 'client/src/assets/doctorbird-logo.webp' },
    { input: 'client/src/assets/wagus-logo.jpg', output: 'client/src/assets/wagus-logo.webp' }
  ];
  
  for (const { input, output } of logos) {
    if (fs.existsSync(input)) {
      const originalSize = fs.statSync(input).size;
      await sharp(input).webp({ quality: 90 }).toFile(output);
      const optimizedSize = fs.statSync(output).size;
      const savings = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);
      
      console.log(`✓ ${input} → ${output} (${savings}% 용량 절약)`);
    } else {
      console.log(`✗ ${input} 파일을 찾을 수 없습니다.`);
    }
  }
}

convertLogos().catch(console.error);