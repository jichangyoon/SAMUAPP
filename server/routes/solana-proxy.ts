import { Request, Response } from "express";

// 서버 사이드 Solana RPC 프록시
const MAINNET_RPC_ENDPOINTS = [
  'https://api.mainnet-beta.solana.com',
  'https://rpc.ankr.com/solana',
  'https://solana-mainnet.g.alchemy.com/v2/demo'
];

// RPC 요청을 프록시하는 함수
export async function proxySolanaRPC(req: Request, res: Response) {
  const { method, params } = req.body;
  
  if (!method) {
    return res.status(400).json({ error: 'Method is required' });
  }

  // 여러 RPC 엔드포인트를 순차적으로 시도
  for (const endpoint of MAINNET_RPC_ENDPOINTS) {
    try {
      console.log(`서버에서 ${endpoint}로 RPC 요청 시도:`, method);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method,
          params: params || []
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      console.log(`서버 RPC 성공: ${endpoint}`);
      return res.json(data);
      
    } catch (error: any) {
      console.warn(`서버 RPC ${endpoint} 실패:`, error.message);
      // 마지막 엔드포인트가 아니면 다음으로 계속
      if (endpoint !== MAINNET_RPC_ENDPOINTS[MAINNET_RPC_ENDPOINTS.length - 1]) {
        continue;
      }
      
      // 모든 엔드포인트 실패
      return res.status(500).json({ 
        error: '모든 Solana RPC 엔드포인트 연결 실패',
        details: error.message 
      });
    }
  }
}