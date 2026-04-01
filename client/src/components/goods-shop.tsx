import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getStatusLabel, statusOrder } from "@/lib/order-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { usePrivy } from '@privy-io/react-auth';
import { useWalletAddress } from '@/hooks/use-wallet-address';
import { useUniversalSignTransaction } from "@/hooks/use-universal-sign-transaction";
import { Transaction } from '@solana/web3.js';
import { getSharedConnection } from "@/lib/solana";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ShoppingCart, ShoppingBag, Sticker, Package, Truck, ChevronRight, Loader2, X, ArrowLeft, ChevronLeft, Wallet } from "lucide-react";
import GoodsStorySection from "./goods-story-section";
import { COUNTRIES, getCountryInfo } from "@/lib/countries";
import { PrintfulDetailSection, GoodsListItem } from "@/components/goods-shop-components";

type OrderStep = 'browse' | 'detail' | 'options' | 'shipping' | 'payment' | 'confirm';

export function GoodsShop() {
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [orderStep, setOrderStep] = useState<OrderStep>('browse');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [shippingForm, setShippingForm] = useState({
    name: '', email: '', address1: '', address2: '', city: '', state: '', country: 'KR', zip: '', phone: '', phoneDialCode: '+82'
  });
  const [shippingEstimate, setShippingEstimate] = useState<any>(null);
  const [showOrders, setShowOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [txSignature, setTxSignature] = useState<string>('');
  const [isPaying, setIsPaying] = useState(false);
  const orderDataRef = useRef<{ item: any; size: string; color: string; paymentInfo: any; txSignature: string; shippingForm: any } | null>(null);
  const { authenticated, user } = usePrivy();
  const { toast } = useToast();

  const { walletAddress } = useWalletAddress();
  const signTransaction = useUniversalSignTransaction(walletAddress);

  const solConnection = getSharedConnection();

  const { data: goods = [], isLoading } = useQuery({
    queryKey: ['/api/goods'],
    staleTime: 60000,
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

  const handlePaySOL = useCallback(async () => {
    if (!selectedItem || !walletAddress || !paymentInfo) return;

    orderDataRef.current = {
      item: selectedItem,
      size: selectedSize,
      color: selectedColor,
      paymentInfo: paymentInfo,
      txSignature: '',
      shippingForm: { ...shippingForm },
    };

    setIsPaying(true);
    try {
      toast({ title: "Please sign the transaction in your wallet", duration: 5000 });

      const transaction = Transaction.from(Buffer.from(paymentInfo.transaction, 'base64'));
      const signedTx = await signTransaction(transaction, solConnection);
      const sig = await solConnection.sendRawTransaction(signedTx.serialize());
      await solConnection.confirmTransaction(sig, 'confirmed');

      orderDataRef.current.txSignature = sig;
      setTxSignature(sig);
      toast({ title: "Payment confirmed! Placing your order...", description: `TX: ${sig.slice(0, 8)}...` });

      const snap = orderDataRef.current;
      const res = await apiRequest("POST", `/api/goods/${snap.item.id}/order`, {
        size: snap.size,
        color: snap.color,
        buyerWallet: walletAddress,
        buyerEmail: snap.shippingForm.email,
        txSignature: sig,
        solAmount: snap.paymentInfo.solAmount,
        shippingCostUSD: snap.paymentInfo.shippingCostUSD,
        shippingName: snap.shippingForm.name,
        shippingAddress1: snap.shippingForm.address1,
        shippingAddress2: snap.shippingForm.address2,
        shippingCity: snap.shippingForm.city,
        shippingState: snap.shippingForm.state,
        shippingCountry: snap.shippingForm.country,
        shippingZip: snap.shippingForm.zip,
        shippingPhone: `${snap.shippingForm.phoneDialCode} ${snap.shippingForm.phone}`.trim(),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to place order');
      }

      toast({ title: "Order placed! Your sticker is being prepared." });
      setSelectedItem(null);
      setOrderStep('browse');
      setSelectedSize('');
      setSelectedColor('');
      setShippingForm({ name: '', email: '', address1: '', address2: '', city: '', state: '', country: 'KR', zip: '', phone: '', phoneDialCode: '+82' });
      setShippingEstimate(null);
      setPaymentInfo(null);
      setTxSignature('');
      orderDataRef.current = null;
      queryClient.invalidateQueries({ queryKey: ['/api/goods/orders', walletAddress] });
    } catch (err: any) {
      console.error("Payment/order error:", err);
      if (orderDataRef.current?.txSignature) {
        setOrderStep('confirm');
        toast({ title: "Order placement failed", description: err.message + " — click Confirm to retry", variant: "destructive" });
      } else {
        toast({ title: "Payment failed", description: err.message, variant: "destructive" });
      }
    } finally {
      setIsPaying(false);
    }
  }, [selectedItem, walletAddress, paymentInfo, selectedSize, selectedColor, shippingForm, signTransaction, solConnection, queryClient]);

  const placeOrderMutation = useMutation({
    mutationFn: async () => {
      const data = orderDataRef.current;
      const item = selectedItem || data?.item;
      const size = selectedSize || data?.size;
      const color = selectedColor || data?.color;
      const sig = txSignature || data?.txSignature;
      const payment = paymentInfo || data?.paymentInfo;
      const shipping = shippingForm.name ? shippingForm : data?.shippingForm || shippingForm;
      if (!item?.id) throw new Error('Order data lost. Please try again.');
      const res = await apiRequest("POST", `/api/goods/${item.id}/order`, {
        size,
        color,
        buyerWallet: walletAddress,
        buyerEmail: shipping.email,
        txSignature: sig,
        solAmount: payment?.solAmount,
        shippingCostUSD: payment?.shippingCostUSD,
        shippingName: shipping.name,
        shippingAddress1: shipping.address1,
        shippingAddress2: shipping.address2,
        shippingCity: shipping.city,
        shippingState: shipping.state,
        shippingCountry: shipping.country,
        shippingZip: shipping.zip,
        shippingPhone: `${shipping.phoneDialCode} ${shipping.phone}`.trim(),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Order placed successfully! Your sticker is being prepared." });
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
    setShippingForm({ name: '', email: '', address1: '', address2: '', city: '', state: '', country: 'KR', zip: '', phone: '', phoneDialCode: '+82' });
    setShippingEstimate(null);
    setPaymentInfo(null);
    setTxSignature('');
    orderDataRef.current = null;
  };

  const [mockupIndex, setMockupIndex] = useState(0);

  const openProductDetail = (item: any) => {
    setSelectedItem(item);
    setOrderStep('detail');
    setSelectedSize('');
    setSelectedColor('');
    setMockupIndex(0);
  };


  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
      case "pending":
      case "confirmed": return 'bg-blue-500/20 text-blue-400';
      case "in_production":
      case "inprocess": return 'bg-orange-500/20 text-orange-400';
      case "fulfilled":
      case "shipped":
      case "in_transit": return 'bg-purple-500/20 text-purple-400';
      case "delivered": return 'bg-green-500/20 text-green-400';
      case "returned": return 'bg-orange-500/20 text-orange-400';
      case "failed":
      case "canceled":
      case "cancelled": return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
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
            <Card
              key={order.id}
              className="border-border cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => setSelectedOrder(order)}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  {order.goodsImageUrl && (
                    <img src={order.goodsImageUrl} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">{order.goodsTitle || `Order #${order.id}`}</div>
                    <div className="text-xs text-muted-foreground">
                      {order.size} · ${order.totalPrice}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={`${getStatusBadge(order.printfulStatus || order.status)} ${!['delivered', 'completed', 'canceled', 'failed', 'returned'].includes(order.printfulStatus || order.status) ? 'animate-pulse' : ''}`}>
                      {getStatusLabel(order.printfulStatus || order.status)}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Order Detail Modal */}
      <Drawer open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-lg font-bold text-foreground">Order Details</DrawerTitle>
          </DrawerHeader>
          {selectedOrder && (
            <div className="px-4 pb-6 space-y-4 overflow-y-auto max-h-[75vh]">
              {/* Product Info */}
              <div className="flex items-center gap-3 p-3 bg-accent/30 rounded-lg">
                {selectedOrder.goodsImageUrl && (
                  <img src={selectedOrder.goodsImageUrl} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground">{selectedOrder.goodsTitle || `Order #${selectedOrder.id}`}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{selectedOrder.goodsDescription}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Size: {selectedOrder.size}</div>
                </div>
              </div>

              {/* Order Status Timeline */}
              <div className="space-y-1">
                <div className="text-sm font-semibold text-foreground mb-2">Order Status</div>
                {(() => {
                  const steps = [
                    { key: 'confirmed', label: 'Order Confirmed', icon: '✓' },
                    { key: 'production', label: 'In Production', icon: '🏭' },
                    { key: 'shipping', label: 'Shipped', icon: '📦' },
                    { key: 'delivered', label: 'Delivered', icon: '✅' },
                  ];
                  const currentStep = statusOrder[selectedOrder.printfulStatus] ?? statusOrder[selectedOrder.status] ?? 0;
                  const isCanceled = currentStep === -1;
                  return isCanceled ? (
                    <div className="p-3 bg-red-500/10 rounded-lg text-center">
                      <span className="text-red-400 font-medium text-sm">❌ Order Canceled / Failed</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      {steps.map((step, idx) => (
                        <div key={step.key} className="flex items-center flex-1">
                          <div className={`flex flex-col items-center flex-1 ${idx <= currentStep ? 'text-primary' : 'text-muted-foreground/50'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${idx <= currentStep ? 'bg-primary/20 text-primary' : 'bg-accent text-muted-foreground/50'} ${idx === currentStep && idx < steps.length - 1 ? 'ring-2 ring-primary ring-offset-1 ring-offset-background animate-pulse' : ''}`}>
                              {idx < currentStep ? '✓' : step.icon}
                            </div>
                            <span className={`text-[10px] mt-1 text-center leading-tight ${idx === currentStep && idx < steps.length - 1 ? 'animate-pulse font-semibold' : ''}`}>{step.label}</span>
                          </div>
                          {idx < steps.length - 1 && (
                            <div className={`h-0.5 w-full mt-[-12px] ${idx < currentStep ? 'bg-primary' : 'bg-accent'}`} />
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Printful Order Details */}
              {selectedOrder.printfulOrderId && (
                <PrintfulDetailSection orderId={selectedOrder.id} wallet={walletAddress} />
              )}

              {/* Payment Info */}
              <div className="space-y-2">
                <div className="text-sm font-semibold text-foreground">Payment</div>
                <div className="bg-accent/30 rounded-lg p-3 space-y-1.5 text-sm">
                  {selectedOrder.shippingCostUsd != null && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Product Price</span>
                        <span className="text-foreground">${(selectedOrder.totalPrice - selectedOrder.shippingCostUsd).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Shipping</span>
                        <span className="text-foreground">${selectedOrder.shippingCostUsd.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-t border-border pt-1.5">
                        <span className="text-muted-foreground font-medium">Total (USD)</span>
                        <span className="font-semibold text-foreground">${selectedOrder.totalPrice.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  {selectedOrder.shippingCostUsd == null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total (USD)</span>
                      <span className="font-medium text-foreground">${selectedOrder.totalPrice}</span>
                    </div>
                  )}
                  {selectedOrder.solAmount && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Paid (SOL)</span>
                      <span className="font-medium text-foreground">{selectedOrder.solAmount.toFixed(6)} SOL</span>
                    </div>
                  )}
                  {selectedOrder.txSignature && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Transaction</span>
                      <a
                        href={`https://solscan.io/tx/${selectedOrder.txSignature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary underline truncate max-w-[180px]"
                      >
                        {selectedOrder.txSignature.slice(0, 12)}...
                      </a>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Order Date</span>
                    <span className="text-foreground">{new Date(selectedOrder.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Shipping Info */}
              <div className="space-y-2">
                <div className="text-sm font-semibold text-foreground">Shipping Address</div>
                <div className="bg-accent/30 rounded-lg p-3 space-y-1 text-sm">
                  <div className="font-medium text-foreground">{selectedOrder.shippingName}</div>
                  <div className="text-muted-foreground">{selectedOrder.shippingAddress1}</div>
                  {selectedOrder.shippingAddress2 && (
                    <div className="text-muted-foreground">{selectedOrder.shippingAddress2}</div>
                  )}
                  <div className="text-muted-foreground">
                    {[selectedOrder.shippingCity, selectedOrder.shippingState, selectedOrder.shippingZip].filter(Boolean).join(', ')}
                  </div>
                  <div className="text-muted-foreground">{selectedOrder.shippingCountry}</div>
                  {selectedOrder.shippingPhone && (
                    <div className="text-muted-foreground mt-1">📞 {selectedOrder.shippingPhone}</div>
                  )}
                </div>
              </div>

              {/* Tracking Info */}
              {selectedOrder.trackingNumber && (
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-foreground">Tracking</div>
                  <div className="bg-accent/30 rounded-lg p-3 text-sm">
                    {selectedOrder.trackingUrl ? (
                      <a href={selectedOrder.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-white hover:text-white/80 underline flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        {selectedOrder.trackingNumber}
                      </a>
                    ) : (
                      <span className="flex items-center gap-2 text-foreground">
                        <Truck className="h-4 w-4" />
                        {selectedOrder.trackingNumber}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Order ID */}
              <div className="text-xs text-muted-foreground space-y-0.5 pt-2 border-t border-border">
                <div>Order ID: #{selectedOrder.id}</div>
                {selectedOrder.printfulOrderId && <div>Printful Order: #{selectedOrder.printfulOrderId}</div>}
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden border-border">
              <div className="flex p-3 animate-pulse">
                <div className="w-20 h-20 flex-shrink-0 bg-accent rounded-lg" />
                <div className="flex-1 ml-3 space-y-2 py-1">
                  <div className="h-4 bg-accent rounded w-3/4" />
                  <div className="h-3 bg-accent rounded w-full" />
                  <div className="h-3 bg-accent rounded w-1/2" />
                  <div className="h-5 bg-accent rounded w-1/4 mt-1" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : goodsArray.length === 0 ? (
        <Card className="bg-accent/30 border-border">
          <CardContent className="p-6 text-center">
            <Sticker className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">No stickers available yet.</p>
            <p className="text-muted-foreground text-xs mt-1">Contest-winning memes will become stickers here!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {goodsArray.map((item: any, index: number) => (
            <GoodsListItem
              key={item.id}
              item={item}
              index={index}
              onClick={() => openProductDetail(item)}
            />
          ))}
        </div>
      )}

      <Drawer open={orderStep !== 'browse'} onOpenChange={(open) => { if (!open && !isPaying) resetOrder(); }}>
        <DrawerContent className="bg-card border-border max-h-[85dvh]">
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

          {(selectedItem || (orderStep === 'confirm' && orderDataRef.current)) && (
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
              {orderStep === 'detail' && selectedItem && (
                <>
                  {(() => {
                    const mockups = selectedItem.mockupUrls?.filter((u: string) => u !== selectedItem.imageUrl) || [];
                    const allImages = [selectedItem.imageUrl, ...mockups];
                    const hasMultiple = allImages.length > 1;
                    return (
                      <div className="relative">
                        <div className="aspect-square rounded-lg overflow-hidden bg-accent">
                          <img src={allImages[mockupIndex] || selectedItem.imageUrl} alt={selectedItem.title} className="w-full h-full object-contain bg-gray-900" />
                        </div>
                        {hasMultiple && (
                          <>
                            <button
                              onClick={() => setMockupIndex(i => (i - 1 + allImages.length) % allImages.length)}
                              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 rounded-full p-1.5"
                            >
                              <ChevronLeft className="h-5 w-5 text-white" />
                            </button>
                            <button
                              onClick={() => setMockupIndex(i => (i + 1) % allImages.length)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 rounded-full p-1.5"
                            >
                              <ChevronRight className="h-5 w-5 text-white" />
                            </button>
                            <div className="flex justify-center gap-1.5 mt-2">
                              {allImages.map((_: string, i: number) => (
                                <button
                                  key={i}
                                  onClick={() => setMockupIndex(i)}
                                  className={`w-2 h-2 rounded-full transition-colors ${i === mockupIndex ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })()}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl font-bold text-primary">${selectedItem.retailPrice}</span>
                      <Badge variant="outline">{selectedItem.productType}</Badge>
                    </div>
                    <p className="text-muted-foreground text-sm">{selectedItem.description}</p>
                  </div>
                  <GoodsStorySection goodsId={selectedItem.id} />
                  {selectedItem.sizes?.length > 0 && (
                    <div>
                      <span className="text-xs text-muted-foreground">Available sizes: </span>
                      <span className="text-xs text-foreground">{selectedItem.sizes.join(', ')}</span>
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
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => setOrderStep('shipping')}
                    disabled={!selectedSize}
                  >
                    Continue to Shipping
                  </Button>
                </>
              )}

              {orderStep === 'shipping' && (
                <>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Country / Region *</label>
                      <Select
                        value={shippingForm.country}
                        onValueChange={(val) => {
                          const countryInfo = getCountryInfo(val);
                          setShippingForm(f => ({ ...f, country: val, state: '', zip: '', phoneDialCode: countryInfo.dialCode }));
                          setShippingEstimate(null);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {COUNTRIES.map(c => (
                            <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Full Name *</label>
                      <Input
                        value={shippingForm.name}
                        onChange={(e) => setShippingForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Full Name"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Email *</label>
                      <Input
                        type="email"
                        value={shippingForm.email}
                        onChange={(e) => setShippingForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="email@example.com"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">{getCountryInfo(shippingForm.country).addressLabel} *</label>
                      <Input
                        value={shippingForm.address1}
                        onChange={(e) => { setShippingForm(f => ({ ...f, address1: e.target.value })); setShippingEstimate(null); }}
                        placeholder={getCountryInfo(shippingForm.country).addressPlaceholder}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">{getCountryInfo(shippingForm.country).address2Label}</label>
                      <Input
                        value={shippingForm.address2}
                        onChange={(e) => setShippingForm(f => ({ ...f, address2: e.target.value }))}
                        placeholder={getCountryInfo(shippingForm.country).address2Placeholder}
                      />
                    </div>
                    <div className={`grid gap-2 ${getCountryInfo(shippingForm.country).stateLabel ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      <div>
                        <label className="text-xs text-muted-foreground">{getCountryInfo(shippingForm.country).cityLabel} *</label>
                        <Input
                          value={shippingForm.city}
                          onChange={(e) => { setShippingForm(f => ({ ...f, city: e.target.value })); setShippingEstimate(null); }}
                          placeholder={getCountryInfo(shippingForm.country).cityPlaceholder}
                        />
                      </div>
                      {getCountryInfo(shippingForm.country).stateLabel && (
                        <div>
                          <label className="text-xs text-muted-foreground">{getCountryInfo(shippingForm.country).stateLabel}</label>
                          <Input
                            value={shippingForm.state}
                            onChange={(e) => setShippingForm(f => ({ ...f, state: e.target.value }))}
                            placeholder={getCountryInfo(shippingForm.country).statePlaceholder || 'State'}
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">{getCountryInfo(shippingForm.country).zipLabel} *</label>
                      <Input
                        value={shippingForm.zip}
                        onChange={(e) => { setShippingForm(f => ({ ...f, zip: e.target.value })); setShippingEstimate(null); }}
                        placeholder={getCountryInfo(shippingForm.country).zipPlaceholder}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Phone</label>
                      <div className="flex gap-1.5">
                        <Select
                          value={shippingForm.phoneDialCode}
                          onValueChange={(v) => setShippingForm(f => ({ ...f, phoneDialCode: v }))}
                        >
                          <SelectTrigger className="w-[90px] flex-shrink-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from(new Set(COUNTRIES.map(c => c.dialCode))).sort().map(dc => (
                              <SelectItem key={dc} value={dc}>
                                {dc}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          className="flex-1"
                          value={shippingForm.phone}
                          onChange={(e) => {
                            let raw = e.target.value.replace(/[^\d]/g, '');
                            if (shippingForm.country === 'KR' && raw.startsWith('010')) {
                              if (raw.length > 11) raw = raw.slice(0, 11);
                              if (raw.length > 7) raw = `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7)}`;
                              else if (raw.length > 3) raw = `${raw.slice(0, 3)}-${raw.slice(3)}`;
                            } else if (shippingForm.country === 'JP' && raw.startsWith('0')) {
                              if (raw.length > 11) raw = raw.slice(0, 11);
                              if (raw.length > 5) raw = `${raw.slice(0, 3)}-${raw.slice(3, raw.length - 4)}-${raw.slice(-4)}`;
                              else if (raw.length > 3) raw = `${raw.slice(0, 3)}-${raw.slice(3)}`;
                            }
                            setShippingForm(f => ({ ...f, phone: raw }));
                          }}
                          placeholder={getCountryInfo(shippingForm.country).phoneLocalPlaceholder}
                          type="tel"
                        />
                      </div>
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
                        {(shippingEstimate.shipping_rates || []).length > 0 ? (
                          (shippingEstimate.shipping_rates as any[]).map((opt: any, i: number) => (
                            <div key={i} className="flex justify-between text-xs text-foreground py-1">
                              <span>{opt.name}</span>
                              <span className="font-semibold">${opt.rate} ({opt.minDeliveryDays}-{opt.maxDeliveryDays} days)</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-foreground">No shipping options available</div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                  <Button
                    className="w-full"
                    onClick={async () => {
                      setOrderStep('payment');
                      try {
                        const prepareRes = await fetch(`/api/goods/${selectedItem.id}/prepare-payment`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            buyerWallet: walletAddress,
                            shippingAddress: {
                              address1: shippingForm.address1,
                              address2: shippingForm.address2 || undefined,
                              city: shippingForm.city,
                              state_code: shippingForm.state || undefined,
                              country_code: shippingForm.country,
                              zip: shippingForm.zip,
                            },
                          }),
                        });
                        if (prepareRes.ok) {
                          const payData = await prepareRes.json();
                          setPaymentInfo(payData);
                        }
                      } catch {}
                    }}
                    disabled={!shippingForm.name || !shippingForm.email || !shippingForm.address1 || !shippingForm.city || !shippingForm.country || !shippingForm.zip || !shippingEstimate?.shipping_rates?.length}
                  >
                    Continue to Payment
                  </Button>
                </>
              )}

              {orderStep === 'payment' && (
                <>
                  <Card className="border-primary/30">
                    <CardContent className="p-4 space-y-3">
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <Wallet className="h-4 w-4" /> SOL Payment
                      </h3>
                      <div className="flex items-center gap-3 p-3 bg-accent/30 rounded-lg">
                        <img src={selectedItem.imageUrl} alt="" className="w-14 h-14 rounded object-cover" />
                        <div>
                          <div className="font-semibold text-sm text-foreground">{selectedItem.title}</div>
                          <div className="text-xs text-muted-foreground">Size: {selectedSize}</div>
                          <div className="text-primary font-bold">${selectedItem.retailPrice}</div>
                        </div>
                      </div>
                      {paymentInfo && (
                        <div className="space-y-1 p-3 bg-accent/20 rounded-lg">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Product</span>
                            <span className="text-foreground">${selectedItem.retailPrice}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Shipping</span>
                            <span className="text-foreground">${(paymentInfo.totalUSD - selectedItem.retailPrice).toFixed(2)}</span>
                          </div>
                          <div className="border-t border-border my-1" />
                          <div className="flex justify-between text-sm font-bold">
                            <span className="text-foreground">Total (USD)</span>
                            <span className="text-foreground">${paymentInfo.totalUSD.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm font-bold text-primary">
                            <span>Pay in SOL</span>
                            <span>{paymentInfo.solAmount} SOL</span>
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground text-center">
                        SOL will be sent to the SAMU Treasury wallet. The transaction will be verified on-chain before your order is placed.
                      </p>
                    </CardContent>
                  </Card>
                  <Button
                    className="w-full"
                    onClick={handlePaySOL}
                    disabled={isPaying}
                  >
                    {isPaying ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing Payment...</>
                    ) : (
                      <><Wallet className="h-4 w-4 mr-2" /> Pay with SOL</>
                    )}
                  </Button>
                </>
              )}

              {orderStep === 'confirm' && (() => {
                const data = orderDataRef.current;
                const item = selectedItem || data?.item;
                const payment = paymentInfo || data?.paymentInfo;
                const sig = txSignature || data?.txSignature;
                const size = selectedSize || data?.size;
                const shipping = shippingForm.name ? shippingForm : data?.shippingForm || shippingForm;
                if (!item) return <div className="text-center text-muted-foreground p-4">Order data lost. Please try again.</div>;
                return (
                  <>
                    <Card className="border-green-500/30">
                      <CardContent className="p-4 space-y-3">
                        <h3 className="font-semibold text-green-400">Payment Confirmed</h3>
                        <div className="flex items-center gap-3">
                          <img src={item.imageUrl} alt="" className="w-16 h-16 rounded object-cover" />
                          <div>
                            <div className="font-semibold text-sm text-foreground">{item.title}</div>
                            <div className="text-xs text-muted-foreground">Size: {size}</div>
                            {payment && (
                              <div className="text-primary font-bold">{payment.solAmount} SOL (${payment.totalUSD.toFixed(2)})</div>
                            )}
                          </div>
                        </div>
                        {sig && (
                          <div className="text-xs text-muted-foreground break-all">
                            TX: <a href={`https://solscan.io/tx/${sig}`} target="_blank" rel="noopener noreferrer" className="text-primary underline">{sig.slice(0, 16)}...{sig.slice(-8)}</a>
                          </div>
                        )}
                        <div className="border-t border-border pt-2 space-y-1">
                          <div className="text-xs text-muted-foreground">Ship to:</div>
                          <div className="text-sm text-foreground">{shipping.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {shipping.address1}{shipping.address2 ? `, ${shipping.address2}` : ''}<br />
                            {shipping.city}, {shipping.state} {shipping.zip}<br />
                            {getCountryInfo(shipping.country).name}
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
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting Order to Printful...</>
                      ) : (
                        <><ShoppingCart className="h-4 w-4 mr-2" /> Confirm & Submit Order</>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Your sticker will be printed and shipped by Printful to the address above.
                    </p>
                  </>
                );
              })()}
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
