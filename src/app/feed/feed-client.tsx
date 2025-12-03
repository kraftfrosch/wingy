"use client";

import { motion } from "framer-motion";
import { Heart, MessageCircle, Mic, User, LogOut } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FeedClientProps {
  user: any; // User object from Supabase
}

export default function FeedClient({ user }: FeedClientProps) {
  const router = useRouter();
  const supabase = createSupabaseClient();

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.push("/login");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Error signing out");
    }
  };

  const cards = [
    { name: "Sarah", age: 24, tag: "Bookworm", color: "bg-orange-50" },
    { name: "Mike", age: 27, tag: "Hiker", color: "bg-green-50" },
    { name: "Jessica", age: 23, tag: "Artist", color: "bg-blue-50" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 relative overflow-hidden">
      {/* Header */}
      <header className="bg-background/80 backdrop-blur-md px-6 py-4 sticky top-0 z-50 flex justify-between items-center border-b border-border/40">
        <h1 className="text-3xl font-bold text-primary font-heading">
          VoiceDate
        </h1>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center overflow-hidden hover:bg-secondary/80 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              <User className="w-5 h-5 text-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-lg p-2">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">
              {user?.email}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-destructive cursor-pointer focus:text-destructive focus:bg-destructive/10 rounded-md"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Feed */}
      <main className="p-4 space-y-6 max-w-md mx-auto relative z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground font-heading">Discover</h2>
          <span className="text-sm text-muted-foreground">San Francisco, CA</span>
        </div>

        {cards.map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card rounded-xl overflow-hidden shadow-sm border border-border/50"
          >
            <div className={`h-52 ${card.color} relative group transition-colors`}>
              <div className="absolute inset-0 flex items-center justify-center">
                 {/* Voice Glow Effect */}
                <div className="absolute w-32 h-32 bg-primary/20 rounded-full blur-[50px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <Mic className="w-12 h-12 text-foreground/10 group-hover:scale-110 transition-transform duration-500 relative z-10" />
              </div>
              <div className="absolute bottom-4 left-4">
                <div className="bg-white/60 backdrop-blur-md px-4 py-1.5 rounded-md text-xs font-medium shadow-sm border border-white/20">
                  {card.tag}
                </div>
              </div>
            </div>

            <div className="p-6 pt-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-3xl font-bold text-foreground font-heading">
                    {card.name}, {card.age}
                  </h3>
                  <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                    "I love spending weekends exploring new coffee shops..."
                  </p>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button className="flex-1 bg-secondary hover:bg-secondary/80 text-foreground py-4 rounded-md font-medium transition-colors flex items-center justify-center gap-2 shadow-sm">
                  <Mic className="w-4 h-4" />
                  Talk to Agent
                </button>
                <button className="w-16 bg-primary/10 hover:bg-primary/20 text-primary rounded-md flex items-center justify-center transition-colors">
                  <Heart className="w-6 h-6" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-border/40 px-8 py-4 flex justify-between items-center max-w-md mx-auto pb-8 z-50">
        <button className="text-primary flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center mb-1">
             <div className="w-2 h-2 bg-primary rounded-full" />
          </div>
        </button>
        
         <div className="absolute left-1/2 top-[-20px] -translate-x-1/2">
             <button className="w-16 h-16 bg-primary rounded-2xl shadow-lg shadow-primary/30 flex items-center justify-center text-white hover:scale-105 transition-transform">
                 <Mic className="w-8 h-8" />
             </button>
         </div>

        <button className="text-muted-foreground hover:text-foreground flex flex-col items-center gap-1">
          <div className="w-12 h-12 flex items-center justify-center mb-1">
             <MessageCircle className="w-7 h-7" />
          </div>
        </button>
      </nav>
    </div>
  );
}
