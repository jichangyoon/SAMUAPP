import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SendSolProps {
  walletAddress: string;
  solBalance: number;
  onClose: () => void;
}

function SendSolSimple({ walletAddress, solBalance, onClose }: SendSolProps) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { toast } = useToast();

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

    // 지갑 주소 유효성 검사 (기본 체크)
    if (recipient.length < 32 || recipient.length > 44) {
      toast({
        title: "Invalid Address",
        description: "Please enter a valid Solana wallet address",
        variant: "destructive"
      });
      return;
    }

    // 잔고 확인
    const estimatedFee = 0.000005; // 솔라나 수수료
    if ((amountNum + estimatedFee) > solBalance) {
      toast({
        title: "Insufficient Balance",
        description: `Need at least ${(amountNum + estimatedFee).toFixed(6)} SOL (including fees)`,
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log("SOL 전송 시도:", { from: walletAddress, to: recipient, amount: amountNum });
      
      // 간단한 알림만 표시 (실제 전송 기능은 추후 구현)
      toast({
        title: "SOL Transfer Feature",
        description: "SOL transfer functionality will be available soon. Currently in development for mainnet.",
      });

    } catch (error: any) {
      console.error("전송 실패:", error);
      
      let errorMessage = "Transaction failed. Please try again.";
      if (error?.message?.includes('User') || error?.message?.includes('cancelled')) {
        errorMessage = "Transaction cancelled by user";
      } else if (error?.message?.includes('insufficient')) {
        errorMessage = "Insufficient balance for transaction";
      } else if (error?.message?.includes('Invalid')) {
        errorMessage = "Invalid address or amount";
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
        <Label htmlFor="recipient">Recipient Address</Label>
        <Input
          id="recipient"
          placeholder="Enter Solana wallet address"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Amount (SOL)</Label>
        <Input
          id="amount"
          type="number"
          step="0.000001"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <p className="text-sm text-gray-500">
          Available: {solBalance.toFixed(4)} SOL
        </p>
      </div>

      <div className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded mb-3">
        <strong>Note:</strong> SOL transfers work best with Phantom wallet. 
        Make sure you have enough SOL for transaction fees (~0.000005 SOL).
      </div>

      <div className="send-tokens-buttons flex gap-3">
        <Button 
          onClick={handleSend} 
          disabled={isLoading}
          className="flex-1"
        >
          {isLoading ? "Sending..." : "Send SOL"}
        </Button>
        <Button variant="outline" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default SendSolSimple;