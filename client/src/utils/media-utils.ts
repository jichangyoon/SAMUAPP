// Utility functions for handling media content (images and videos)

export const isVideoFile = (url: string): boolean => {
  if (!url) return false;
  
  const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.flv', '.wmv'];
  const videoMimeTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
  
  const urlLower = url.toLowerCase();
  
  // Check by file extension
  const hasVideoExtension = videoExtensions.some(ext => urlLower.includes(ext));
  
  // Check by MIME type patterns in URL (for R2 URLs that might include MIME info)
  const hasMimePattern = videoMimeTypes.some(mime => urlLower.includes(mime.replace('/', '%2F')));
  
  return hasVideoExtension || hasMimePattern;
};

export const isImageFile = (url: string): boolean => {
  if (!url) return false;
  
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
  const imageMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  const urlLower = url.toLowerCase();
  
  // Check by file extension
  const hasImageExtension = imageExtensions.some(ext => urlLower.includes(ext));
  
  // Check by MIME type patterns in URL
  const hasMimePattern = imageMimeTypes.some(mime => urlLower.includes(mime.replace('/', '%2F')));
  
  return hasImageExtension || hasMimePattern;
};

export const getMediaType = (url: string): 'image' | 'video' | 'unknown' => {
  if (isVideoFile(url)) return 'video';
  if (isImageFile(url)) return 'image';
  return 'unknown';
};