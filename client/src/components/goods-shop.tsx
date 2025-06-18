import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useWallet } from "@/hooks/use-wallet";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Trophy, Shirt, Coffee, Sticker, X } from "lucide-react";

// Hall of Fame meme-based goods data
const goodsData = [
  {
    id: 1,
    name: "SAMU TO MARS T-Shirt",
    description: "Premium cotton t-shirt featuring the #1 Hall of Fame meme",
    price: 2500,
    currency: "SAMU",
    category: "clothing",
    image: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%23F7DC6F'/%3E%3Crect x='50' y='100' width='300' height='200' rx='20' fill='%23ffffff'/%3E%3Ctext x='200' y='180' text-anchor='middle' font-family='Arial' font-size='24' font-weight='bold' fill='%232C3E50'%3ESAMU TO MARS%3C/text%3E%3Ctext x='200' y='220' text-anchor='middle' font-family='Arial' font-size='14' fill='%238B4513'%3EPremium Cotton T-Shirt%3C/text%3E%3Ccircle cx='100' cy='130' r='15' fill='%23FF8C00'/%3E%3Ccircle cx='300' cy='130' r='15' fill='%23FF8C00'/%3E%3C/svg%3E",
    originalMeme: "SAMU TO MARS",
    originalAuthor: "crypto_legend",
    limited: true,
    stock: 150
  },
  {
    id: 2,
    name: "PACK LEADER Mug",
    description: "Start your morning like the alpha of the pack",
    price: 1200,
    currency: "SAMU",
    category: "lifestyle",
    image: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%238B4513'/%3E%3Cellipse cx='200' cy='250' rx='120' ry='80' fill='%23ffffff'/%3E%3Crect x='320' y='200' width='30' height='60' rx='15' fill='%23ffffff'/%3E%3Ctext x='200' y='230' text-anchor='middle' font-family='Arial' font-size='18' font-weight='bold' fill='%232C3E50'%3EPACK LEADER%3C/text%3E%3Ctext x='200' y='280' text-anchor='middle' font-family='Arial' font-size='12' fill='%238B4513'%3ECeramic Mug%3C/text%3E%3C/svg%3E",
    originalMeme: "PACK LEADER",
    originalAuthor: "wolf_alpha",
    limited: false,
    stock: 500
  },
  {
    id: 3,
    name: "DIAMOND HODLER Sticker Pack",
    description: "Hologram sticker set (5 pieces) - prove your diamond hands",
    price: 800,
    currency: "SAMU",
    category: "accessories",
    image: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%23F7DC6F'/%3E%3Cpolygon points='200,80 260,160 200,240 140,160' fill='%2300BFFF' stroke='%232C3E50' stroke-width='3'/%3E%3Cpolygon points='200,120 230,160 200,200 170,160' fill='%23ffffff' opacity='0.7'/%3E%3Ctext x='200' y='280' text-anchor='middle' font-family='Arial' font-size='18' font-weight='bold' fill='%232C3E50'%3EDIAMOND HODLER%3C/text%3E%3Ctext x='200' y='320' text-anchor='middle' font-family='Arial' font-size='12' fill='%238B4513'%3EHologram Sticker Pack%3C/text%3E%3C/svg%3E",
    originalMeme: "DIAMOND HODLER",
    originalAuthor: "gem_hands",
    limited: true,
    stock: 200
  },
  {
    id: 4,
    name: "SAMU Wolf Hoodie",
    description: "Premium hoodie featuring SAMU logo and wolf graphics",
    price: 4500,
    currency: "SAMU",
    category: "clothing",
    image: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%232C3E50'/%3E%3Crect x='60' y='120' width='280' height='200' rx='30' fill='%23F7DC6F'/%3E%3Ccircle cx='200' cy='180' r='40' fill='%232C3E50'/%3E%3Cpath d='M160 160 L180 140 L200 160 L220 140 L240 160 L220 180 L180 180 Z' fill='%23F7DC6F'/%3E%3Ctext x='200' y='280' text-anchor='middle' font-family='Arial' font-size='16' font-weight='bold' fill='%232C3E50'%3ESAMU WOLF HOODIE%3C/text%3E%3C/svg%3E",
    originalMeme: "Community Design",
    originalAuthor: "SAMU Team",
    limited: false,
    stock: 300
  }
];

export function GoodsShop() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [cart, setCart] = useState<number[]>([]);
  const [selectedItem, setSelectedItem] = useState<typeof goodsData[0] | null>(null);
  const { isConnected, walletAddress, samuBalance } = useWallet();
  const { toast } = useToast();

  const categories = [
    { id: "all", name: "All", icon: ShoppingCart },
    { id: "clothing", name: "Clothing", icon: Shirt },
    { id: "lifestyle", name: "Lifestyle", icon: Coffee },
    { id: "accessories", name: "Accessories", icon: Sticker }
  ];

  const filteredGoods = selectedCategory === "all" 
    ? goodsData 
    : goodsData.filter(item => item.category === selectedCategory);

  const addToCart = (goodsId: number) => {
    if (!isConnected) {
      toast({
        title: "Wallet Connection Required",
        description: "Please connect your wallet to purchase goods.",
        variant: "destructive",
      });
      return;
    }

    const item = goodsData.find(g => g.id === goodsId);
    if (item && samuBalance < item.price) {
      toast({
        title: "Insufficient SAMU Balance",
        description: `${item.price.toLocaleString()} SAMU required.`,
        variant: "destructive",
      });
      return;
    }

    setCart(prev => [...prev, goodsId]);
    toast({
      title: "Added to Cart",
      description: `${item?.name} has been added to your cart.`,
    });
  };

  const removeFromCart = (goodsId: number) => {
    setCart(prev => prev.filter(id => id !== goodsId));
  };

  const getTotalPrice = () => {
    return cart.reduce((total, itemId) => {
      const item = goodsData.find(g => g.id === itemId);
      return total + (item?.price || 0);
    }, 0);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* 굿즈샵 헤더 */}
      <Card className="bg-gradient-to-r from-[hsl(50,85%,75%)] to-[hsl(35,70%,70%)] border-0">
        <CardHeader className="text-center py-3">
          <CardTitle className="text-lg font-bold text-[hsl(201,30%,25%)] flex items-center justify-center gap-2">
            <Trophy className="h-4 w-4" />
            SAMU Goods Shop
          </CardTitle>
          <CardDescription className="text-xs text-[hsl(201,30%,35%)] mt-1">
            Hall of Fame memes turned into goods! Purchase with SAMU tokens
          </CardDescription>
        </CardHeader>
      </Card>

      {/* 장바구니 요약 */}
      {cart.length > 0 && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-green-600" />
                <span className="font-medium text-sm">Cart: {cart.length} items</span>
              </div>
              <div className="text-right">
                <div className="font-bold text-sm text-green-700">{getTotalPrice().toLocaleString()} SAMU</div>
                <Button size="sm" className="mt-1 h-6 text-xs">Checkout</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 카테고리 탭 */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid w-full grid-cols-4 h-10">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <TabsTrigger 
                key={category.id} 
                value={category.id} 
                className="text-xs flex flex-col gap-0.5"
              >
                <Icon className="h-3 w-3" />
                <span className="text-xs">{category.name}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {categories.map((category) => (
          <TabsContent key={category.id} value={category.id} className="mt-2">
            <div className="space-y-2">
              {filteredGoods.map((item) => (
                <Card 
                  key={item.id} 
                  className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="flex p-2">
                    <div className="w-16 h-16 flex-shrink-0">
                      <img 
                        src={item.image} 
                        alt={item.name}
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                    <div className="flex-1 ml-3 min-w-0">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0 pr-2">
                          <h3 className="font-semibold text-xs text-[hsl(201,30%,25%)] truncate">
                            {item.name}
                          </h3>
                          <div className="flex items-center gap-1 mt-1">
                            <Badge variant="secondary" className="text-xs px-1 py-0 h-3 leading-none">
                              <Trophy className="h-2 w-2 mr-0.5" />
                              {item.originalMeme}
                            </Badge>
                            {item.limited && (
                              <Badge variant="destructive" className="text-xs px-1 py-0 h-3 leading-none">
                                Limited
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            By {item.originalAuthor} • Stock: {item.stock}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-bold text-xs text-[hsl(35,70%,50%)]">
                            {item.price.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500 leading-none">SAMU</div>
                          <Button
                            size="sm"
                            className="mt-1 h-5 text-xs px-2 leading-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(item.id);
                            }}
                            disabled={cart.includes(item.id)}
                          >
                            {cart.includes(item.id) ? "Added" : "Add"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* 안내 메시지 */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-3 text-center">
          <p className="text-xs text-blue-700">
            💡 Hall of Fame memes are turned into physical goods.<br />
            Purchase with SAMU tokens and receive real merchandise!
          </p>
        </CardContent>
      </Card>

      {/* 제품 상세 다이얼로그 */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedItem?.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedItem(null)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          {selectedItem && (
            <div className="space-y-4">
              <div className="w-full aspect-square">
                <img 
                  src={selectedItem.image} 
                  alt={selectedItem.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
              
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  {selectedItem.description}
                </p>
                
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-xs">
                    <Trophy className="h-3 w-3 mr-1" />
                    Based on: {selectedItem.originalMeme}
                  </Badge>
                  {selectedItem.limited && (
                    <Badge variant="destructive" className="text-xs">
                      Limited Edition
                    </Badge>
                  )}
                </div>
                
                <div className="text-sm text-gray-500">
                  <div>Original Creator: {selectedItem.originalAuthor}</div>
                  <div>Stock Available: {selectedItem.stock} units</div>
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t">
                  <div>
                    <div className="text-lg font-bold text-[hsl(35,70%,50%)]">
                      {selectedItem.price.toLocaleString()} SAMU
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      addToCart(selectedItem.id);
                      setSelectedItem(null);
                    }}
                    disabled={cart.includes(selectedItem.id)}
                    className="bg-[hsl(50,85%,75%)] hover:bg-[hsl(50,75%,65%)] text-[hsl(201,30%,25%)]"
                  >
                    {cart.includes(selectedItem.id) ? "Already Added" : "Add to Cart"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}