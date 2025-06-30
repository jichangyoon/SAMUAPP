import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useSendTransaction, useSignTransaction } from '@privy-io/react-auth/solana';
import { usePrivy } from '@privy-io/react-auth';
import { Connection } from '@solana/web3.js';

interface SendTokensProps {
  walletAddress: string;
  samuBalance: number;
  solBalance: number;
  chainType: string;
}

export function SendTokens({ walletAddress, samuBalance, solBalance, chainType }: SendTokensProps) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [tokenType, setTokenType] = useState<'SOL' | 'SAMU'>('SOL');
  const [isLoading, setIsLoading] = useState(false);
  
  const { toast } = useToast();
  const { sendTransaction } = useSendTransaction();
  const { signTransaction } = useSignTransaction();
  const { user } = usePrivy();

  const validateSolanaAddress = (address: string): boolean => {
    try {
      // Basic Solana address validation
      if (address.length < 32 || address.length > 44) return false;
      if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(address)) return false;
      return true;
    } catch {
      return false;
    }
  };

  const handleSend = async () => {
    if (!recipient || !amount) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    if (!validateSolanaAddress(recipient)) {
      toast({
        title: "Invalid Address",
        description: "Please enter a valid Solana wallet address",
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

    // Balance check
    const maxBalance = tokenType === 'SOL' ? solBalance : samuBalance;
    if (amountNum > maxBalance) {
      toast({
        title: "Insufficient Balance",
        description: `You don't have enough ${tokenType} tokens`,
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      console.log('Creating transaction on frontend with Privy useSendTransaction...');
      
      const { Transaction, SystemProgram, PublicKey, Connection } = await import('@solana/web3.js');
      const connection = new Connection('https://rpc.ankr.com/solana', 'confirmed');
      
      // 새로운 트랜잭션 생성
      const transaction = new Transaction();
      
      if (tokenType === 'SOL') {
        // SOL 전송
        const instruction = SystemProgram.transfer({
          fromPubkey: new PublicKey(walletAddress),
          toPubkey: new PublicKey(recipient),
          lamports: amountNum * 1000000000 // SOL to lamports
        });
        transaction.add(instruction);
      } else {
        // SAMU 토큰 전송 (SPL Token)
        const { createTransferInstruction, getAssociatedTokenAddress } = await import('@solana/spl-token');
        
        const mintPublicKey = new PublicKey('EHy2UQWKKVWYvMTzbEfYy1jvZD8VhRBUAvz3bnJ1GnuF'); // SAMU
        const fromTokenAccount = await getAssociatedTokenAddress(mintPublicKey, new PublicKey(walletAddress));
        const toTokenAccount = await getAssociatedTokenAddress(mintPublicKey, new PublicKey(recipient));
        
        const instruction = createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          new PublicKey(walletAddress),
          amountNum * Math.pow(10, 6) // SAMU has 6 decimals
        );
        transaction.add(instruction);
      }
      
      console.log('Transaction created on frontend:', {
        instructions: transaction.instructions.length,
        tokenType,
        amount: amountNum
      });
      
      // Method 1: Privy useSendTransaction (올바른 매개변수 형식)
      let receipt;
      try {
        console.log('Trying Method 1: useSendTransaction...');
        receipt = await sendTransaction(transaction);
      } catch (sendError) {
        console.log('Method 1 failed, trying Method 2: signTransaction + RPC...');
        
        // Method 2: signTransaction + 직접 RPC 전송
        const signedTx = await signTransaction(transaction);
        console.log('Transaction signed successfully');
        
        // 직접 RPC로 전송
        const connection = new Connection('https://solana-mainnet.g.alchemy.com/v2/demo');
        const txId = await connection.sendRawTransaction(signedTx.serialize());
        console.log('Transaction sent via RPC:', txId);
        
        receipt = { signature: txId };
      }
      
      console.log('Transaction sent successfully:', receipt);
      
      toast({
        title: "Transaction Successful!",
        description: `Sent ${amountNum} ${tokenType} to ${recipient.slice(0, 8)}...${recipient.slice(-8)}. Signature: ${receipt.signature.slice(0, 8)}...`,
        duration: 5000
      });
      
      // Reset form
      setRecipient('');
      setAmount('');
      
    } catch (error: any) {
      console.error('Transaction error:', error);
      console.error('Error details:', {
        message: error?.message,
        cause: error?.cause,
        stack: error?.stack,
        name: error?.name,
        type: typeof error,
        keys: Object.keys(error || {})
      });
      toast({
        title: "Transaction Failed", 
        description: error?.message || "User exited before wallet could be connected",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-md mx-auto p-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-white mb-2">Send Tokens</h3>
        <div className="text-sm text-gray-400">
          <div>SOL Balance: {solBalance.toFixed(4)}</div>
          <div>SAMU Balance: {samuBalance.toLocaleString()}</div>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="tokenType" className="text-white">Token Type</Label>
          <Select value={tokenType} onValueChange={(value: 'SOL' | 'SAMU') => setTokenType(value)}>
            <SelectTrigger className="bg-gray-800 border-gray-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SOL">SOL</SelectItem>
              <SelectItem value="SAMU">SAMU</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="recipient" className="text-white">Recipient Address</Label>
          <Input
            id="recipient"
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Enter Solana wallet address"
            className="bg-gray-800 border-gray-700 text-white"
          />
        </div>

        <div>
          <Label htmlFor="amount" className="text-white">Amount</Label>
          <Input
            id="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            step="0.000001"
            className="bg-gray-800 border-gray-700 text-white"
          />
          <div className="text-xs text-gray-500 mt-1">
            Max: {tokenType === 'SOL' ? solBalance.toFixed(4) : samuBalance.toLocaleString()} {tokenType}
          </div>
        </div>

        <Button 
          onClick={handleSend} 
          disabled={isLoading || !recipient || !amount}
          className="w-full bg-yellow-600 hover:bg-yellow-700 text-black font-medium"
        >
          {isLoading ? 'Sending...' : `Send ${tokenType}`}
        </Button>
      </div>

      <div className="text-xs text-gray-500 text-center mt-4">
        <div>From Wallet:</div>
        <div className="font-mono">{walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}</div>
      </div>
    </div>
  );
}