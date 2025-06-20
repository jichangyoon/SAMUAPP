import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Trophy } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import type { Meme } from "@shared/schema";

// Mock archive contest data
const archiveContests = [
  {
    id: 1,
    title: "December 2024 Contest",
    period: "Dec 1-31, 2024",
    status: "Completed",
    totalVotes: 15420,
    participantCount: 89,
    prizePool: "500,000 SAMU",
    memes: [
      { id: 1, title: "HODL STRONG", votes: 3420, author: "CryptoMemer", ranking: 1 },
      { id: 2, title: "Diamond Paws", votes: 2890, author: "ShibaLord", ranking: 2 },
      { id: 3, title: "Moon Mission", votes: 2150, author: "SpaceApe", ranking: 3 },
      { id: 4, title: "SAMU Army", votes: 1980, author: "TokenWarrior", ranking: 4 },
      { id: 5, title: "Degen Life", votes: 1750, author: "DegenKing", ranking: 5 },
      { id: 6, title: "Pump It Up", votes: 1320, author: "PumpMaster", ranking: 6 },
      { id: 7, title: "Bear Slayer", votes: 1010, author: "BullishBro", ranking: 7 },
      { id: 8, title: "Lambo Soon", votes: 890, author: "DreamChaser", ranking: 8 }
    ]
  }
];

export default function ArchiveDetail() {
  const [, navigate] = useLocation();
  const [, params] = useRoute('/archive/:id');
  const contestId = params?.id;
  const [selectedMeme, setSelectedMeme] = useState<any>(null);

  const contest = archiveContests.find(c => c.id.toString() === contestId);

  if (!contest) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-lg font-bold mb-4">Contest not found</h1>
          <Button onClick={() => navigate('/')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const getMedalIcon = (ranking: number) => {
    if (ranking === 1) return "🥇";
    if (ranking === 2) return "🥈";
    if (ranking === 3) return "🥉";
    return null;
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
            <h1 className="text-sm font-bold text-foreground">Contest Archive</h1>
            <div className="w-16" />
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Contest Info */}
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="text-center space-y-2">
              <h2 className="text-lg font-bold text-foreground">{contest.title}</h2>
              <p className="text-sm text-muted-foreground">{contest.period}</p>
              <div className="flex justify-center">
                <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                  <Trophy className="h-3 w-3 mr-1" />
                  {contest.totalVotes.toLocaleString()} Total Votes
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Memes Grid */}
        <div className="grid grid-cols-3 gap-2">
          {contest.memes.map((meme) => (
            <div
              key={meme.id}
              className="relative aspect-square bg-accent/30 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setSelectedMeme(meme)}
            >
              {/* Mock image - in real app would use meme.imageUrl */}
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <span className="text-xs text-muted-foreground text-center p-1">
                  {meme.title}
                </span>
              </div>
              
              {/* Medal overlay */}
              {getMedalIcon(meme.ranking) && (
                <div className="absolute top-1 left-1 text-sm">
                  {getMedalIcon(meme.ranking)}
                </div>
              )}
              
              {/* Vote count overlay */}
              <div className="absolute bottom-1 right-1 bg-black/50 text-white text-xs px-1 rounded">
                {meme.votes}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Meme Detail Modal */}
      {selectedMeme && (
        <Dialog open={!!selectedMeme} onOpenChange={() => setSelectedMeme(null)}>
          <DialogContent className="max-w-md mx-4 bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground flex items-center gap-2">
                {getMedalIcon(selectedMeme.ranking) && (
                  <span className="text-lg">{getMedalIcon(selectedMeme.ranking)}</span>
                )}
                {selectedMeme.title}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Contest Ranking: #{selectedMeme.ranking}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Mock meme image */}
              <div className="aspect-square rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <span className="text-muted-foreground">
                  {selectedMeme.title} Meme
                </span>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-primary font-bold text-xs">
                        {selectedMeme.author.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{selectedMeme.author}</p>
                      <p className="text-xs text-muted-foreground">Creator</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-purple-600">
                    {selectedMeme.votes.toLocaleString()} votes
                  </Badge>
                </div>
                
                <div className="text-center p-3 bg-accent/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    This meme finished in <span className="font-bold text-foreground">#{selectedMeme.ranking} place</span> in {contest.title}
                  </p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}