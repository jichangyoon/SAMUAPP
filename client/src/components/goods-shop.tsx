import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { usePrivy } from '@privy-io/react-auth';
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ShoppingCart, ShoppingBag, Shirt, Package, Truck, ChevronRight, Loader2, X, ArrowLeft } from "lucide-react";

type OrderStep = 'browse' | 'detail' | 'options' | 'shipping' | 'confirm';

export function GoodsShop() {
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [orderStep, setOrderStep] = useState<OrderStep>('browse');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [shippingForm, setShippingForm] = useState({
    name: '', email: '', address1: '', address2: '', city: '', state: '', country: 'US', zip: '', phone: ''
  });
  const [shippingEstimate, setShippingEstimate] = useState<any>(null);
  const [showOrders, setShowOrders] = useState(false);
  const { authenticated, user } = usePrivy();
  const { toast } = useToast();

  const walletAddress = (user as any)?.wallet?.address || '';

  const { data: goods = [], isLoading } = useQuery({
    queryKey: ['/api/goods'],
  });

  const { data: userOrders = [] } = useQuery({
    queryKey: ['/api/goods/orders', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return [];
      const res = await fetch(`/api/goods/orders/${walletAddress}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!walletAddress && authenticated,
  });

  const estimateShippingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/goods/${selectedItem.id}/estimate-shipping`, {
        address1: shippingForm.address1,
        city: shippingForm.city,
        country_code: shippingForm.country,
        state_code: shippingForm.state,
        zip: shippingForm.zip,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setShippingEstimate(data);
    },
    onError: (e: any) => {
      toast({ title: "Shipping estimate failed", description: e.message, variant: "destructive" });
    },
  });

  const placeOrderMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/goods/${selectedItem.id}/order`, {
        size: selectedSize,
        color: selectedColor,
        buyerWallet: walletAddress,
        buyerEmail: shippingForm.email,
        shippingName: shippingForm.name,
        shippingAddress1: shippingForm.address1,
        shippingAddress2: shippingForm.address2,
        shippingCity: shippingForm.city,
        shippingState: shippingForm.state,
        shippingCountry: shippingForm.country,
        shippingZip: shippingForm.zip,
        shippingPhone: shippingForm.phone,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Order placed successfully!" });
      resetOrder();
      queryClient.invalidateQueries({ queryKey: ['/api/goods/orders', walletAddress] });
    },
    onError: (e: any) => {
      toast({ title: "Order failed", description: e.message, variant: "destructive" });
    },
  });

  const resetOrder = () => {
    setSelectedItem(null);
    setOrderStep('browse');
    setSelectedSize('');
    setSelectedColor('');
    setShippingForm({ name: '', email: '', address1: '', address2: '', city: '', state: '', country: 'US', zip: '', phone: '' });
    setShippingEstimate(null);
  };

  const openProductDetail = (item: any) => {
    setSelectedItem(item);
    setOrderStep('detail');
    setSelectedSize('');
    setSelectedColor('');
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-yellow-500/20 text-yellow-400',
      confirmed: 'bg-blue-500/20 text-blue-400',
      fulfilled: 'bg-purple-500/20 text-purple-400',
      shipped: 'bg-green-500/20 text-green-400',
      delivered: 'bg-green-500/20 text-green-300',
      cancelled: 'bg-red-500/20 text-red-400',
    };
    return map[status] || 'bg-gray-500/20 text-gray-400';
  };

  const goodsArray = goods as any[];

  return (
    <div className="space-y-4 pb-20">
      <Card className="bg-black border-0">
        <CardHeader className="text-center py-3">
          <CardTitle className="text-xl font-bold text-[hsl(50,85%,75%)] flex items-center justify-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            SAMU Goods Shop
          </CardTitle>
          <CardDescription className="text-xs text-[hsl(50,85%,75%)]/90 mt-1">
            Contest-winning meme designs on real merchandise
          </CardDescription>
        </CardHeader>
      </Card>

      {authenticated && (userOrders as any[]).length > 0 && (
        <Button
          variant="outline"
          className="w-full flex items-center justify-between"
          onClick={() => setShowOrders(!showOrders)}
        >
          <span className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            My Orders ({(userOrders as any[]).length})
          </span>
          <ChevronRight className={`h-4 w-4 transition-transform ${showOrders ? 'rotate-90' : ''}`} />
        </Button>
      )}

      {showOrders && (
        <div className="space-y-2">
          {(userOrders as any[]).map((order: any) => (
            <Card key={order.id} className="border-border">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-foreground">Order #{order.id}</div>
                    <div className="text-xs text-muted-foreground">
                      {order.size} / {order.color} - ${order.totalPrice}
                    </div>
                  </div>
                  <Badge className={getStatusBadge(order.status)}>{order.status}</Badge>
                </div>
                {order.trackingNumber && (
                  <div className="text-xs text-primary mt-1">
                    Tracking: {order.trackingUrl ? <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="underline">{order.trackingNumber}</a> : order.trackingNumber}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground mt-2">Loading products...</p>
        </div>
      ) : goodsArray.length === 0 ? (
        <Card className="bg-accent/30 border-border">
          <CardContent className="p-6 text-center">
            <Shirt className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">No merchandise available yet.</p>
            <p className="text-muted-foreground text-xs mt-1">Contest-winning memes will become merchandise here!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {goodsArray.map((item: any) => (
            <Card
              key={item.id}
              className="overflow-hidden cursor-pointer hover:bg-accent/50 transition-colors border-border"
              onClick={() => openProductDetail(item)}
            >
              <div className="flex p-3">
                <div className="w-20 h-20 flex-shrink-0 bg-accent rounded-lg overflow-hidden">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 ml-3 min-w-0">
                  <h3 className="font-semibold text-sm text-foreground truncate">{item.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-primary font-bold text-sm">${item.retailPrice}</span>
                    <Badge variant="outline" className="text-xs">{item.productType}</Badge>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground self-center flex-shrink-0" />
              </div>
            </Card>
          ))}
        </div>
      )}

      <Drawer open={orderStep !== 'browse'} onOpenChange={(open) => { if (!open) resetOrder(); }}>
        <DrawerContent className="bg-card border-border max-h-[92vh] h-[92vh]">
          <DrawerHeader className="flex items-center gap-2">
            {orderStep !== 'detail' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (orderStep === 'options') setOrderStep('detail');
                  else if (orderStep === 'shipping') setOrderStep('options');
                  else if (orderStep === 'confirm') setOrderStep('shipping');
                }}
                className="p-1"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <DrawerTitle className="text-foreground flex-1">
              {orderStep === 'detail' && selectedItem?.title}
              {orderStep === 'options' && 'Select Options'}
              {orderStep === 'shipping' && 'Shipping Information'}
              {orderStep === 'confirm' && 'Confirm Order'}
            </DrawerTitle>
            <Button variant="ghost" size="sm" onClick={resetOrder} className="p-1">
              <X className="h-4 w-4" />
            </Button>
          </DrawerHeader>

          {selectedItem && (
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
              {orderStep === 'detail' && (
                <>
                  <div className="aspect-square rounded-lg overflow-hidden bg-accent">
                    <img src={selectedItem.imageUrl} alt={selectedItem.title} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl font-bold text-primary">${selectedItem.retailPrice}</span>
                      <Badge variant="outline">{selectedItem.productType}</Badge>
                    </div>
                    <p className="text-muted-foreground text-sm">{selectedItem.description}</p>
                  </div>
                  {selectedItem.sizes?.length > 0 && (
                    <div>
                      <span className="text-xs text-muted-foreground">Available sizes: </span>
                      <span className="text-xs text-foreground">{selectedItem.sizes.join(', ')}</span>
                    </div>
                  )}
                  {selectedItem.colors?.length > 0 && (
                    <div>
                      <span className="text-xs text-muted-foreground">Available colors: </span>
                      <span className="text-xs text-foreground">{selectedItem.colors.join(', ')}</span>
                    </div>
                  )}
                  <Button
                    className="w-full"
                    onClick={() => setOrderStep('options')}
                    disabled={!authenticated}
                  >
                    {authenticated ? (
                      <><ShoppingCart className="h-4 w-4 mr-2" /> Order Now</>
                    ) : (
                      'Log in to order'
                    )}
                  </Button>
                </>
              )}

              {orderStep === 'options' && (
                <>
                  <div className="flex items-center gap-3 p-3 bg-accent/30 rounded-lg">
                    <img src={selectedItem.imageUrl} alt="" className="w-14 h-14 rounded object-cover" />
                    <div>
                      <div className="font-semibold text-sm text-foreground">{selectedItem.title}</div>
                      <div className="text-primary font-bold">${selectedItem.retailPrice}</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">Size</label>
                      <Select value={selectedSize} onValueChange={setSelectedSize}>
                        <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                        <SelectContent>
                          {(selectedItem.sizes || []).map((s: string) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">Color</label>
                      <Select value={selectedColor} onValueChange={setSelectedColor}>
                        <SelectTrigger><SelectValue placeholder="Select color" /></SelectTrigger>
                        <SelectContent>
                          {(selectedItem.colors || []).map((c: string) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => setOrderStep('shipping')}
                    disabled={!selectedSize || !selectedColor}
                  >
                    Continue to Shipping
                  </Button>
                </>
              )}

              {orderStep === 'shipping' && (
                <>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Full Name *</label>
                      <Input
                        value={shippingForm.name}
                        onChange={(e) => setShippingForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Email *</label>
                      <Input
                        type="email"
                        value={shippingForm.email}
                        onChange={(e) => setShippingForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="john@example.com"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Address Line 1 *</label>
                      <Input
                        value={shippingForm.address1}
                        onChange={(e) => setShippingForm(f => ({ ...f, address1: e.target.value }))}
                        placeholder="123 Main St"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Address Line 2</label>
                      <Input
                        value={shippingForm.address2}
                        onChange={(e) => setShippingForm(f => ({ ...f, address2: e.target.value }))}
                        placeholder="Apt 4B"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground">City *</label>
                        <Input
                          value={shippingForm.city}
                          onChange={(e) => setShippingForm(f => ({ ...f, city: e.target.value }))}
                          placeholder="New York"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">State</label>
                        <Input
                          value={shippingForm.state}
                          onChange={(e) => setShippingForm(f => ({ ...f, state: e.target.value }))}
                          placeholder="NY"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground">Country *</label>
                        <Input
                          value={shippingForm.country}
                          onChange={(e) => setShippingForm(f => ({ ...f, country: e.target.value }))}
                          placeholder="US"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">ZIP Code *</label>
                        <Input
                          value={shippingForm.zip}
                          onChange={(e) => setShippingForm(f => ({ ...f, zip: e.target.value }))}
                          placeholder="10001"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Phone</label>
                      <Input
                        value={shippingForm.phone}
                        onChange={(e) => setShippingForm(f => ({ ...f, phone: e.target.value }))}
                        placeholder="+1 555 123 4567"
                      />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => estimateShippingMutation.mutate()}
                    disabled={!shippingForm.address1 || !shippingForm.city || !shippingForm.country || !shippingForm.zip || estimateShippingMutation.isPending}
                  >
                    {estimateShippingMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Estimating...</>
                    ) : (
                      <><Truck className="h-4 w-4 mr-2" /> Estimate Shipping</>
                    )}
                  </Button>
                  {shippingEstimate && (
                    <Card className="border-green-500/30 bg-green-500/5">
                      <CardContent className="p-3">
                        <div className="text-sm font-semibold text-green-400 mb-1">Shipping Options:</div>
                        {Array.isArray(shippingEstimate) ? shippingEstimate.map((opt: any, i: number) => (
                          <div key={i} className="flex justify-between text-xs text-foreground py-1">
                            <span>{opt.name}</span>
                            <span className="font-semibold">${opt.rate} ({opt.minDeliveryDays}-{opt.maxDeliveryDays} days)</span>
                          </div>
                        )) : (
                          <div className="text-xs text-foreground">${shippingEstimate.rate || 'See confirmation'}</div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                  <Button
                    className="w-full"
                    onClick={() => setOrderStep('confirm')}
                    disabled={!shippingForm.name || !shippingForm.email || !shippingForm.address1 || !shippingForm.city || !shippingForm.country || !shippingForm.zip}
                  >
                    Review Order
                  </Button>
                </>
              )}

              {orderStep === 'confirm' && (
                <>
                  <Card className="border-primary/30">
                    <CardContent className="p-4 space-y-3">
                      <h3 className="font-semibold text-foreground">Order Summary</h3>
                      <div className="flex items-center gap-3">
                        <img src={selectedItem.imageUrl} alt="" className="w-16 h-16 rounded object-cover" />
                        <div>
                          <div className="font-semibold text-sm text-foreground">{selectedItem.title}</div>
                          <div className="text-xs text-muted-foreground">Size: {selectedSize} | Color: {selectedColor}</div>
                          <div className="text-primary font-bold">${selectedItem.retailPrice}</div>
                        </div>
                      </div>
                      <div className="border-t border-border pt-2 space-y-1">
                        <div className="text-xs text-muted-foreground">Ship to:</div>
                        <div className="text-sm text-foreground">{shippingForm.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {shippingForm.address1}{shippingForm.address2 ? `, ${shippingForm.address2}` : ''}<br />
                          {shippingForm.city}, {shippingForm.state} {shippingForm.zip}<br />
                          {shippingForm.country}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Button
                    className="w-full"
                    onClick={() => placeOrderMutation.mutate()}
                    disabled={placeOrderMutation.isPending}
                  >
                    {placeOrderMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Placing Order...</>
                    ) : (
                      <><ShoppingCart className="h-4 w-4 mr-2" /> Place Order</>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Your order will be printed and shipped by Printful. Shipping costs may apply.
                  </p>
                </>
              )}
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
