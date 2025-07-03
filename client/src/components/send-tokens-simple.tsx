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
  const { signTransaction } = useSignTransaction();
  const { wallets, ready } = useSolanaWallets();
  
  // Privy 공식 문서 방식: Connection 생성 - Helius RPC 사용 (PrivyProvider와 동일)
  const connection = new Connection(
    `https://rpc.helius.xyz/?api-key=${import.meta.env.VITE_HELIUS_API_KEY}`,
    'confirmed'
  );

  // Privy 공식 문서 방식 + recentBlockhash 수동 설정: SOL 전송 트랜잭션
  const createSolTransaction = async (recipientAddress: string, amountSol: number) => {
    console.log("=== 디버깅 시작 ===");
    console.log("ready 상태:", ready);
    console.log("wallets 배열:", wallets);
    console.log("wallets 개수:", wallets.length);
    console.log("찾고 있는 walletAddress:", walletAddress);
    
    // Privy 공식 문서: ready가 true일 때만 실행
    if (!ready) {
      console.log("❌ wallets가 아직 준비되지 않음 (ready: false)");
      return null;
    }
    
    // Privy 공식 문서 방식: wallet 객체에서 publicKey 사용  
    const wallet = wallets.find(w => w.address === walletAddress);
    console.log("찾은 wallet:", wallet);
    
    if (!wallet) {
      console.log("❌ wallet을 찾을 수 없음");
      return null;
    }
    
    console.log("✅ wallet 찾음, 트랜잭션 생성");
    
    try {
      // 트랜잭션 생성
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(wallet.address),
          toPubkey: new PublicKey(recipientAddress),
          lamports: amountSol * LAMPORTS_PER_SOL
        })
      );
      
      // 핵심 수정: recentBlockhash와 feePayer 수동 설정
      console.log("🔧 recentBlockhash 가져오는 중...");
      const { blockhash } = await connection.getLatestBlockhash("confirmed");
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = new PublicKey(wallet.address);
      console.log("✅ recentBlockhash 설정 완료:", blockhash);
      console.log("=== 디버깅 끝 ===");
      
      return transaction;
    } catch (error) {
      console.error("❌ 트랜잭션 생성 실패:", error);
      return null;
    }
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
      // SOL 전송 트랜잭션 생성 (async 함수로 변경)
      const transaction = await createSolTransaction(recipient, amountNum);
      
      if (!transaction) {
        throw new Error("Failed to create transaction");
      }

      // 개선된 방식: signTransaction 후 직접 전송으로 TextDecoder 문제 우회
      console.log("🔧 트랜잭션 서명 중...");
      const signedTx = await signTransaction({
        transaction,
        connection
      });
      
      console.log("✅ 트랜잭션 서명 완료");
      console.log("🚀 트랜잭션 전송 중...");
      
      // 서명된 트랜잭션을 직접 전송
      const signature = await connection.sendRawTransaction(signedTx.serialize());
      console.log("✅ 트랜잭션 전송 완료:", signature);

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