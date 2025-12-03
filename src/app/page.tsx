import Link from "next/link";
import { ArrowRight, Mic } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/30 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-pink-600/30 rounded-full blur-[100px]" />

      <main className="relative z-10 max-w-lg text-center space-y-8">
        <div className="mx-auto w-24 h-24 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-lg border border-white/10 mb-8">
          <Mic className="w-10 h-10 text-white" />
        </div>
        
        <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-purple-200 to-pink-200 bg-clip-text text-transparent">
          VoiceDate
        </h1>
        
        <p className="text-xl text-slate-300 leading-relaxed">
          Dating feels better when you can hear it. <br/>
          Skip the small talk and connect with your voice.
        </p>

        <div className="pt-8 space-y-4">
          <Link 
            href="/login"
            className="block w-full bg-white text-slate-900 py-4 px-8 rounded-full font-bold text-lg hover:bg-slate-100 transition-transform active:scale-95 flex items-center justify-center gap-2"
          >
            Get Started
            <ArrowRight className="w-5 h-5" />
          </Link>
          
          <p className="text-sm text-slate-500">
            Available on iOS and Android soon.
          </p>
        </div>
      </main>
    </div>
  );
}
