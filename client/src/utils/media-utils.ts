export function getMediaType(src: string): 'video' | 'image' {
  return src.includes('.mp4') || src.includes('.mov') || src.includes('.avi') || src.includes('.webm') ? 'video' : 'image';
}