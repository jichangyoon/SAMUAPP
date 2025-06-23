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
  bucketName: string = process.env.R2_BUCKET_NAME!
): Promise<UploadResult> {
  try {
    // 고유한 파일명 생성
    const fileExtension = path.extname(originalName);
    const fileName = `${crypto.randomUUID()}${fileExtension}`;
    const key = `uploads/${fileName}`;

    // MIME 타입 결정
    const mimeType = getMimeType(fileExtension);

    // R2에 업로드
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: file,
      ContentType: mimeType,
      // 공개 읽기 권한 설정
      ACL: 'public-read',
    });

    await r2Client.send(command);

    // 공개 URL 생성
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
): Promise<boolean> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    await r2Client.send(command);
    return true;
  } catch (error) {
    console.error('R2 삭제 실패:', error);
    return false;
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
    const publicUrl = process.env.R2_PUBLIC_URL!;
    if (url.startsWith(publicUrl)) {
      return url.replace(`${publicUrl}/`, '');
    }
    return null;
  } catch {
    return null;
  }
}