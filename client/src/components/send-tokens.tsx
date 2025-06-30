import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePrivy } from "@privy-io/react-auth";
import { useSendTransaction } from "@privy-io/react-auth/solana";

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
  const { user } = usePrivy();
  const { sendTransaction } = useSendTransaction();

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

    // Solana 주소 검증 (간단한 길이 체크)
    if (chainType === 'solana' && (recipient.length < 32 || recipient.length > 44)) {
      toast({
        title: "Invalid Address",
        description: "Please enter a valid Solana address",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Privy useSendTransaction 사용 - 백엔드에서 트랜잭션 생성
      console.log('Creating transaction using backend API for Privy sendTransaction...');
      
      // 백엔드 API로 트랜잭션 생성 요청
      const transactionResponse = await fetch('/api/transactions/create-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromAddress: walletAddress,
          toAddress: recipient,
          amount: amountNum,
          tokenType: tokenType,
          privyUserId: user?.id
        })
      });

      if (!transactionResponse.ok) {
        throw new Error('Failed to create transaction');
      }

      const { transactionBase64 } = await transactionResponse.json();
      
      // Base64 트랜잭션을 Uint8Array로 변환
      const transactionBytes = Uint8Array.from(atob(transactionBase64), c => c.charCodeAt(0));
      
      // Privy useSendTransaction으로 전송
      const receipt = await sendTransaction({
        transactionBytes,
        options: {
          skipPreflight: false
        }
      });

      console.log('Transaction sent successfully:', receipt);
      
      toast({
        title: "Transaction Successful!",
        description: `Sent ${amountNum.toLocaleString()} ${tokenType} to ${recipient.slice(0, 8)}...${recipient.slice(-8)}. Signature: ${receipt.signature.slice(0, 8)}...`,
        duration: 5000
      });
      
      // 성공 후 폼 초기화
      setRecipient("");
      setAmount("");
      setIsOpen(false);
      
    } catch (error: any) {
      console.error('Transaction error:', error);
      toast({
        title: "Transaction Failed",
        description: error?.message || "Please try again",
        variant: "destructive",
        duration: 5000
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
            <strong>Note:</strong> This is currently a UI prototype. Actual token transfers will be implemented with Solana Web3.js integration.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}