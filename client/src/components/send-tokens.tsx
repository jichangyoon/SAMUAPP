import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isSolanaAddress } from "@/lib/solana";
import { usePrivy } from "@privy-io/react-auth";
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createTransferInstruction, getAssociatedTokenAddress, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";

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
  const [tokenType, setTokenType] = useState("SAMU");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user, sendTransaction } = usePrivy();

  // SAMU 토큰 민트 주소
  const SAMU_TOKEN_MINT = "EHy2UQWKKVWYvMTzbEfYy1jvZD8VhRBUAvz3bnJ1GnuF";
  
  // RPC 연결 설정
  const connection = new Connection("https://api.mainnet-beta.solana.com");

  const handleSend = async () => {
    if (!recipient || !amount) {
      toast({
        title: "정보 누락",
        description: "받는 주소와 금액을 입력해주세요",
        variant: "destructive"
      });
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({
        title: "잘못된 금액",
        description: "올바른 금액을 입력해주세요",
        variant: "destructive"
      });
      return;
    }

    // 잔고 확인
    const maxBalance = tokenType === "SAMU" ? samuBalance : solBalance;
    if (amountNum > maxBalance) {
      toast({
        title: "잔고 부족",
        description: `${tokenType} 잔고가 부족합니다`,
        variant: "destructive"
      });
      return;
    }

    // Solana 주소 검증
    if (chainType === 'solana' && !isSolanaAddress(recipient)) {
      toast({
        title: "잘못된 주소",
        description: "올바른 Solana 주소를 입력해주세요",
        variant: "destructive"
      });
      return;
    }

    // 사용자 확인 없이는 전송 불가
    if (!user) {
      toast({
        title: "인증 필요",
        description: "토큰 전송을 위해 로그인이 필요합니다",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const fromPublicKey = new PublicKey(walletAddress);
      const toPublicKey = new PublicKey(recipient);

      let transaction: Transaction;
      let signature: string;

      if (tokenType === "SOL") {
        // SOL 전송
        const lamports = Math.floor(amountNum * LAMPORTS_PER_SOL);
        
        transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: fromPublicKey,
            toPubkey: toPublicKey,
            lamports: lamports,
          })
        );
      } else {
        // SAMU 토큰 전송
        const tokenMint = new PublicKey(SAMU_TOKEN_MINT);
        
        // 소수점 9자리까지 지원 (SAMU 토큰 decimals)
        const tokenAmount = Math.floor(amountNum * Math.pow(10, 9));
        
        // 송신자와 수신자의 토큰 계정 주소 계산
        const fromTokenAccount = await getAssociatedTokenAddress(
          tokenMint,
          fromPublicKey
        );
        
        const toTokenAccount = await getAssociatedTokenAddress(
          tokenMint,
          toPublicKey
        );

        // 수신자의 토큰 계정이 존재하는지 확인하고 없으면 생성
        try {
          await connection.getAccountInfo(toTokenAccount);
        } catch (error) {
          // 토큰 계정이 없으면 생성 지시 추가
          transaction = new Transaction().add(
            await getOrCreateAssociatedTokenAccount(
              connection,
              fromPublicKey,
              tokenMint,
              toPublicKey
            ).then(() => 
              createTransferInstruction(
                fromTokenAccount,
                toTokenAccount,
                fromPublicKey,
                tokenAmount,
                [],
                TOKEN_PROGRAM_ID
              )
            )
          );
        }

        if (!transaction) {
          // 토큰 계정이 이미 존재하는 경우 직접 전송
          transaction = new Transaction().add(
            createTransferInstruction(
              fromTokenAccount,
              toTokenAccount,
              fromPublicKey,
              tokenAmount,
              [],
              TOKEN_PROGRAM_ID
            )
          );
        }
      }

      // 최신 블록해시 가져오기
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPublicKey;

      // Privy를 통한 트랜잭션 전송
      signature = await sendTransaction(transaction, connection);

      // 트랜잭션 확인 대기 (최대 30초)
      await connection.confirmTransaction(signature, 'confirmed');

      toast({
        title: "전송 완료",
        description: `${amount} ${tokenType}이 성공적으로 전송되었습니다`,
        duration: 3000
      });

      setRecipient("");
      setAmount("");
      setIsOpen(false);

    } catch (error: any) {
      console.error("Token transfer error:", error);
      
      let errorMessage = "토큰 전송에 실패했습니다";
      
      if (error.message?.includes("insufficient funds")) {
        errorMessage = "잔고가 부족합니다";
      } else if (error.message?.includes("invalid")) {
        errorMessage = "잘못된 주소이거나 토큰 계정입니다";
      } else if (error.message?.includes("timeout")) {
        errorMessage = "네트워크 연결 시간이 초과되었습니다";
      }

      toast({
        title: "전송 실패",
        description: errorMessage,
        variant: "destructive",
        duration: 4000
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
          토큰 전송
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
            <strong>Note:</strong> This is currently a UI prototype. Actual token transfers will be implemented with Solana Web3.js integration.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}