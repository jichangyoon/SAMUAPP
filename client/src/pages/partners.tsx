import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Rocket } from "lucide-react";
import { partners } from "@/data/partners";

export function Partners() {
  const [, setLocation] = useLocation();

  return (
    <div 
      className="min-h-screen bg-background text-foreground transition-transform duration-300 ease-out"
      onTouchStart={(e) => {
        const touch = e.touches[0];
        (e.currentTarget as any).touchStartX = touch.clientX;
        (e.currentTarget as any).touchStartTime = Date.now();
      }}
      onTouchMove={(e) => {
        const touch = e.touches[0];
        const touchStartX = (e.currentTarget as any).touchStartX;
        const deltaX = touch.clientX - touchStartX;
        
        // Only apply transform for right swipe
        if (deltaX > 0) {
          const progress = Math.min(deltaX / 150, 1);
          (e.currentTarget as HTMLElement).style.transform = `translateX(${deltaX * 0.3}px)`;
          (e.currentTarget as HTMLElement).style.opacity = String(1 - progress * 0.2);
        }
      }}
      onTouchEnd={(e) => {
        const touch = e.changedTouches[0];
        const touchStartX = (e.currentTarget as any).touchStartX;
        const touchStartTime = (e.currentTarget as any).touchStartTime;
        const touchEndX = touch.clientX;
        const deltaX = touchEndX - touchStartX;
        const deltaTime = Date.now() - touchStartTime;
        
        // Reset transform
        (e.currentTarget as HTMLElement).style.transform = 'translateX(0)';
        (e.currentTarget as HTMLElement).style.opacity = '1';
        
        // Swipe right (left to right) to go back with velocity check
        if (deltaX > 100 && deltaTime < 300) {
          setLocation("/");
        }
      }}
    >
      {/* Header */}
      <header className="bg-card border-b border-border py-1">
        <div className="max-w-md mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation("/")}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold text-foreground">Partners</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 pb-24">
        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-500/20 via-orange-500/15 to-purple-600/20 border border-yellow-500/20 mb-8 p-6">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 bg-yellow-500/20 border border-yellow-500/30 rounded-full px-3 py-1 text-xs text-yellow-400 font-medium mb-1">
              <Rocket className="h-3 w-3" />
              Meme Incubator
            </div>
            
            <h2 className="text-xl font-bold leading-tight bg-gradient-to-r from-yellow-300 via-orange-300 to-yellow-400 bg-clip-text text-transparent">
              Transform Your Meme<br />into a Global IP
            </h2>
            
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
              Vote, mint, sell — turn any Solana meme into real-world IP.
            </p>
            
            <div className="flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                Contest
              </span>
              <span>→</span>
              <span>NFT</span>
              <span>→</span>
              <span>Goods</span>
              <span>→</span>
              <span className="text-yellow-400 font-medium">Rewards</span>
            </div>
          </div>
        </div>

        {/* Partners Grid */}
        <div className="space-y-4">
          <h3 className="text-md font-semibold text-foreground">Active Partners</h3>
          
          <div className="grid gap-4">
            {partners.filter(p => p.isActive).map((partner) => (
              <Card 
                key={partner.id} 
                className="bg-card border-border hover:border-primary/50 transition-all cursor-pointer group"
                onClick={() => setLocation(`/partner/${partner.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Partner Logo */}
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: partner.color }}
                    >
                      <img 
                        src={partner.logo} 
                        alt={partner.name}
                        className="w-10 h-10 rounded-full"
                      />
                    </div>
                    
                    {/* Partner Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {partner.name}
                        </h4>
                        <Badge 
                          variant="secondary" 
                          className="text-xs px-2 py-0.5"
                          style={{ 
                            backgroundColor: partner.color,
                            color: partner.color === '#FFFFFF' || partner.color === '#FFE4B5' ? '#000000' : '#FFFFFF',
                            borderColor: `${partner.color}40`
                          }}
                        >
                          {partner.symbol}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {partner.description}
                      </p>
                    </div>
                    
                    {/* Status Indicator */}
                    <div className="flex flex-col items-end gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-muted-foreground">Active</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Coming Soon Section */}
        <div className="mt-8 space-y-4">
          <h3 className="text-md font-semibold text-foreground">Coming Soon</h3>
          <Card className="bg-card/50 border-dashed border-muted">
            <CardContent className="p-6 text-center">
              <div className="text-muted-foreground space-y-2">
                <Users className="h-8 w-8 mx-auto opacity-50" />
                <p className="text-sm">More partner communities joining soon!</p>
                <p className="text-xs">Want to partner with us? Contact our team.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}