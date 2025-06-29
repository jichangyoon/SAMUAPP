import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { usePrivy } from '@privy-io/react-auth';
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, ShoppingBag, Trophy, Shirt, Coffee, Sticker, X } from "lucide-react";
import samuSamuraiShirt from "@/assets/samu-samurai-shirt.webp";

// Hall of Fame meme collectibles showcase data
const goodsData = [
  {
    id: 1,
    name: "SAMU x SOL Samurai Shirt",
    description: "Exclusive SAMU Wolf samurai design featuring traditional Japanese warrior aesthetics with crossed katanas",
    category: "clothing",
    image: samuSamuraiShirt,
    originalMeme: "SAMU Wolf Samurai",
    originalAuthor: "samu_artist",
    limited: true,
    stock: 100
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
            <ShoppingBag className="h-5 w-5" />
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
                  className="overflow-hidden cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="flex p-3">
                    <div className="w-16 h-16 flex-shrink-0">
                      <img 
                        src={item.image} 
                        alt={item.name}
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
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