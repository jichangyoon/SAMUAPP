import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePrivy } from "@privy-io/react-auth";
import { useSendTransaction, useWallets } from "@privy-io/react-auth/solana";

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
      // Privy useSendTransaction - 프론트엔드에서 직접 트랜잭션 생성
      console.log('Creating transaction directly in frontend for Privy...');
      
      // Dynamic import to use Buffer polyfill
      const { 
        Connection, 
        PublicKey, 
        SystemProgram, 
        Transaction,
        LAMPORTS_PER_SOL 
      } = await import('@solana/web3.js');
      
      const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
      
      // 트랜잭션 직접 생성
      const fromPubkey = new PublicKey(walletAddress);
      const toPubkey = new PublicKey(recipient);
      
      let instruction;
      if (tokenType === 'SOL') {
        // SOL 전송
        const lamports = Math.floor(amountNum * LAMPORTS_PER_SOL);
        instruction = SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports
        });
      } else {
        // SAMU 토큰 전송 (SPL 토큰)
        const { 
          createTransferInstruction, 
          getAssociatedTokenAddress, 
          TOKEN_PROGRAM_ID 
        } = await import('@solana/spl-token');
        
        const SAMU_TOKEN_MINT = 'EHy2UQWKKVWYvMTzbEfYy1jvZD8VhRBUAvz3bnJ1GnuF';
        const mintPubkey = new PublicKey(SAMU_TOKEN_MINT);
        
        const fromTokenAccount = await getAssociatedTokenAddress(mintPubkey, fromPubkey);
        const toTokenAccount = await getAssociatedTokenAddress(mintPubkey, toPubkey);
        
        const tokenAmount = Math.floor(amountNum * Math.pow(10, 6)); // SAMU has 6 decimals
        
        instruction = createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          fromPubkey,
          tokenAmount,
          [],
          TOKEN_PROGRAM_ID
        );
      }
      
      // 트랜잭션 생성
      const transaction = new Transaction().add(instruction);
      
      console.log('Sending transaction with Privy useSendTransaction...');
      console.log('Wallet address:', walletAddress);
      console.log('User ID:', user?.id);
      console.log('Available wallets:', wallets);
      console.log('User linked accounts:', user?.linkedAccounts);
      
      // 지갑 상태 확인
      const solanaWallet = wallets.find(w => w.chainType === 'solana');
      if (!solanaWallet) {
        throw new Error('No Solana wallet found. Please connect a Solana wallet first.');
      }
      
      console.log('Using Solana wallet:', solanaWallet);
      
      // Privy useSendTransaction으로 전송 (문서에 따른 올바른 방식)
      const receipt = await sendTransaction({
        transaction: transaction,
        connection: connection,
        uiOptions: {
          showWalletUIs: true
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