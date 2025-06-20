import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Wallet, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isSolanaAddress, sendSolanaTokens } from "@/lib/solana";
import { usePrivy, useWallets } from "@privy-io/react-auth";

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
  const [useRealTransaction, setUseRealTransaction] = useState(true);
  const { toast } = useToast();
  const { user } = usePrivy();
  const { wallets } = useWallets();

  const handleSend = async () => {
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

    // 잔고 확인
    const maxBalance = tokenType === "SAMU" ? samuBalance : solBalance;
    if (amountNum > maxBalance) {
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
      // Check if user is authenticated and has wallets
      if (!user) {
        toast({
          title: "로그인 필요",
          description: "송금을 위해서는 먼저 로그인해주세요.",
          variant: "destructive"
        });
        return;
      }

      if (wallets.length === 0) {
        toast({
          title: "지갑 연결 필요",
          description: "송금을 위해서는 지갑 연결이 필요합니다.",
          variant: "destructive"
        });
        return;
      }

      // Get wallet signer for real transactions
      let walletSigner = null;
      
      if (wallets.length > 0) {
        walletSigner = wallets[0]; // Use the first available wallet
        console.log('Using wallet for signing:', walletSigner.address);
      } else {
        toast({
          title: "지갑 연결 오류",
          description: "연결된 지갑이 없습니다. 지갑을 연결해주세요.",
          variant: "destructive"
        });
        return;
      }

      const result = await sendSolanaTokens({
        fromAddress: walletAddress,
        toAddress: recipient,
        amount: amountNum,
        tokenType: tokenType as 'SOL' | 'SAMU',
        walletSigner: walletSigner
      });

      if (result.success) {
        toast({
          title: "송금 완료!",
          description: `${amount} ${tokenType}이(가) 성공적으로 전송되었습니다! 트랜잭션: ${result.txHash?.slice(0, 8)}...`,
        });

        setRecipient("");
        setAmount("");
        setIsOpen(false);
      } else {
        toast({
          title: "송금 실패",
          description: result.error || "알 수 없는 오류가 발생했습니다.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "송금 실패",
        description: "네트워크 오류가 발생했습니다. 다시 시도해주세요.",
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
              variant="destructive"
            >
              {isLoading ? "송금 처리중..." : "송금 실행"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              취소
            </Button>
          </div>

          {/* 주의사항 */}
          <div className="text-xs text-muted-foreground bg-red-900/20 border border-red-600/30 rounded p-3">
            <strong className="text-red-400">⚠️ 실제 송금</strong>
            <div className="mt-1">
              <strong>실제 블록체인에 거래가 기록됩니다!</strong> 토큰이 실제로 이동하며, 되돌릴 수 없습니다.
            </div>
            <div className="mt-2 text-yellow-400">
              • 수신자 주소를 정확히 확인하세요
              <br />• 충분한 가스비(SOL)가 있는지 확인하세요
              <br />• 지갑에서 거래 승인이 필요합니다
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}