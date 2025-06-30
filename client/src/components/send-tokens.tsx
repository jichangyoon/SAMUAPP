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

      console.log('Creating transaction with backend API...');
      
      // Step 1: 백엔드에서 트랜잭션 생성
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
      console.log('Response status:', response.status, response.ok);
      console.log('Result success field:', result.success);
      
      if (!response.ok) {
        console.error('HTTP error:', response.status, result);
        throw new Error(result.error || `HTTP ${response.status} error`);
      }
      
      if (!result.success) {
        console.error('Backend returned success=false:', result);
        throw new Error(result.error || 'Transaction failed');
      }
      
      // Step 2: 백엔드에서 받은 트랜잭션을 Privy로 전송
      console.log('Sending transaction with Privy useSendTransaction...');
      
      // Base64 트랜잭션을 Transaction 객체로 변환 (백엔드에서 준비된 상태)
      const { Transaction, Connection } = await import('@solana/web3.js');
      const connection = new Connection('https://rpc.ankr.com/solana', 'confirmed');
      const transactionBuffer = Buffer.from(result.transactionBase64, 'base64');
      const transaction = Transaction.from(transactionBuffer);
      
      console.log('Transaction ready from backend (blockhash already set)');
      console.log('Wallet address for signing:', walletAddress);
      console.log('Transaction details:', {
        instructions: transaction.instructions.length,
        signatures: transaction.signatures.length,
        recentBlockhash: transaction.recentBlockhash
      });
      
      // Privy useSendTransaction으로 실제 전송
      console.log('Calling sendTransaction with params:', {
        hasTransaction: !!transaction,
        hasConnection: !!connection,
        address: walletAddress,
        connectionEndpoint: connection.rpcEndpoint
      });
      
      const receipt = await sendTransaction({
        transaction: transaction,
        connection: connection,
        address: walletAddress,
        uiOptions: {
          showWalletUIs: true
        }
      });
      
      console.log('Transaction sent successfully:', receipt);
      
      toast({
        title: "Transaction Successful!",
        description: `Sent ${amountNum} ${tokenType} to ${recipient.slice(0, 8)}...${recipient.slice(-8)}. Signature: ${receipt.signature.slice(0, 8)}...`,
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