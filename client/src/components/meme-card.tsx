import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import type { Meme } from "@shared/schema";

interface MemeCardProps {
  meme: Meme;
  onVote: () => void;
  canVote: boolean;
}

export function MemeCard({ meme }: MemeCardProps) {
  const [, navigate] = useLocation();

  const handleClick = () => {
    navigate(`/meme/${meme.id}`);
  };

  return (
    <Card 
      className="border-border bg-card cursor-pointer hover:opacity-80 transition-opacity"
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="aspect-square rounded-lg overflow-hidden mb-3">
          <img
            src={meme.imageUrl}
            alt={meme.title}
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="space-y-2">
          <h3 className="font-bold text-foreground text-sm">{meme.title}</h3>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-bold text-xs">
                  {meme.authorUsername?.slice(0, 2).toUpperCase() || 'AN'}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {meme.authorUsername || 'Anonymous'}
              </span>
            </div>
            <Badge variant="secondary" className="text-primary text-xs">
              {meme.votes} votes
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}