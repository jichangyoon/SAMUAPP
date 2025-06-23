// Partner meme coins data - using optimized WebP logos for faster loading
import wagusLogo from "@/assets/wagus-logo.webp";
import doctorbirdLogo from "@/assets/doctorbird-logo.webp";

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
    description: "The Future of Utility Tokens",
    logo: wagusLogo,
    color: "#FFFFFF",
    tokenAddress: "WAGUSxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    isActive: true
  },
  {
    id: "doctorbird",
    name: "DoctorBird",
    symbol: "BIRD",
    description: "DoctorBird vs. the Fallen Ministry of Health",
    logo: doctorbirdLogo,
    color: "#FFE4B5",
    tokenAddress: "BIRDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    isActive: true
  }
];