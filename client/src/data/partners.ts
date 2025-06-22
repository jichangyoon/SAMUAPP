// Partner meme coins data
export interface Partner {
  id: string;
  name: string;
  symbol: string;
  description: string;
  logo: string;
  color: string;
  tokenAddress: string;
  isActive: boolean;
}

export const partners: Partner[] = [
  {
    id: "bonk",
    name: "Bonk",
    symbol: "BONK",
    description: "The dog coin of Solana with a fun community",
    logo: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%23FF6B35'/%3E%3Ccircle cx='200' cy='200' r='150' fill='%23ffffff'/%3E%3Ctext x='200' y='220' text-anchor='middle' font-family='Arial' font-size='60' font-weight='bold' fill='%23FF6B35'%3EBONK%3C/text%3E%3C/svg%3E",
    color: "#FF6B35",
    tokenAddress: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    isActive: true
  },
  {
    id: "wif",
    name: "dogwifhat", 
    symbol: "WIF",
    description: "Just a dog in a hat bringing joy to Solana",
    logo: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%23FFB800'/%3E%3Ccircle cx='200' cy='200' r='150' fill='%23ffffff'/%3E%3Ctext x='200' y='220' text-anchor='middle' font-family='Arial' font-size='60' font-weight='bold' fill='%23FFB800'%3EWIF%3C/text%3E%3C/svg%3E",
    color: "#FFB800", 
    tokenAddress: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
    isActive: true
  },
  {
    id: "popcat",
    name: "POPCAT",
    symbol: "POPCAT", 
    description: "The viral cat meme taking over Solana",
    logo: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%23FF69B4'/%3E%3Ccircle cx='200' cy='200' r='150' fill='%23ffffff'/%3E%3Ctext x='200' y='220' text-anchor='middle' font-family='Arial' font-size='45' font-weight='bold' fill='%23FF69B4'%3EPOPCAT%3C/text%3E%3C/svg%3E",
    color: "#FF69B4",
    tokenAddress: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr",
    isActive: true
  },
  {
    id: "book",
    name: "Book of Meme",
    symbol: "BOME",
    description: "Decentralized book storing the dankest memes",
    logo: "data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%2300D4AA'/%3E%3Crect x='80' y='120' width='240' height='160' rx='20' fill='%23ffffff'/%3E%3Ctext x='200' y='220' text-anchor='middle' font-family='Arial' font-size='40' font-weight='bold' fill='%2300D4AA'%3EBOME%3C/text%3E%3C/svg%3E",
    color: "#00D4AA",
    tokenAddress: "ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82",
    isActive: true
  }
];