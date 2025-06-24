import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import path from 'path';

// Cloudflare R2 클라이언트 설정
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export interface UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

/**
 * 파일을 Cloudflare R2에 업로드
 */
export async function uploadToR2(
  file: Buffer,
  originalName: string,
  folder: string = 'uploads',
  maxSize?: number
): Promise<UploadResult> {
  // Check file size if limit specified
  if (maxSize && file.length > maxSize) {
    return {
      success: false,
      error: `File size ${file.length} bytes exceeds limit of ${maxSize} bytes`
    };
  }
  try {
    // 고유한 파일명 생성
    const fileExtension = path.extname(originalName);
    const fileName = `${crypto.randomUUID()}${fileExtension}`;
    
    // 폴더 구조 수정: samumemecontest 버킷 내에서 하위 폴더 사용
    let key: string;
    if (folder && folder !== '') {
      key = `${folder}/${fileName}`;
    } else {
      key = fileName; // 루트에 저장
    }
    
    console.log(`R2 upload debug: bucket="${process.env.R2_BUCKET_NAME}", folder="${folder}", key="${key}", fileName="${fileName}"`);

    // MIME 타입 결정
    const mimeType = getMimeType(fileExtension);

    // R2에 업로드 (ACL 제거 - R2는 버킷 레벨에서 공개 설정)
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: file,
      ContentType: mimeType,
      CacheControl: 'public, max-age=31536000', // 1년 캐시
    });

    await r2Client.send(command);

    // 공개 URL 생성 - 올바른 R2 Public Development URL 사용
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

    return {
      success: true,
      url: publicUrl,
      key: key,
    };
  } catch (error) {
    console.error('R2 업로드 실패:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * R2에서 파일 삭제
 */
export async function deleteFromR2(
  key: string,
  bucketName: string = process.env.R2_BUCKET_NAME!
): Promise<UploadResult> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    await r2Client.send(command);
    console.log('R2 파일 삭제 성공:', key);
    return {
      success: true,
      key: key
    };
  } catch (error) {
    console.error('R2 삭제 실패:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      key: key
    };
  }
}

/**
 * 파일 확장자로 MIME 타입 결정
 */
function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.webm': 'video/webm',
  };

  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
}

/**
 * URL에서 R2 키 추출
 */
export function extractKeyFromUrl(url: string): string | null {
  try {
    // 실제 R2 도메인들 - 사용자 제공 도메인 포함
    const r2Domains = [
      'https://pub-6ba1d3b9f0b544138a8d628ffcf407f6.r2.dev',
      'https://e63c3b37166fe8f08158620aabbd1b78.r2.cloudflarestorage.com',
      'https://pub-91c5838b92b44777b0cdcf1e79e70d97.r2.dev', // 레거시
      process.env.R2_PUBLIC_URL
    ].filter(Boolean);
    
    for (const domain of r2Domains) {
      if (url.startsWith(domain!)) {
        return url.replace(`${domain}/`, '');
      }
    }
    
    // 일반적인 URL 파싱도 시도
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    return path.startsWith('/') ? path.slice(1) : path;
  } catch (error) {
    console.error('Error extracting key from URL:', error);
    return null;
  }
}