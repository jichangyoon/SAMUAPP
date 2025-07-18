// 디바이스 고유 ID 생성을 위한 fingerprinting 함수
export const generateDeviceFingerprint = async (): Promise<string> => {
  const fingerprint: string[] = [];

  // 1. 화면 정보
  fingerprint.push(`screen:${screen.width}x${screen.height}x${screen.colorDepth}`);
  fingerprint.push(`avail:${screen.availWidth}x${screen.availHeight}`);

  // 2. 시간대
  fingerprint.push(`tz:${Intl.DateTimeFormat().resolvedOptions().timeZone}`);

  // 3. 언어 설정
  fingerprint.push(`lang:${navigator.language}`);
  fingerprint.push(`langs:${navigator.languages.join(',')}`);

  // 4. 플랫폼 정보
  fingerprint.push(`platform:${navigator.platform}`);
  fingerprint.push(`ua:${navigator.userAgent.slice(0, 100)}`); // 너무 길어지지 않게 제한

  // 5. 하드웨어 정보
  fingerprint.push(`cores:${navigator.hardwareConcurrency || 0}`);
  fingerprint.push(`memory:${(navigator as any).deviceMemory || 0}`);

  // 6. Canvas fingerprinting
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      canvas.width = 200;
      canvas.height = 50;
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('SAMU Device ID', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('Device fingerprint', 4, 35);
      
      const canvasData = canvas.toDataURL();
      fingerprint.push(`canvas:${canvasData.slice(-50)}`); // 마지막 50자만 사용
    }
  } catch (e) {
    fingerprint.push('canvas:unavailable');
  }

  // 7. WebGL fingerprinting
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const renderer = gl.getParameter(gl.RENDERER);
      const vendor = gl.getParameter(gl.VENDOR);
      fingerprint.push(`webgl:${vendor}-${renderer}`.slice(0, 50));
    }
  } catch (e) {
    fingerprint.push('webgl:unavailable');
  }

  // 8. 터치 지원
  fingerprint.push(`touch:${('ontouchstart' in window) || (navigator.maxTouchPoints > 0)}`);

  // 9. 배터리 정보 (가능한 경우)
  try {
    const battery = await (navigator as any).getBattery?.();
    if (battery) {
      fingerprint.push(`battery:${battery.charging ? 'charging' : 'discharging'}`);
    }
  } catch (e) {
    fingerprint.push('battery:unavailable');
  }

  // 모든 정보를 합쳐서 해시 생성
  const combined = fingerprint.join('|');
  
  // 간단한 해시 함수 (crypto API 사용)
  const encoder = new TextEncoder();
  const data = encoder.encode(combined);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `device_${hashHex.slice(0, 16)}`; // 16자리 디바이스 ID
};

// 디바이스 ID 가져오기 (localStorage에서 캐시)
export const getDeviceId = async (): Promise<string> => {
  try {
    // localStorage에서 기존 ID 확인
    const existingId = localStorage.getItem('samu_device_id');
    if (existingId) {
      return existingId;
    }

    // 새로운 ID 생성
    const newId = await generateDeviceFingerprint();
    localStorage.setItem('samu_device_id', newId);
    return newId;
  } catch (error) {
    console.error('Error generating device ID:', error);
    
    // 폴백: 랜덤 ID 생성
    const fallbackId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem('samu_device_id', fallbackId);
    return fallbackId;
  }
};

// 디바이스 ID 초기화 (테스트용)
export const resetDeviceId = async (): Promise<string> => {
  localStorage.removeItem('samu_device_id');
  return await getDeviceId();
};