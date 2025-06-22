import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { usePrivy } from '@privy-io/react-auth';
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Trophy, Shirt, Coffee, Sticker, X } from "lucide-react";

// Hall of Fame meme collectibles showcase data
const goodsData = [
  {
    id: 1,
    name: "SAMU TO MARS Collection",
    description: "Hall of Fame meme design featuring the legendary space journey theme",
    category: "clothing",
    image: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%23F7DC6F'/%3E%3Crect x='50' y='100' width='300' height='200' rx='20' fill='%23ffffff'/%3E%3Ctext x='200' y='180' text-anchor='middle' font-family='Arial' font-size='24' font-weight='bold' fill='%232C3E50'%3ESAMU TO MARS%3C/text%3E%3Ctext x='200' y='220' text-anchor='middle' font-family='Arial' font-size='14' fill='%238B4513'%3EHall of Fame Design%3C/text%3E%3Ccircle cx='100' cy='130' r='15' fill='%23FF8C00'/%3E%3Ccircle cx='300' cy='130' r='15' fill='%23FF8C00'/%3E%3C/svg%3E",
    originalMeme: "SAMU TO MARS",
    originalAuthor: "crypto_legend",
    limited: true,
    stock: 150
  },
  {
    id: 2,
    name: "PACK LEADER Showcase",
    description: "Alpha wolf design from the Hall of Fame collection",
    category: "lifestyle",
    image: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%238B4513'/%3E%3Cellipse cx='200' cy='250' rx='120' ry='80' fill='%23ffffff'/%3E%3Crect x='320' y='200' width='30' height='60' rx='15' fill='%23ffffff'/%3E%3Ctext x='200' y='230' text-anchor='middle' font-family='Arial' font-size='18' font-weight='bold' fill='%232C3E50'%3EPACK LEADER%3C/text%3E%3Ctext x='200' y='280' text-anchor='middle' font-family='Arial' font-size='12' fill='%238B4513'%3ECollectible Design%3C/text%3E%3C/svg%3E",
    originalMeme: "PACK LEADER",
    originalAuthor: "wolf_alpha",
    limited: false,
    stock: 500
  },
  {
    id: 3,
    name: "DIAMOND HODLER Archive",
    description: "Holographic design celebrating diamond hands mentality",
    category: "accessories",
    image: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%23F7DC6F'/%3E%3Cpolygon points='200,80 260,160 200,240 140,160' fill='%2300BFFF' stroke='%232C3E50' stroke-width='3'/%3E%3Cpolygon points='200,120 230,160 200,200 170,160' fill='%23ffffff' opacity='0.7'/%3E%3Ctext x='200' y='280' text-anchor='middle' font-family='Arial' font-size='18' font-weight='bold' fill='%232C3E50'%3EDIAMOND HODLER%3C/text%3E%3Ctext x='200' y='320' text-anchor='middle' font-family='Arial' font-size='12' fill='%238B4513'%3EArt Collection%3C/text%3E%3C/svg%3E",
    originalMeme: "DIAMOND HODLER",
    originalAuthor: "gem_hands",
    limited: true,
    stock: 200
  },
  {
    id: 4,
    name: "SAMU Wolf Heritage",
    description: "Official SAMU community logo and wolf graphics showcase",
    category: "clothing",
    image: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%232C3E50'/%3E%3Crect x='60' y='120' width='280' height='200' rx='30' fill='%23F7DC6F'/%3E%3Ccircle cx='200' cy='180' r='40' fill='%232C3E50'/%3E%3Cpath d='M160 160 L180 140 L200 160 L220 140 L240 160 L220 180 L180 180 Z' fill='%23F7DC6F'/%3E%3Ctext x='200' y='280' text-anchor='middle' font-family='Arial' font-size='16' font-weight='bold' fill='%232C3E50'%3ESAMU WOLF HERITAGE%3C/text%3E%3C/svg%3E",
    originalMeme: "Community Design",
    originalAuthor: "SAMU Team",
    limited: false,
    stock: 300
  }
];

export function GoodsShop() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedItem, setSelectedItem] = useState<typeof goodsData[0] | null>(null);
  const { authenticated } = usePrivy();

  const categories = [
    { id: "all", name: "All", icon: ShoppingCart },
    { id: "clothing", name: "Clothing", icon: Shirt },
    { id: "lifestyle", name: "Lifestyle", icon: Coffee },
    { id: "accessories", name: "Accessories", icon: Sticker }
  ];

  const filteredGoods = selectedCategory === "all" 
    ? goodsData 
    : goodsData.filter(item => item.category === selectedCategory);

  return (
    <div className="space-y-6 pb-20">
      {/* 굿즈샵 헤더 */}
      <Card className="bg-black border-0">
        <CardHeader className="text-center py-3">
          <CardTitle className="text-xl font-bold text-[hsl(50,85%,75%)] flex items-center justify-center gap-2">
            <Trophy className="h-4 w-4" />
            SAMU Goods Shop
          </CardTitle>
          <CardDescription className="text-xs text-[hsl(50,85%,75%)]/90 mt-1 whitespace-nowrap">
            Hall of Fame meme collectibles showcase
          </CardDescription>
        </CardHeader>
      </Card>



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
                  className="overflow-hidden"
                >
                  <div className="flex p-3">
                    <button 
                      className="w-16 h-16 flex-shrink-0 hover:opacity-80 transition-opacity"
                      onClick={() => setSelectedItem(item)}
                    >
                      <img 
                        src={item.image} 
                        alt={item.name}
                        className="w-full h-full object-cover rounded"
                      />
                    </button>
                    <div className="flex-1 ml-3 min-w-0">
                      <h3 className="font-semibold text-sm text-foreground truncate">
                        {item.name}
                      </h3>
                      {item.limited && (
                        <Badge variant="destructive" className="text-xs px-1 py-0 h-4 leading-none mt-1">
                          Limited
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* 안내 메시지 */}
      <Card className="bg-blue-950/20 border-blue-800">
        <CardContent className="p-3 text-center">
          <p className="text-xs text-blue-400">
            💡 Hall of Fame memes transformed into collectible designs.<br />
            Explore and appreciate the community's greatest creations!
          </p>
        </CardContent>
      </Card>

      {/* Product Detail Drawer */}
      <Drawer open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DrawerContent className="bg-card border-border max-h-[92vh] h-[92vh]">
          <DrawerHeader>
            <DrawerTitle className="text-foreground">{selectedItem?.name}</DrawerTitle>
          </DrawerHeader>
          
          {selectedItem && (
            <div className="space-y-4 px-4 pb-4 overflow-y-auto flex-1">
              <div className="aspect-square rounded-lg overflow-hidden">
                <img 
                  src={selectedItem.image} 
                  alt={selectedItem.name}
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-primary-foreground">
                    {selectedItem.originalAuthor.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-foreground">{selectedItem.originalAuthor}</div>
                  <div className="text-sm text-muted-foreground">
                    Hall of Fame: {selectedItem.originalMeme}
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-foreground mb-2">Description</h4>
                <p className="text-muted-foreground">{selectedItem.description}</p>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-xs">
                  <Trophy className="h-3 w-3 mr-1" />
                  {selectedItem.originalMeme}
                </Badge>
                {selectedItem.limited && (
                  <Badge variant="destructive" className="text-xs">
                    Limited Edition
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  Stock: {selectedItem.stock}
                </Badge>
              </div>
              
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground text-center">
                  Collectible merchandise inspired by Hall of Fame memes
                </p>
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}