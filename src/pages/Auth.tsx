import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useDemo } from "@/hooks/useDemo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Zap, Eye } from "lucide-react";
import { toast } from "sonner";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { enableDemo } = useDemo();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) toast.error(error.message);
      else toast.success("Check your email to confirm your account.");
    }
    setLoading(false);
  };

  const handleDemoMode = () => {
    enableDemo();
    navigate("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="flex flex-col md:flex-row rounded-2xl border border-border overflow-hidden shadow-lg w-full max-w-5xl" style={{ background: 'rgba(20, 21, 26, 0.8)', backdropFilter: 'blur(10px)' }}>
        <div className="md:w-2/5 p-8 flex items-center justify-center">
          <Card className="w-full rounded-xl shadow-md">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="flex justify-center mb-3">
                  <Zap className="h-8 w-8 text-accent" />
                </div>
                <h1 className="font-serif text-2xl font-bold text-foreground">DailyProng</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {isLogin ? "Sign in to your learning engine" : "Create your account"}
                </p>
              </div>
              <div className="space-y-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
                  </Button>
                </form>
                <button onClick={() => setIsLogin(!isLogin)} className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </button>
                <div className="relative">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">or</span>
                </div>
                <Button variant="outline" className="w-full gap-2" onClick={handleDemoMode}>
                  <Eye className="h-4 w-4" />
                  Explore Demo
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="hidden md:flex md:w-3/5 flex-col items-center justify-center gap-6 p-8">
          <div className="max-w-md text-center space-y-3">
            <h2 className="font-serif text-3xl font-bold text-foreground">
              Don't be T-shaped. Be a prong.
            </h2>
            <p className="text-base text-foreground/80 leading-relaxed">
              The T-shape is the past; multiple is the future. Broaden your horizons, but dig deep into two or three distinct fields. It's where these areas overlap that your greatest ambition becomes reality.
            </p>
            <p className="text-lg italic text-foreground/80">Sharpen your prongs.</p>
          </div>
          <img
            src="/Fork.png"
            alt="Fork — sharpen your prongs"
            className="object-contain max-h-72 w-auto"
          />
        </div>
      </div>
    </div>
  );
};

export default Auth;