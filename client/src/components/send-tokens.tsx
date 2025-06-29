import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isSolanaAddress } from "@/lib/solana";
import { useSendTransaction } from '@privy-io/react-auth/solana';
import { Connection, Transaction, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

interface SendTokensProps {
  walletAddress: string;
  samuBalance: number;
  solBalance: number;
  chainType: string;
}

export function SendTokens({ walletAddress, samuBalance, solBalance, chainType }: SendTokensProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [tokenType, setTokenType] = useState("SOL");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { sendTransaction } = useSendTransaction();

  // SAMU 토큰 컨트랙트 주소 (실제 SAMU 토큰 주소)
  const SAMU_TOKEN_ADDRESS = "EHy2UQWKKVWYvMTzbEfYy1jvZD8VhRBUAvz3bnJ1GnuF";
  
  // 안정적인 RPC 연결을 위한 폴백 엔드포인트
  const RPC_ENDPOINTS = [
    'https://rpc.ankr.com/solana',  // 더 안정적인 엔드포인트를 우선 순위로
    'https://solana-mainnet.g.alchemy.com/v2/demo',
    'https://api.mainnet-beta.solana.com'
  ];
  
  const getConnection = () => {
    // 첫 번째 엔드포인트 사용 (향후 폴백 로직 추가 가능)
    return new Connection(RPC_ENDPOINTS[0], 'confirmed');
  };

  const handleSend = async () => {
    // Buffer 폴리필 확인 및 설정
    if (typeof (globalThis as any).Buffer === 'undefined') {
      console.log('Buffer 폴리필 재설정 중...');
      try {
        const { Buffer } = await import('buffer');
        (globalThis as any).Buffer = Buffer;
        (globalThis as any).global = globalThis;
        (globalThis as any).process = { env: {}, browser: true };
      } catch (error) {
        console.warn('Buffer 폴리필 실패, 기본 구현 사용');
      }
    }

    if (!recipient || !amount) {
      toast({
        title: "Missing Information",
        description: "Please enter recipient address and amount",
        variant: "destructive"
      });
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive"
      });
      return;
    }

    // 잔고 확인 (SOL의 경우 거래 수수료 고려)
    const maxBalance = tokenType === "SAMU" ? samuBalance : solBalance;
    // 솔라나 기본 트랜잭션 수수료는 약 0.000005 SOL이지만 안전하게 0.0001 SOL로 설정
    const estimatedFee = tokenType === "SOL" ? 0.0001 : 0; 
    
    if (tokenType === "SOL" && (amountNum + estimatedFee) > maxBalance) {
      toast({
        title: "Insufficient Balance",
        description: `Need at least ${(amountNum + estimatedFee).toFixed(4)} SOL (including ~${estimatedFee} SOL fee)`,
        variant: "destructive"
      });
      return;
    } else if (tokenType === "SAMU" && amountNum > maxBalance) {
      toast({
        title: "Insufficient Balance",
        description: `You don't have enough ${tokenType}`,
        variant: "destructive"
      });
      return;
    }

    // Solana 주소 검증
    if (chainType === 'solana' && !isSolanaAddress(recipient)) {
      toast({
        title: "Invalid Address",
        description: "Please enter a valid Solana address",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      if (chainType !== 'solana') {
        toast({
          title: "Not Supported",
          description: "Only Solana transactions are supported",
          variant: "destructive"
        });
        return;
      }

      const fromPubkey = new PublicKey(walletAddress);
      const toPubkey = new PublicKey(recipient);
      
      if (tokenType === "SOL") {
        // SOL 전송
        const lamports = amountNum * LAMPORTS_PER_SOL;
        
        console.log("1. SOL 전송 시작:", { amount: amountNum, lamports });
        
        // 최근 블록해시 가져오기
        const connection = getConnection();
        console.log("2. RPC 연결 확인:", connection.rpcEndpoint);
        
        let blockhash: string;
        try {
          const blockHashInfo = await connection.getLatestBlockhash('finalized');
          blockhash = blockHashInfo.blockhash;
          console.log("3. 블록해시 획득:", blockhash);
        } catch (blockchainError: any) {
          console.error("블록해시 획득 실패:", blockchainError);
          toast({
            title: "Network Connection Failed",
            description: "Cannot connect to Solana network. Please try again.",
            variant: "destructive"
          });
          return;
        }
        
        const transaction = new Transaction();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPubkey;
        
        console.log("4. 트랜잭션 기본 설정:", {
          feePayer: transaction.feePayer.toString(),
          recentBlockhash: transaction.recentBlockhash
        });
        
        transaction.add(
          SystemProgram.transfer({
            fromPubkey,
            toPubkey,
            lamports: Math.floor(lamports)
          })
        );

        console.log("5. 트랜잭션 완성:", {
          instructions: transaction.instructions.length,
          instruction: transaction.instructions[0]
        });

        // 실제 트랜잭션 수수료 계산
        try {
          const fee = await connection.getFeeForMessage(transaction.compileMessage());
          console.log(`실제 트랜잭션 수수료: ${fee.value / LAMPORTS_PER_SOL} SOL (${fee.value} lamports)`);
        } catch (feeError) {
          console.log("수수료 계산 실패, 기본값 사용");
        }

        // 실제 트랜잭션 전송 - Privy Solana 방식
        console.log("트랜잭션 전송 시도...", {
          fromPubkey: fromPubkey.toString(),
          toPubkey: toPubkey.toString(),
          lamports: Math.floor(lamports)
        });

        // Privy 공식 방식 - Transaction 객체 직접 전달
        console.log("실제 잔고 확인:", {
          solBalance,
          amountNum,
          estimatedFee,
          total: amountNum + estimatedFee,
          sufficient: (amountNum + estimatedFee) <= solBalance
        });

        try {
          const receipt = await sendTransaction({
            transaction,
            connection,
            uiOptions: {
              showWalletUIs: true  // 사용자에게 확인 UI 표시
            }
          });

          toast({
            title: "Transaction Successful!",
            description: `Sent ${amount} SOL to ${recipient.slice(0, 8)}...`,
          });

          console.log("Transaction signature:", receipt.signature);
          
        } catch (sendError: any) {
          console.error("실제 전송 오류:", sendError);
          console.error("오류 상세:", {
            message: sendError?.message,
            code: sendError?.code,
            details: sendError?.details,
            stack: sendError?.stack
          });
          
          let errorMessage = "Network error. Please try again.";
          if (sendError?.message?.includes('insufficient')) {
            errorMessage = "Insufficient SOL balance for transaction + fees";
          } else if (sendError?.message?.includes('blockhash')) {
            errorMessage = "Transaction expired. Please try again.";
          }
          
          toast({
            title: "Transaction Failed",
            description: errorMessage,
            variant: "destructive"
          });
          return;
        }
        
      } else if (tokenType === "SAMU") {
        // SAMU 토큰 전송은 추후 구현
        toast({
          title: "Feature in Development",
          description: "SAMU token transfers coming soon. SOL transfers are available now.",
          variant: "destructive"
        });
        return;
      }

      setRecipient("");
      setAmount("");
      setIsOpen(false);
    } catch (error) {
      console.error("Transaction error:", error);
      
      let errorMessage = "Failed to send tokens. Please try again.";
      if (error instanceof Error) {
        if (error.message.includes("insufficient")) {
          errorMessage = "Insufficient balance for transaction and fees.";
        } else if (error.message.includes("blockhash")) {
          errorMessage = "Network error. Please try again.";
        } else if (error.message.includes("rejected")) {
          errorMessage = "Transaction was rejected.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Transaction Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full bg-primary/10 border-primary/30 hover:bg-primary/20"
        >
          <Send className="h-4 w-4 mr-2" />
          Send Tokens
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Send Tokens
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* 토큰 타입 선택 */}
          <div className="space-y-2">
            <Label htmlFor="tokenType">Token Type</Label>
            <Select value={tokenType} onValueChange={setTokenType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SAMU">
                  SAMU (Balance: {samuBalance.toLocaleString()})
                </SelectItem>
                <SelectItem value="SOL">
                  SOL (Balance: {solBalance.toFixed(4)})
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 수신자 주소 */}
          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient Address</Label>
            <Input
              id="recipient"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder={chainType === 'solana' ? "Enter Solana address..." : "Enter wallet address..."}
              className="font-mono text-sm"
            />
          </div>

          {/* 송금 금액 */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                step="0.0001"
                min="0"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                {tokenType}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Available: {tokenType === "SAMU" ? samuBalance.toLocaleString() : solBalance.toFixed(4)} {tokenType}
            </div>
          </div>

          {/* 전송 버튼 */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSend}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? "Sending..." : "Send Tokens"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>

          {/* 주의사항 */}
          <div className="text-xs text-muted-foreground bg-accent/20 rounded p-2">
            <strong>Active:</strong> Real SOL transfers are now enabled on Solana mainnet. SAMU token transfers coming soon. Double-check recipient address before sending.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}