import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePrivy } from "@privy-io/react-auth";

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

  const handleSend = async () => {
    if (!recipient || !amount) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    if (!user) {
      toast({
        title: "Error", 
        description: "Please login first",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error('Invalid amount');
      }

      // Validate recipient address
      const { PublicKey } = await import('@solana/web3.js');
      try {
        new PublicKey(recipient);
      } catch (error) {
        throw new Error('Invalid recipient address');
      }

      console.log('Using backend API for secure token transfer...');
      
      // 백엔드 API를 통한 검증된 토큰 전송
      const response = await fetch('/api/transactions/create-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromAddress: walletAddress,
          toAddress: recipient,
          amount: amountNum,
          tokenType: tokenType,
          privyUserId: user?.id
        })
      });
      
      const result = await response.json();
      console.log('Backend API response:', result);
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Transaction failed');
      }
      
      toast({
        title: "Transaction Ready!",
        description: `${result.message} - Ready for Privy signing`,
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
        description: error.message || "Failed to send transaction. Please try again.",
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
        <Button variant="outline" size="sm" className="bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
          <Send className="h-4 w-4 mr-2" />
          Send Tokens
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-black border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-yellow-400 flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Send Tokens
          </DialogTitle>
        </DialogHeader>
        
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-white">Transfer {tokenType}</CardTitle>
            <CardDescription className="text-gray-400">
              Send {tokenType} tokens to another wallet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Token Type Selection */}
            <div className="space-y-2">
              <Label className="text-white">Token Type</Label>
              <Select value={tokenType} onValueChange={setTokenType}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="SAMU">SAMU (Balance: {samuBalance.toLocaleString()})</SelectItem>
                  <SelectItem value="SOL">SOL (Balance: {solBalance.toFixed(4)})</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Recipient Address */}
            <div className="space-y-2">
              <Label className="text-white">Recipient Address</Label>
              <Input
                placeholder="Enter Solana wallet address..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label className="text-white">Amount</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>

            {/* Wallet Info */}
            <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
              <div className="text-sm text-gray-400">From Wallet:</div>
              <div className="text-sm text-white font-mono">{walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}</div>
            </div>

            {/* Send Button */}
            <Button 
              onClick={handleSend} 
              disabled={isLoading || !recipient || !amount}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
            >
              {isLoading ? "Sending..." : `Send ${tokenType}`}
            </Button>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}