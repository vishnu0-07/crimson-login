import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Zap, ArrowRight } from "lucide-react";

const Index = () => {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
      {/* Background grid effect */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,0,64,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,0,64,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
      
      {/* Radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[150px]" />

      <div className="relative z-10 text-center px-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6 neon-glow animate-pulse-glow">
          <Zap className="w-10 h-10 text-primary" />
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold text-primary neon-text animate-neon-flicker mb-4">
          NEON SYSTEM
        </h1>
        
        <p className="text-xl text-muted-foreground max-w-md mx-auto mb-8">
          Enter the cyberpunk realm with our cutting-edge authentication system
        </p>

        <Link to="/auth">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-6 text-lg transition-all duration-300 hover:neon-glow-intense neon-glow group">
            ACCESS TERMINAL
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default Index;
