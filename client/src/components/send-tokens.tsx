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
    'https://api.mainnet-beta.solana.com',
    'https://rpc.ankr.com/solana',
    'https://solana-api.projectserum.com'
  ];
  
  const getConnection = () => {
    // 첫 번째 엔드포인트 사용 (향후 폴백 로직 추가 가능)
    return new Connection(RPC_ENDPOINTS[0]);
  };

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

    // 잔고 확인 (SOL의 경우 거래 수수료 고려)
    const maxBalance = tokenType === "SAMU" ? samuBalance : solBalance;
    const minRequiredForSol = tokenType === "SOL" ? 0.001 : 0; // SOL 거래 시 최소 0.001 SOL 수수료 보장
    
    if (tokenType === "SOL" && (amountNum + minRequiredForSol) > maxBalance) {
      toast({
        title: "Insufficient Balance",
        description: `Need at least ${(amountNum + minRequiredForSol).toFixed(4)} SOL (including fees)`,
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
        
        // 최근 블록해시 가져오기
        const connection = getConnection();
        const { blockhash } = await connection.getLatestBlockhash();
        
        const transaction = new Transaction({
          recentBlockhash: blockhash,
          feePayer: fromPubkey
        });
        
        transaction.add(
          SystemProgram.transfer({
            fromPubkey,
            toPubkey,
            lamports: Math.floor(lamports)
          })
        );

        // 실제 트랜잭션 전송
        const receipt = await sendTransaction({
          transaction,
          connection
        });

        toast({
          title: "Transaction Successful!",
          description: `Sent ${amount} SOL to ${recipient.slice(0, 8)}...`,
        });

        console.log("Transaction signature:", receipt.signature);
        
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