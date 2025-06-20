import { Link, useLocation } from "wouter";
import { Trophy, Archive, Image, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
}

const navItems: BottomNavItem[] = [
  {
    icon: Trophy,
    label: "밈콘테스트",
    path: "/",
  },
  {
    icon: Archive,
    label: "아카이브",
    path: "/archive",
  },
  {
    icon: Image,
    label: "NFT 전시관",
    path: "/nft-gallery",
  },
  {
    icon: ShoppingBag,
    label: "굿즈샵",
    path: "/goods",
  },
];

export function BottomNavigation() {
  const [location] = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 z-50">
      <div className="flex items-center justify-around py-2 px-4 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          
          return (
            <Link key={item.path} href={item.path} className="flex-1">
              <div className="flex flex-col items-center py-2 px-1">
                <Icon 
                  className={cn(
                    "w-6 h-6 transition-colors",
                    isActive ? "text-yellow-400" : "text-gray-400"
                  )}
                />
                <span 
                  className={cn(
                    "text-xs mt-1 transition-colors font-medium",
                    isActive ? "text-yellow-400" : "text-gray-400"
                  )}
                >
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}