import { usePrivy } from '@privy-io/react-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Shield, Coins } from 'lucide-react';

export default function Login() {
  const { login } = usePrivy();

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-950 border-gray-800">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center">
            <img 
              src="/attached_assets/samu-logo.png" 
              alt="SAMU" 
              className="w-16 h-16 object-contain"
              onError={(e) => {
                e.currentTarget.innerHTML = '<span class="text-black font-bold text-lg">SAMU</span>';
              }}
            />
          </div>
          <CardTitle className="text-2xl font-bold text-white font-['Poppins']">
            Welcome to SAMU
          </CardTitle>
          <CardDescription className="text-gray-400 font-['Poppins']">
            Join the ultimate meme contest platform
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3 text-gray-300">
              <Coins className="w-5 h-5 text-yellow-400" />
              <span className="text-sm font-['Poppins']">Vote with SAMU tokens</span>
            </div>
            <div className="flex items-center space-x-3 text-gray-300">
              <Shield className="w-5 h-5 text-yellow-400" />
              <span className="text-sm font-['Poppins']">Secure wallet integration</span>
            </div>
            <div className="flex items-center space-x-3 text-gray-300">
              <Mail className="w-5 h-5 text-yellow-400" />
              <span className="text-sm font-['Poppins']">Easy email login</span>
            </div>
          </div>

          <Button 
            onClick={login}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-3 font-['Poppins']"
          >
            Login to Continue
          </Button>

          <p className="text-xs text-gray-500 text-center font-['Poppins']">
            By logging in, you agree to participate in the SAMU meme contest
          </p>
        </CardContent>
      </Card>
    </div>
  );
}