import { useEffect } from 'react';
import { useLocation } from 'wouter';

export default function PhantomCallback() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    console.log('팬텀 콜백 페이지 로드됨');
    
    // URL 파라미터 파싱
    const urlParams = new URLSearchParams(window.location.search);
    const fragmentParams = new URLSearchParams(window.location.hash.substring(1));
    
    const publicKey = urlParams.get('public_key') || 
                     urlParams.get('publicKey') || 
                     fragmentParams.get('public_key') ||
                     fragmentParams.get('publicKey');
    
    const errorMessage = urlParams.get('errorMessage') || fragmentParams.get('errorMessage');
    
    console.log('팬텀 콜백 데이터:', { publicKey, errorMessage, url: window.location.href });
    
    // 메인 앱으로 메시지 전달
    if (window.opener || window.parent !== window) {
      const message = {
        type: 'phantom_callback',
        publicKey,
        connected: !!publicKey,
        errorMessage
      };
      
      if (window.opener) {
        window.opener.postMessage(message, '*');
        window.close();
      } else {
        window.parent.postMessage(message, '*');
      }
    } else {
      // 딥링크 핸들러로 데이터 전달
      import('../lib/deeplink-handler').then(({ deepLinkHandler }) => {
        deepLinkHandler.executeCallback('phantom', {
          publicKey,
          connected: !!publicKey,
          errorMessage
        });
      });
      
      // 메인 페이지로 리다이렉트
      setTimeout(() => {
        setLocation('/');
      }, 1000);
    }
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-[hsl(45,85%,95%)] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(30,100%,50%)] mx-auto mb-4"></div>
        <h2 className="text-xl font-bold text-[hsl(201,30%,25%)] mb-2">
          팬텀 지갑 연결 처리 중...
        </h2>
        <p className="text-[hsl(201,20%,45%)]">
          잠시만 기다려주세요
        </p>
      </div>
    </div>
  );
}