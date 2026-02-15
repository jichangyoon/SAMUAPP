import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { usePrivy } from '@privy-io/react-auth';
import { useSolanaWallets, useSignTransaction } from '@privy-io/react-auth/solana';
import { Connection, Transaction } from '@solana/web3.js';
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ShoppingCart, ShoppingBag, Sticker, Package, Truck, ChevronRight, Loader2, X, ArrowLeft, ChevronLeft, Wallet } from "lucide-react";

type OrderStep = 'browse' | 'detail' | 'options' | 'shipping' | 'payment' | 'confirm';

const COUNTRIES = [
  { code: 'US', name: 'United States', zipLabel: 'ZIP Code', zipPlaceholder: '10001', stateLabel: 'State', statePlaceholder: 'NY', cityLabel: 'City', cityPlaceholder: 'New York', addressLabel: 'Street Address', addressPlaceholder: '123 Main St', address2Label: 'Apt / Suite / Floor', address2Placeholder: 'Apt 4B (optional)', phonePlaceholder: '+1 555 123 4567' },
  { code: 'KR', name: 'South Korea (한국)', zipLabel: '우편번호 (Postal Code)', zipPlaceholder: '06130', stateLabel: '시/도', statePlaceholder: '서울특별시', cityLabel: '구/군', cityPlaceholder: '강남구', addressLabel: '상세주소 (Address)', addressPlaceholder: '테헤란로 123', address2Label: '동/호수 (Unit)', address2Placeholder: '101동 202호 (optional)', phonePlaceholder: '+82 10 1234 5678' },
  { code: 'JP', name: 'Japan (日本)', zipLabel: '郵便番号 (Postal Code)', zipPlaceholder: '100-0001', stateLabel: '都道府県 (Prefecture)', statePlaceholder: '東京都', cityLabel: '市区町村 (City)', cityPlaceholder: '千代田区', addressLabel: '番地 (Address)', addressPlaceholder: '丸の内1-1-1', address2Label: '建物名 (Building)', address2Placeholder: 'マンション101号 (optional)', phonePlaceholder: '+81 90 1234 5678' },
  { code: 'CN', name: 'China (中国)', zipLabel: '邮编 (Postal Code)', zipPlaceholder: '100000', stateLabel: '省/市 (Province)', statePlaceholder: '北京市', cityLabel: '区/县 (District)', cityPlaceholder: '朝阳区', addressLabel: '详细地址 (Address)', addressPlaceholder: '建国路88号', address2Label: '楼/室 (Unit)', address2Placeholder: '1栋101室 (optional)', phonePlaceholder: '+86 138 0013 8000' },
  { code: 'GB', name: 'United Kingdom', zipLabel: 'Postcode', zipPlaceholder: 'SW1A 1AA', stateLabel: 'County', statePlaceholder: 'London', cityLabel: 'City / Town', cityPlaceholder: 'London', addressLabel: 'Street Address', addressPlaceholder: '10 Downing Street', address2Label: 'Flat / Unit', address2Placeholder: 'Flat 2 (optional)', phonePlaceholder: '+44 20 7946 0958' },
  { code: 'CA', name: 'Canada', zipLabel: 'Postal Code', zipPlaceholder: 'K1A 0B1', stateLabel: 'Province', statePlaceholder: 'ON', cityLabel: 'City', cityPlaceholder: 'Toronto', addressLabel: 'Street Address', addressPlaceholder: '123 Main St', address2Label: 'Apt / Suite', address2Placeholder: 'Suite 100 (optional)', phonePlaceholder: '+1 416 555 0123' },
  { code: 'AU', name: 'Australia', zipLabel: 'Postcode', zipPlaceholder: '2000', stateLabel: 'State', statePlaceholder: 'NSW', cityLabel: 'City / Suburb', cityPlaceholder: 'Sydney', addressLabel: 'Street Address', addressPlaceholder: '123 George St', address2Label: 'Unit / Level', address2Placeholder: 'Unit 5 (optional)', phonePlaceholder: '+61 2 1234 5678' },
  { code: 'DE', name: 'Germany (Deutschland)', zipLabel: 'PLZ', zipPlaceholder: '10115', stateLabel: 'Bundesland', statePlaceholder: 'Berlin', cityLabel: 'Stadt (City)', cityPlaceholder: 'Berlin', addressLabel: 'Straße (Street)', addressPlaceholder: 'Friedrichstr. 123', address2Label: 'Wohnung (Apt)', address2Placeholder: 'Wohnung 4 (optional)', phonePlaceholder: '+49 30 123456' },
  { code: 'FR', name: 'France', zipLabel: 'Code Postal', zipPlaceholder: '75001', stateLabel: 'Région', statePlaceholder: 'Île-de-France', cityLabel: 'Ville (City)', cityPlaceholder: 'Paris', addressLabel: 'Adresse (Address)', addressPlaceholder: '12 Rue de Rivoli', address2Label: 'Complément', address2Placeholder: 'Bât. A, Étage 3 (optional)', phonePlaceholder: '+33 1 23 45 67 89' },
  { code: 'SG', name: 'Singapore', zipLabel: 'Postal Code', zipPlaceholder: '018956', stateLabel: '', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: 'Singapore', addressLabel: 'Street Address', addressPlaceholder: '1 Raffles Place', address2Label: 'Unit / Floor', address2Placeholder: '#01-01 (optional)', phonePlaceholder: '+65 6123 4567' },
  { code: 'TH', name: 'Thailand (ไทย)', zipLabel: 'Postal Code', zipPlaceholder: '10110', stateLabel: 'Province', statePlaceholder: 'Bangkok', cityLabel: 'District', cityPlaceholder: 'Pathum Wan', addressLabel: 'Address', addressPlaceholder: '123 Rama I Rd', address2Label: 'Unit / Floor', address2Placeholder: 'Floor 5 (optional)', phonePlaceholder: '+66 2 123 4567' },
  { code: 'VN', name: 'Vietnam (Việt Nam)', zipLabel: 'Postal Code', zipPlaceholder: '100000', stateLabel: 'Province', statePlaceholder: 'Hanoi', cityLabel: 'District', cityPlaceholder: 'Ba Dinh', addressLabel: 'Address', addressPlaceholder: '12 Hoang Dieu', address2Label: 'Unit', address2Placeholder: 'P.301 (optional)', phonePlaceholder: '+84 24 1234 5678' },
  { code: 'PH', name: 'Philippines', zipLabel: 'ZIP Code', zipPlaceholder: '1000', stateLabel: 'Province', statePlaceholder: 'Metro Manila', cityLabel: 'City', cityPlaceholder: 'Makati', addressLabel: 'Street Address', addressPlaceholder: '123 Ayala Ave', address2Label: 'Unit / Floor', address2Placeholder: 'Unit 5A (optional)', phonePlaceholder: '+63 2 1234 5678' },
  { code: 'IN', name: 'India (भारत)', zipLabel: 'PIN Code', zipPlaceholder: '110001', stateLabel: 'State', statePlaceholder: 'Delhi', cityLabel: 'City', cityPlaceholder: 'New Delhi', addressLabel: 'Street Address', addressPlaceholder: '123 MG Road', address2Label: 'Flat / Floor', address2Placeholder: 'Flat 301 (optional)', phonePlaceholder: '+91 98765 43210' },
  { code: 'BR', name: 'Brazil (Brasil)', zipLabel: 'CEP', zipPlaceholder: '01001-000', stateLabel: 'Estado (State)', statePlaceholder: 'SP', cityLabel: 'Cidade (City)', cityPlaceholder: 'São Paulo', addressLabel: 'Endereço (Address)', addressPlaceholder: 'Rua Augusta, 123', address2Label: 'Complemento', address2Placeholder: 'Apto 45 (optional)', phonePlaceholder: '+55 11 91234 5678' },
  { code: 'MX', name: 'Mexico (México)', zipLabel: 'Código Postal', zipPlaceholder: '06000', stateLabel: 'Estado (State)', statePlaceholder: 'CDMX', cityLabel: 'Ciudad (City)', cityPlaceholder: 'Ciudad de México', addressLabel: 'Dirección (Address)', addressPlaceholder: 'Av. Reforma 123', address2Label: 'Depto / Int.', address2Placeholder: 'Int. 4 (optional)', phonePlaceholder: '+52 55 1234 5678' },
  { code: 'ES', name: 'Spain (España)', zipLabel: 'Código Postal', zipPlaceholder: '28001', stateLabel: 'Provincia', statePlaceholder: 'Madrid', cityLabel: 'Ciudad (City)', cityPlaceholder: 'Madrid', addressLabel: 'Dirección (Address)', addressPlaceholder: 'Calle Mayor 1', address2Label: 'Piso / Puerta', address2Placeholder: '2ºA (optional)', phonePlaceholder: '+34 612 345 678' },
  { code: 'IT', name: 'Italy (Italia)', zipLabel: 'CAP', zipPlaceholder: '00100', stateLabel: 'Provincia', statePlaceholder: 'Roma', cityLabel: 'Città (City)', cityPlaceholder: 'Roma', addressLabel: 'Indirizzo (Address)', addressPlaceholder: 'Via Roma 1', address2Label: 'Interno (Unit)', address2Placeholder: 'Int. 3 (optional)', phonePlaceholder: '+39 06 1234 5678' },
  { code: 'NL', name: 'Netherlands', zipLabel: 'Postcode', zipPlaceholder: '1012 AB', stateLabel: 'Province', statePlaceholder: 'NH', cityLabel: 'City', cityPlaceholder: 'Amsterdam', addressLabel: 'Street Address', addressPlaceholder: 'Herengracht 123', address2Label: 'Unit', address2Placeholder: '2e verdieping (optional)', phonePlaceholder: '+31 20 123 4567' },
  { code: 'SE', name: 'Sweden (Sverige)', zipLabel: 'Postnummer', zipPlaceholder: '111 21', stateLabel: 'Län', statePlaceholder: 'Stockholm', cityLabel: 'Stad (City)', cityPlaceholder: 'Stockholm', addressLabel: 'Gatuadress (Address)', addressPlaceholder: 'Drottninggatan 1', address2Label: 'Lägenhet (Apt)', address2Placeholder: 'Lgh 1201 (optional)', phonePlaceholder: '+46 8 123 456' },
];

function getCountryInfo(code: string) {
  const fallback = { code, name: code, zipLabel: 'Postal Code', zipPlaceholder: '00000', stateLabel: 'State / Province', statePlaceholder: '', cityLabel: 'City', cityPlaceholder: 'City', addressLabel: 'Street Address', addressPlaceholder: 'Street address', address2Label: 'Apt / Suite', address2Placeholder: 'Apt (optional)', phonePlaceholder: '+1 000 000 0000' };
  return COUNTRIES.find(c => c.code === code) || fallback;
}

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
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [txSignature, setTxSignature] = useState<string>('');
  const [isPaying, setIsPaying] = useState(false);
  const { authenticated, user } = usePrivy();
  const { toast } = useToast();
  const { signTransaction } = useSignTransaction();
  const { wallets: solWallets } = useSolanaWallets();

  const walletAddress = (user as any)?.wallet?.address || '';

  const solConnection = new Connection(
    import.meta.env.VITE_HELIUS_API_KEY
      ? `https://rpc.helius.xyz/?api-key=${import.meta.env.VITE_HELIUS_API_KEY}`
      : 'https://api.mainnet-beta.solana.com',
    'confirmed'
  );

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

  const handlePaySOL = useCallback(async () => {
    if (!selectedItem || !walletAddress) return;

    setIsPaying(true);
    try {
      const shippingCost = shippingEstimate?.shipping_rates?.[0]?.rate ||
        (Array.isArray(shippingEstimate) ? shippingEstimate[0]?.rate : null) || 0;

      toast({ title: "Preparing SOL payment...", duration: 3000 });

      const prepareRes = await fetch(`/api/goods/${selectedItem.id}/prepare-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyerWallet: walletAddress, shippingCostUSD: shippingCost }),
      });

      if (!prepareRes.ok) {
        const err = await prepareRes.json();
        throw new Error(err.error || 'Failed to prepare payment');
      }

      const payData = await prepareRes.json();
      setPaymentInfo(payData);

      toast({ title: "Please sign the transaction in your wallet", duration: 5000 });

      const transaction = Transaction.from(Buffer.from(payData.transaction, 'base64'));
      const signedTx = await signTransaction({ transaction, connection: solConnection });
      const sig = await solConnection.sendRawTransaction(signedTx.serialize());
      await solConnection.confirmTransaction(sig, 'confirmed');

      setTxSignature(sig);
      toast({ title: "Payment confirmed!", description: `TX: ${sig.slice(0, 8)}...` });
      setOrderStep('confirm');
    } catch (err: any) {
      console.error("SOL payment error:", err);
      toast({ title: "Payment failed", description: err.message, variant: "destructive" });
    } finally {
      setIsPaying(false);
    }
  }, [selectedItem, walletAddress, shippingEstimate, signTransaction, solConnection]);

  const placeOrderMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/goods/${selectedItem.id}/order`, {
        size: selectedSize,
        color: selectedColor,
        buyerWallet: walletAddress,
        buyerEmail: shippingForm.email,
        txSignature,
        solAmount: paymentInfo?.solAmount,
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
    setShippingForm({ name: '', email: '', address1: '', address2: '', city: '', state: '', country: 'US', zip: '', phone: '' });
    setShippingEstimate(null);
    setPaymentInfo(null);
    setTxSignature('');
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
                      {order.size} - ${order.totalPrice}
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
            <Sticker className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">No stickers available yet.</p>
            <p className="text-muted-foreground text-xs mt-1">Contest-winning memes will become stickers here!</p>
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
                        onValueChange={(val) => setShippingForm(f => ({ ...f, country: val, state: '', zip: '' }))}
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
                        onChange={(e) => setShippingForm(f => ({ ...f, address1: e.target.value }))}
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
                          onChange={(e) => setShippingForm(f => ({ ...f, city: e.target.value }))}
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
                        onChange={(e) => setShippingForm(f => ({ ...f, zip: e.target.value }))}
                        placeholder={getCountryInfo(shippingForm.country).zipPlaceholder}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Phone</label>
                      <Input
                        value={shippingForm.phone}
                        onChange={(e) => setShippingForm(f => ({ ...f, phone: e.target.value }))}
                        placeholder={getCountryInfo(shippingForm.country).phonePlaceholder}
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
                    onClick={async () => {
                      setOrderStep('payment');
                      try {
                        const shippingCost = shippingEstimate?.shipping_rates?.[0]?.rate ||
                          (Array.isArray(shippingEstimate) ? shippingEstimate[0]?.rate : null) || 0;
                        const prepareRes = await fetch(`/api/goods/${selectedItem.id}/prepare-payment`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ buyerWallet: walletAddress, shippingCostUSD: shippingCost }),
                        });
                        if (prepareRes.ok) {
                          const payData = await prepareRes.json();
                          setPaymentInfo(payData);
                        }
                      } catch {}
                    }}
                    disabled={!shippingForm.name || !shippingForm.email || !shippingForm.address1 || !shippingForm.city || !shippingForm.country || !shippingForm.zip}
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
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">SOL Price</span>
                            <span className="text-foreground">${paymentInfo.solPriceUSD.toFixed(2)}</span>
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

              {orderStep === 'confirm' && (
                <>
                  <Card className="border-green-500/30">
                    <CardContent className="p-4 space-y-3">
                      <h3 className="font-semibold text-green-400">Payment Confirmed</h3>
                      <div className="flex items-center gap-3">
                        <img src={selectedItem.imageUrl} alt="" className="w-16 h-16 rounded object-cover" />
                        <div>
                          <div className="font-semibold text-sm text-foreground">{selectedItem.title}</div>
                          <div className="text-xs text-muted-foreground">Size: {selectedSize}</div>
                          {paymentInfo && (
                            <div className="text-primary font-bold">{paymentInfo.solAmount} SOL (${paymentInfo.totalUSD.toFixed(2)})</div>
                          )}
                        </div>
                      </div>
                      {txSignature && (
                        <div className="text-xs text-muted-foreground break-all">
                          TX: <a href={`https://solscan.io/tx/${txSignature}`} target="_blank" rel="noopener noreferrer" className="text-primary underline">{txSignature.slice(0, 16)}...{txSignature.slice(-8)}</a>
                        </div>
                      )}
                      <div className="border-t border-border pt-2 space-y-1">
                        <div className="text-xs text-muted-foreground">Ship to:</div>
                        <div className="text-sm text-foreground">{shippingForm.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {shippingForm.address1}{shippingForm.address2 ? `, ${shippingForm.address2}` : ''}<br />
                          {shippingForm.city}, {shippingForm.state} {shippingForm.zip}<br />
                          {getCountryInfo(shippingForm.country).name}
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
              )}
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
