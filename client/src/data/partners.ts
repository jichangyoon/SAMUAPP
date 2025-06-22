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
    id: "wagus",
    name: "WAGUS",
    symbol: "WAGUS",
    description: "Community-driven meme coin with innovative utilities",
    logo: "@assets/20250622_124905_1750564614367.jpg",
    color: "#FFFFFF",
    tokenAddress: "WAGUSxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    isActive: true
  },
  {
    id: "doctorbird",
    name: "DoctorBird",
    symbol: "BIRD",
    description: "The healing bird bringing wellness to the crypto space",
    logo: "@assets/1738243385726_1750564660604.png",
    color: "#FFE4B5",
    tokenAddress: "BIRDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    isActive: true
  }
];