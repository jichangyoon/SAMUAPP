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
import { usePrivy } from '@privy-io/react-auth';
import { Connection, Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createTransferInstruction, getAssociatedTokenAddress, getAccount, createAssociatedTokenAccountInstruction } from '@solana/spl-token';

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
  const { ready, authenticated, user } = usePrivy();
  const { sendTransaction } = useSendTransaction();
  
  // Privy 지갑 객체 가져오기 (공식 문서 방식)
  const wallet = user?.linkedAccounts?.find(
    account => account.type === 'wallet' && account.walletClientType === 'privy'
  );

  // SAMU 토큰 민트 주소
  const SAMU_TOKEN_MINT = 'EHy2UQWKKVWYvMTzbEfYy1jvZD8VhRBUAvz3bnJ1GnuF';
  
  // Helius RPC 연결
  const connection = new Connection(
    `https://rpc.helius.xyz/?api-key=${import.meta.env.VITE_HELIUS_API_KEY}`,
    'confirmed'
  );

  // Privy 공식 문서 방식: SOL 전송
  const createSolTransaction = (recipientAddress: string, amountSol: number) => {
    if (!wallet?.address) return null;
    
    return new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(wallet.address), // wallet 객체 직접 사용
        toPubkey: new PublicKey(recipientAddress),
        lamports: amountSol * LAMPORTS_PER_SOL
      })
    );
  };

  const createTokenTransferTransaction = async (recipientAddress: string, amountTokens: number) => {
    const fromPubkey = new PublicKey(walletAddress);
    const toPubkey = new PublicKey(recipientAddress);
    const mintPubkey = new PublicKey(SAMU_TOKEN_MINT);

    // 토큰 계정 주소 계산
    const fromTokenAccount = await getAssociatedTokenAddress(mintPubkey, fromPubkey);
    const toTokenAccount = await getAssociatedTokenAddress(mintPubkey, toPubkey);

    const transaction = new Transaction();

    try {
      // 수신자의 토큰 계정 존재 확인
      await getAccount(connection, toTokenAccount);
    } catch (error) {
      // 토큰 계정이 없으면 생성
      transaction.add(
        createAssociatedTokenAccountInstruction(
          fromPubkey, // payer
          toTokenAccount, // associatedToken
          toPubkey, // owner
          mintPubkey // mint
        )
      );
    }

    // 토큰 전송 instruction 추가 (안전한 amount 처리)
    const decimals = 6; // SAMU 토큰의 decimals
    const transferAmount = Math.floor(amountTokens * Math.pow(10, decimals)); // number로 유지
    
    transaction.add(
      createTransferInstruction(
        fromTokenAccount,
        toTokenAccount,
        fromPubkey,
        transferAmount // Privy가 자동으로 올바른 형식으로 변환
      )
    );

    // Privy가 자동으로 fee payer와 blockhash를 처리합니다
    return transaction;
  };

  const handleSend = async () => {
    // Privy 상태 확인
    if (!ready || !authenticated || !user) {
      toast({
        title: "Wallet Not Ready",
        description: "Please wait for wallet to initialize or log in again",
        variant: "destructive"
      });
      return;
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
      console.log("Starting transaction...", { tokenType, recipient, amountNum, walletAddress });
      
      let transaction;
      
      if (tokenType === "SOL") {
        console.log("Creating SOL transfer transaction...");
        transaction = await createSolTransferTransaction(recipient, amountNum);
      } else {
        console.log("Creating SAMU token transfer transaction...");
        transaction = await createTokenTransferTransaction(recipient, amountNum);
      }

      console.log("Transaction created, sending via Privy...");

      // Privy의 sendTransaction 사용 (문서 권장 설정)
      const receipt = await sendTransaction({
        transaction: transaction,
        connection: connection,
        uiOptions: {
          showWalletUIs: true // 확인 모달 표시
        },
        address: walletAddress // 명시적으로 지갑 주소 지정
      });

      console.log("Transaction successful:", receipt);

      toast({
        title: "Transaction Successful!",
        description: `Sent ${amountNum.toLocaleString()} ${tokenType} to ${recipient.slice(0, 8)}...${recipient.slice(-8)}`,
        duration: 5000
      });
      
      // 성공 후 폼 초기화
      setRecipient("");
      setAmount("");
      setIsOpen(false);
    } catch (error: any) {
      console.error("Transaction error:", error);
      
      let errorMessage = "Please try again";
      if (error?.message?.includes("User exited")) {
        errorMessage = "Transaction was cancelled by user";
      } else if (error?.message?.includes("insufficient")) {
        errorMessage = "Insufficient balance for transaction";
      } else if (error?.message) {
        errorMessage = error.message;
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
            <strong>Note:</strong> Real blockchain transactions will be executed. Double-check recipient address and amount before sending.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}