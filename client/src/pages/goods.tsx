import React from "react";
import { GoodsShop } from "@/components/goods-shop";
import { WalletConnect } from "@/components/wallet-connect";
import { ShoppingBag } from "lucide-react";

export default function Goods() {
  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black border-b border-gray-800">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <ShoppingBag className="w-6 h-6 text-yellow-400" />
            <h1 className="text-xl font-bold">굿즈샵</h1>
          </div>
          <WalletConnect />
        </div>
      </div>

      {/* Main Content */}
      <div className="pb-4">
        <GoodsShop />
      </div>
    </div>
  );
}