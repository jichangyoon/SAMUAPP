import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSendTransaction, useSolanaWallets, useSignTransaction } from '@privy-io/react-auth/solana';
import { usePrivy } from '@privy-io/react-auth';
import { useQueryClient } from "@tanstack/react-query";
import { Connection, Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createTransferInstruction, getAssociatedTokenAddress } from '@solana/spl-token';

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
  const [tokenType, setTokenType] = useState("SOL");
  const { toast } = useToast();
  const queryClient = useQueryClient();


  const { signTransaction } = useSignTransaction();
  const { wallets, ready } = useSolanaWallets();
  
  // Helius RPC 연결 (PrivyProvider와 동일)
  const connection = new Connection(
    `https://rpc.helius.xyz/?api-key=${import.meta.env.VITE_HELIUS_API_KEY}`,
    'confirmed'
  );

  // SAMU 토큰 정보
  const SAMU_MINT = new PublicKey("EHy2UQWKKVWYvMTzbEfYy1jvZD8VhRBUAvz3bnJ1GnuF");

  // 최적화된 트랜잭션 생성 (SOL 및 SAMU 토큰 지원)
  const createTransaction = async (recipientAddress: string, amount: number, type: string) => {
    if (!ready) return null;
    
    const wallet = wallets.find(w => w.address === walletAddress);
    if (!wallet) return null;
    
    try {
      let transaction: Transaction;
      
      if (type === "SOL") {
        // SOL 전송
        transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: new PublicKey(wallet.address),
            toPubkey: new PublicKey(recipientAddress),
            lamports: amount * LAMPORTS_PER_SOL
          })
        );
      } else {
        // SAMU 토큰 전송
        const senderATA = await getAssociatedTokenAddress(SAMU_MINT, new PublicKey(wallet.address));
        const recipientATA = await getAssociatedTokenAddress(SAMU_MINT, new PublicKey(recipientAddress));
        
        transaction = new Transaction().add(
          createTransferInstruction(
            senderATA,
            recipientATA,
            new PublicKey(wallet.address),
            amount * Math.pow(10, 9) // SAMU has 9 decimals
          )
        );
      }
      
      // 핵심: recentBlockhash와 feePayer 수동 설정 (Privy 문서 오류 우회)
      const { blockhash } = await connection.getLatestBlockhash("confirmed");
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = new PublicKey(wallet.address);
      
      return transaction;
    } catch (error) {
      console.error("Transaction creation failed:", error);
      return null;
    }
  };

  // 최적화된 전송 핸들러
  const handleSend = async () => {
    if (!walletAddress || !recipient || !amount) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    const amountNum = parseFloat(amount);
    
    try {
      const transaction = await createTransaction(recipient, amountNum, tokenType);
      
      if (!transaction) {
        throw new Error("Failed to create transaction");
      }

      // signTransaction + sendRawTransaction 방식 (TextDecoder 문제 우회)
      const signedTx = await signTransaction({
        transaction,
        connection
      });
      
      const signature = await connection.sendRawTransaction(signedTx.serialize());

      // 즉시 밸런스 캐시 무효화 (토큰 전송 후 갱신)
      await queryClient.invalidateQueries({
        queryKey: ['samu-balance', walletAddress]
      });
      await queryClient.invalidateQueries({
        queryKey: ['sol-balance', walletAddress]
      });

      toast({
        title: "Success!",
        description: `Sent ${amountNum} ${tokenType}`,
        duration: 2000
      });
      
      setRecipient("");
      setAmount("");
      setIsOpen(false);
    } catch (error: any) {
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
            <Label htmlFor="tokenType" className="text-gray-300">Token Type</Label>
            <Select value={tokenType} onValueChange={setTokenType}>
              <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                <SelectItem value="SOL" className="text-white">SOL</SelectItem>
                <SelectItem value="SAMU" className="text-white">SAMU</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
              step={tokenType === "SOL" ? "0.001" : "1"}
              placeholder={tokenType === "SOL" ? "0.01" : "100"}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-gray-900 border-gray-700 text-white"
            />
            <p className="text-sm text-gray-400">
              Available: {tokenType === "SOL" ? `${solBalance.toFixed(4)} SOL` : `${samuBalance.toLocaleString()} SAMU`}
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              onClick={handleSend}
              className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-black font-medium"
            >
              Send {tokenType}
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