import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSendTransaction, useSolanaWallets } from '@privy-io/react-auth/solana';
import { usePrivy } from '@privy-io/react-auth';
import { Connection, Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

interface SendTokensProps {
  walletAddress: string;
  samuBalance: number;
  solBalance: number;
  chainType: string;
}

export function SendTokensSimple({ walletAddress, samuBalance, solBalance, chainType }: SendTokensProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const { toast } = useToast();
  const { user } = usePrivy();
  const { sendTransaction } = useSendTransaction();
  const { wallets } = useSolanaWallets();
  
  // Privy 공식 문서 방식: Connection 생성 - 안정적인 무료 RPC 사용
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

  // Privy 공식 문서 방식: SOL 전송 트랜잭션
  const createSolTransaction = (recipientAddress: string, amountSol: number) => {
    // Privy 문서 방식: 실제 wallet 객체에서 publicKey 사용
    const wallet = wallets.find(w => w.address === walletAddress);
    if (!wallet || !wallet.publicKey) return null;
    
    return new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey, // wallet 객체에서 직접 publicKey 사용
        toPubkey: new PublicKey(recipientAddress),
        lamports: amountSol * LAMPORTS_PER_SOL
      })
    );
  };

  // Privy 공식 문서 방식: 전송 핸들러
  const handleSend = async () => {
    console.log("Debug values:", { walletAddress, recipient, amount, user: !!user });
    
    if (!walletAddress || !recipient || !amount) {
      toast({
        title: "Error",
        description: `Missing: ${!walletAddress ? 'wallet ' : ''}${!recipient ? 'recipient ' : ''}${!amount ? 'amount' : ''}`,
        variant: "destructive"
      });
      return;
    }

    const amountNum = parseFloat(amount);
    
    try {
      // SOL 전송 트랜잭션 생성
      const transaction = createSolTransaction(recipient, amountNum);
      
      if (!transaction) {
        throw new Error("Failed to create transaction");
      }

      // Privy 공식 문서 방식: recentBlockhash는 Privy가 자동 처리
      await sendTransaction({
        transaction,
        connection
      });

      toast({
        title: "Success!",
        description: `Sent ${amountNum} SOL`,
        duration: 3000
      });
      
      setRecipient("");
      setAmount("");
      setIsOpen(false);
    } catch (error: any) {
      console.error("Transaction error:", error);
      toast({
        title: "Transaction Failed",
        description: error.message || "Unknown error occurred",
        variant: "destructive"
      });
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <Button className="w-full bg-yellow-600 hover:bg-yellow-700 text-black font-medium">
          <Send className="w-4 h-4 mr-2" />
          Send Tokens
        </Button>
      </DrawerTrigger>
      <DrawerContent className="bg-black border-gray-800">
        <DrawerHeader>
          <DrawerTitle className="text-yellow-400">Send Tokens</DrawerTitle>
        </DrawerHeader>
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipient" className="text-gray-300">Recipient Address</Label>
            <Input
              id="recipient"
              placeholder="Enter Solana address"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="bg-gray-900 border-gray-700 text-white"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-gray-300">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.001"
              placeholder="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-gray-900 border-gray-700 text-white"
            />
            <p className="text-sm text-gray-400">Available: {solBalance.toFixed(4)} SOL</p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              onClick={handleSend}
              className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-black font-medium"
            >
              Send SOL
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}