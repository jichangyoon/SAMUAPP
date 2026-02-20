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
import { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getSharedConnection } from "@/lib/solana";
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
  
  const connection = getSharedConnection();

  // SAMU token configuration
  const SAMU_MINT = new PublicKey("EHy2UQWKKVWYvMTzbEfYy1jvZD8VhRBUAvz3bnJ1GnuF");

  // Optimized transaction creation (SOL and SAMU token support)
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
        // SAMU token transfer
        const senderATA = await getAssociatedTokenAddress(SAMU_MINT, new PublicKey(wallet.address));
        const recipientATA = await getAssociatedTokenAddress(SAMU_MINT, new PublicKey(recipientAddress));
        
        transaction = new Transaction().add(
          createTransferInstruction(
            senderATA,
            recipientATA,
            new PublicKey(wallet.address),
            amount * Math.pow(10, 8) // SAMU has 8 decimals
          )
        );
      }
      
      // Critical: Manual recentBlockhash and feePayer setup (Privy docs workaround)
      const { blockhash } = await connection.getLatestBlockhash("confirmed");
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = new PublicKey(wallet.address);
      
      return transaction;
    } catch (error) {
        return null;
    }
  };

  // Optimized transfer handler
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
    
    // 1. Get current balance (prepare for Optimistic Update)
    const currentSamuBalance = queryClient.getQueryData(['samu-balance', walletAddress]) as { balance: number } | undefined;
    const currentSolBalance = queryClient.getQueryData(['sol-balance', walletAddress]) as { balance: number } | undefined;
    
    try {
      // 2. Optimistic Update: Immediately deduct transfer amount
      if (tokenType === 'SAMU' && currentSamuBalance) {
        const optimisticBalance = Math.max(0, currentSamuBalance.balance - amountNum);
        queryClient.setQueryData(['samu-balance', walletAddress], {
          balance: optimisticBalance
        });
      } else if (tokenType === 'SOL' && currentSolBalance) {
        const optimisticBalance = Math.max(0, currentSolBalance.balance - amountNum);
        queryClient.setQueryData(['sol-balance', walletAddress], {
          balance: optimisticBalance
        });
      }

      const transaction = await createTransaction(recipient, amountNum, tokenType);
      
      if (!transaction) {
        throw new Error("Failed to create transaction");
      }

      // signTransaction + sendRawTransaction approach (TextDecoder issue workaround)
      const signedTx = await signTransaction({
        transaction,
        connection
      });
      
      const signature = await connection.sendRawTransaction(signedTx.serialize());

      // 3. On success: Re-verify actual balance after 30 seconds
      setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: ['samu-balance', walletAddress]
        });
        queryClient.invalidateQueries({
          queryKey: ['sol-balance', walletAddress]
        });
      }, 30000);

      toast({
        title: "Success!",
        description: `Sent ${amountNum} ${tokenType}`,
        duration: 2000
      });
      
      setRecipient("");
      setAmount("");
      setIsOpen(false);
    } catch (error: any) {
      // 4. On failure: Rollback to original balance
      if (tokenType === 'SAMU' && currentSamuBalance) {
        queryClient.setQueryData(['samu-balance', walletAddress], {
          balance: currentSamuBalance.balance
        });
      } else if (tokenType === 'SOL' && currentSolBalance) {
        queryClient.setQueryData(['sol-balance', walletAddress], {
          balance: currentSolBalance.balance
        });
      }
      
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
        <Button className="w-full bg-[hsl(50,85%,75%)] hover:bg-[hsl(50,85%,70%)] text-black font-medium">
          <Send className="w-4 h-4 mr-2" />
          Send Tokens
        </Button>
      </DrawerTrigger>
      <DrawerContent className="bg-black border-gray-800 max-h-[85dvh]">
        <DrawerHeader>
          <DrawerTitle className="text-[hsl(50,85%,75%)]">Send Tokens</DrawerTitle>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
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
              className="flex-1 bg-[hsl(50,85%,75%)] hover:bg-[hsl(50,85%,70%)] text-black font-medium"
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