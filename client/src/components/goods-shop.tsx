import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWallet } from "@/hooks/use-wallet";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Star, Trophy, Shirt, Coffee, Sticker } from "lucide-react";

// 명예의 전당 밈을 기반으로 한 굿즈 데이터
const goodsData = [
  {
    id: 1,
    name: "SAMU TO MARS 티셔츠",
    description: "명예의 전당 1위 밈을 새긴 프리미엄 코튼 티셔츠",
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
    name: "PACK LEADER 머그컵",
    description: "늑대 무리의 리더답게 아침을 시작하세요",
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
    name: "DIAMOND HODLER 스티커팩",
    description: "다이아몬드 손을 증명하는 홀로그램 스티커 5장 세트",
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
    name: "SAMU 늑대 후드티",
    description: "프리미엄 후드티 - SAMU 로고와 늑대 그래픽",
    price: 4500,
    currency: "SAMU",
    category: "clothing",
    image: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%232C3E50'/%3E%3Crect x='60' y='120' width='280' height='200' rx='30' fill='%23F7DC6F'/%3E%3Ccircle cx='200' cy='180' r='40' fill='%232C3E50'/%3E%3Cpath d='M160 160 L180 140 L200 160 L220 140 L240 160 L220 180 L180 180 Z' fill='%23F7DC6F'/%3E%3Ctext x='200' y='280' text-anchor='middle' font-family='Arial' font-size='16' font-weight='bold' fill='%232C3E50'%3ESAMU WOLF HOODIE%3C/text%3E%3C/svg%3E",
    originalMeme: "커뮤니티 디자인",
    originalAuthor: "SAMU Team",
    limited: false,
    stock: 300
  }
];

export function GoodsShop() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [cart, setCart] = useState<number[]>([]);
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
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-[hsl(201,30%,25%)] flex items-center justify-center gap-2">
            <Trophy className="h-6 w-6" />
            SAMU Goods Shop
          </CardTitle>
          <CardDescription className="text-[hsl(201,30%,35%)]">
            Hall of Fame memes turned into goods! Purchase with SAMU tokens
          </CardDescription>
        </CardHeader>
      </Card>

      {/* 장바구니 요약 */}
      {cart.length > 0 && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-green-600" />
                <span className="font-medium">Cart: {cart.length} items</span>
              </div>
              <div className="text-right">
                <div className="font-bold text-green-700">{getTotalPrice().toLocaleString()} SAMU</div>
                <Button size="sm" className="mt-1">Checkout</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 카테고리 탭 */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid w-full grid-cols-4 h-12">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <TabsTrigger 
                key={category.id} 
                value={category.id} 
                className="text-xs flex flex-col gap-1"
              >
                <Icon className="h-4 w-4" />
                {category.name}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {categories.map((category) => (
          <TabsContent key={category.id} value={category.id} className="mt-4">
            <div className="grid gap-4">
              {filteredGoods.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <div className="flex">
                    <div className="w-24 h-24 flex-shrink-0">
                      <img 
                        src={item.image} 
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm text-[hsl(201,30%,25%)]">
                            {item.name}
                          </h3>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {item.description}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              {item.originalMeme}
                            </Badge>
                            {item.limited && (
                              <Badge variant="destructive" className="text-xs">
                                Limited
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right ml-2">
                          <div className="font-bold text-[hsl(35,70%,50%)]">
                            {item.price.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">SAMU</div>
                          <Button
                            size="sm"
                            className="mt-2 h-8 text-xs"
                            onClick={() => addToCart(item.id)}
                            disabled={cart.includes(item.id)}
                          >
                            {cart.includes(item.id) ? "Added" : "Add to Cart"}
                          </Button>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        Original: {item.originalAuthor} • Stock: {item.stock}
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
        <CardContent className="p-4 text-center">
          <p className="text-sm text-blue-700">
            💡 Hall of Fame memes are turned into physical goods.<br />
            Purchase with SAMU tokens and receive real merchandise!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}