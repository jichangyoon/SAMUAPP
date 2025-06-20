import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, ShoppingCart, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useRoute } from "wouter";
import { usePrivy } from '@privy-io/react-auth';

// Mock goods data - in real app this would come from API
const goodsData = [
  {
    id: 1,
    name: "HODL STRONG T-Shirt",
    price: 25000,
    originalMeme: "HODL STRONG",
    creator: "CryptoMemer",
    description: "Premium cotton t-shirt featuring the viral HODL STRONG meme design. Perfect for showing your diamond hands mentality.",
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop",
    rating: 4.8,
    reviews: 127,
    inStock: true,
    category: "Clothing",
    sizes: ["S", "M", "L", "XL", "XXL"],
    features: [
      "100% Premium Cotton",
      "Officially Licensed Design", 
      "Machine Washable",
      "Unisex Fit",
      "Limited Edition"
    ]
  },
  {
    id: 2,
    name: "Diamond Paws Mug",
    price: 15000,
    originalMeme: "DIAMOND PAWS",
    creator: "ShibaLord",
    description: "Start your morning right with this premium ceramic mug featuring the beloved Diamond Paws design.",
    image: "https://images.unsplash.com/photo-1514228742587-6b1558fcf93a?w=400&h=400&fit=crop",
    rating: 4.9,
    reviews: 89,
    inStock: true,
    category: "Accessories",
    sizes: ["11oz", "15oz"],
    features: [
      "Premium Ceramic",
      "Dishwasher Safe",
      "Microwave Safe",
      "High-Quality Print",
      "Perfect Gift"
    ]
  }
];

export default function GoodsDetail() {
  const [, navigate] = useLocation();
  const [, params] = useRoute('/goods/:id');
  const goodsId = params?.id;
  const { authenticated } = usePrivy();
  const { toast } = useToast();
  
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [selectedSize, setSelectedSize] = useState("");
  const [isPurchasing, setIsPurchasing] = useState(false);

  const product = goodsData.find(item => item.id.toString() === goodsId);

  if (!product) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-lg font-bold mb-4">Product not found</h1>
          <Button onClick={() => navigate('/')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const handlePurchase = () => {
    if (!authenticated) {
      toast({
        title: "Authentication Required",
        description: "Please connect your wallet to make a purchase.",
        variant: "destructive",
      });
      return;
    }

    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      toast({
        title: "Size Required",
        description: "Please select a size before purchasing.",
        variant: "destructive",
      });
      return;
    }

    setShowPurchaseDialog(true);
  };

  const confirmPurchase = async () => {
    setIsPurchasing(true);
    
    // Simulate purchase process
    setTimeout(() => {
      toast({
        title: "Purchase Successful!",
        description: `You've successfully purchased ${product.name} for ${product.price.toLocaleString()} SAMU tokens.`,
      });
      setShowPurchaseDialog(false);
      setIsPurchasing(false);
      navigate('/');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card shadow-sm border-b border-border">
        <div className="max-w-md mx-auto px-4 py-1">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="text-foreground hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-lg font-bold text-foreground">Product Detail</h1>
            <div className="w-16" />
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Product Image */}
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="aspect-square rounded-lg overflow-hidden mb-4">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Product Info */}
            <div className="space-y-3">
              <div>
                <h2 className="text-lg font-bold text-foreground">{product.name}</h2>
                <p className="text-xl font-bold text-primary mt-1">
                  {product.price.toLocaleString()} SAMU
                </p>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">{product.rating}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  ({product.reviews} reviews)
                </span>
                <Badge variant={product.inStock ? "default" : "destructive"}>
                  {product.inStock ? "In Stock" : "Out of Stock"}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground">{product.description}</p>
            </div>
          </CardContent>
        </Card>

        {/* Original Meme Info */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground">Original Meme</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-bold text-xs">
                  {product.creator.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">"{product.originalMeme}"</p>
                <p className="text-xs text-muted-foreground">by {product.creator}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Size Selection */}
        {product.sizes && product.sizes.length > 0 && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-foreground">Size</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-5 gap-2">
                {product.sizes.map((size) => (
                  <Button
                    key={size}
                    variant={selectedSize === size ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedSize(size)}
                    className="text-xs"
                  >
                    {size}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Features */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground">Features</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-1">
              {product.features.map((feature, index) => (
                <li key={index} className="text-xs text-muted-foreground flex items-center">
                  <span className="w-1 h-1 bg-primary rounded-full mr-2"></span>
                  {feature}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Purchase Button */}
        <Button
          onClick={handlePurchase}
          disabled={!product.inStock}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          {product.inStock ? `Purchase for ${product.price.toLocaleString()} SAMU` : 'Out of Stock'}
        </Button>
      </div>

      {/* Purchase Confirmation Dialog */}
      <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <DialogContent className="max-w-md mx-4 bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Confirm Purchase</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              You are about to purchase {product.name}
              {selectedSize && ` (Size: ${selectedSize})`} for {product.price.toLocaleString()} SAMU tokens.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPurchaseDialog(false)}
              disabled={isPurchasing}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmPurchase}
              disabled={isPurchasing}
              className="bg-primary hover:bg-primary/90"
            >
              {isPurchasing ? "Processing..." : "Confirm Purchase"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}