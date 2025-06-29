import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSendTransaction } from '@privy-io/react-auth/solana';
import { Connection, Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

interface SendTokensProps {
  walletAddress: string;
  solBalance: number;
  samuBalance: number;
  onClose: () => void;
}

export function SendTokensSimple({ walletAddress, solBalance, samuBalance, onClose }: SendTokensProps) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [tokenType, setTokenType] = useState<"SOL" | "SAMU">("SOL");
  const [isLoading, setIsLoading] = useState(false);
  
  const { toast } = useToast();
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
        description: "Please enter a valid positive amount",
        variant: "destructive"
      });
      return;
    }

    // 지갑 주소 유효성 검사
    try {
      new PublicKey(recipient);
    } catch {
      toast({
        title: "Invalid Address",
        description: "Please enter a valid Solana wallet address",
        variant: "destructive"
      });
      return;
    }

    // 잔고 확인
    const maxBalance = tokenType === "SAMU" ? samuBalance : solBalance;
    const estimatedFee = tokenType === "SOL" ? 0.000005 : 0; // 실제 솔라나 수수료
    
    if (tokenType === "SOL" && (amountNum + estimatedFee) > maxBalance) {
      toast({
        title: "Insufficient Balance",
        description: `Need at least ${(amountNum + estimatedFee).toFixed(6)} SOL (including fees)`,
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

    setIsLoading(true);

    try {
      const fromPubkey = new PublicKey(walletAddress);
      const toPubkey = new PublicKey(recipient);

      if (tokenType === "SOL") {
        console.log("SOL 전송 시작:", { amount: amountNum });
        
        // 간단한 SOL 전송 트랜잭션 생성
        const transaction = new Transaction();
        transaction.add(
          SystemProgram.transfer({
            fromPubkey,
            toPubkey,
            lamports: Math.floor(amountNum * LAMPORTS_PER_SOL)
          })
        );

        console.log("서버 프록시를 통해 블록해시 가져오는 중...");
        
        // 서버 프록시를 통한 블록해시 획득
        const blockHashResponse = await fetch('/api/solana-rpc', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            method: 'getLatestBlockhash',
            params: ['confirmed']
          })
        });

        if (!blockHashResponse.ok) {
          throw new Error(`서버 프록시 연결 실패: ${blockHashResponse.status}`);
        }

        const blockHashData = await blockHashResponse.json();
        if (blockHashData.error) {
          throw new Error(`RPC 에러: ${blockHashData.error.message}`);
        }

        const blockhash = blockHashData.result.blockhash;
        console.log("서버 프록시로 블록해시 획득:", blockhash);
        
        // 트랜잭션에 블록해시와 수수료 지불자 설정
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPubkey;
        
        console.log("트랜잭션 준비 완료:", {
          blockhash: transaction.recentBlockhash,
          feePayer: transaction.feePayer.toString(),
          instructions: transaction.instructions.length
        });
        
        // 더미 Connection (Privy가 실제 전송을 처리)
        const dummyConnection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
        
        console.log("Privy로 전송 중...");
        
        const receipt = await sendTransaction({
          transaction,
          connection: dummyConnection,
          uiOptions: {
            showWalletUIs: true
          }
        });

        toast({
          title: "Transaction Successful!",
          description: `Sent ${amount} SOL to ${recipient.slice(0, 8)}...`,
        });

        console.log("Transaction signature:", receipt.signature);
        onClose();
        
      } else {
        toast({
          title: "SAMU Transfer",
          description: "SAMU token transfers coming soon!",
        });
      }

    } catch (error: any) {
      console.error("Transaction error:", error);
      console.error("Error details:", {
        message: error?.message,
        code: error?.code,
        stack: error?.stack,
        cause: error?.cause
      });
      
      let errorMessage = "Transaction failed. Please try again.";
      if (error?.message?.includes('User') || error?.message?.includes('cancelled')) {
        errorMessage = "Transaction cancelled by user";
      } else if (error?.message?.includes('insufficient')) {
        errorMessage = "Insufficient balance for transaction";
      } else if (error?.message?.includes('blockhash')) {
        errorMessage = "Network error - please try again";
      } else if (error?.message?.includes('Connection')) {
        errorMessage = "Connection error - check network";
      } else if (error?.code) {
        errorMessage = `Error ${error.code}: ${error.message}`;
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
    <div className="send-tokens-form space-y-4">
      <div className="space-y-2">
        <Label htmlFor="tokenType">Token Type</Label>
        <Select value={tokenType} onValueChange={(value: "SOL" | "SAMU") => setTokenType(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SOL">SOL (Balance: {solBalance.toFixed(4)})</SelectItem>
            <SelectItem value="SAMU">SAMU (Balance: {samuBalance.toLocaleString()})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="recipient">Recipient Address</Label>
        <Input
          id="recipient"
          placeholder="Enter Solana wallet address"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Amount</Label>
        <div className="flex items-center space-x-2">
          <Input
            id="amount"
            type="number"
            step="0.000001"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1"
          />
          <span className="text-sm text-gray-400">{tokenType}</span>
        </div>
        <p className="text-sm text-gray-500">
          Available: {tokenType === "SOL" ? `${solBalance.toFixed(4)} SOL` : `${samuBalance.toLocaleString()} SAMU`}
        </p>
      </div>

      <div className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded mb-3">
        <strong>Active:</strong> Real SOL transfers are now enabled on Solana mainnet. 
        SAMU token transfers coming soon. Double-check recipient address before sending.
      </div>

      {/* 키보드가 가리지 않도록 고정된 버튼 */}
      <div className="send-tokens-buttons flex gap-3">
        <Button 
          onClick={handleSend} 
          disabled={isLoading}
          className="flex-1"
        >
          {isLoading ? "Sending..." : "Send Tokens"}
        </Button>
        <Button variant="outline" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
      </div>
    </div>
  );
}