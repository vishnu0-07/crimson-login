import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LogOut, FileText, Search, Briefcase, GraduationCap } from "lucide-react";
import ResumeUpload from "@/components/dashboard/ResumeUpload";
import JobSearch from "@/components/dashboard/JobSearch";
import AISuggestions from "@/components/dashboard/AISuggestions";
import MyApplications from "@/components/dashboard/MyApplications";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [resumes, setResumes] = useState<any[]>([]);
  const [selectedResume, setSelectedResume] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      await fetchResumes(session.user.id);
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        navigate("/auth");
      } else if (session) {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchResumes = async (userId: string) => {
    const { data, error } = await supabase
      .from("resumes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching resumes:", error);
      return;
    }

    setResumes(data || []);
    if (data && data.length > 0) {
      setSelectedResume(data[0]);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({ title: "Signed out successfully" });
    navigate("/auth");
  };

  const handleResumeUploaded = (resume: any) => {
    setResumes([resume, ...resumes]);
    setSelectedResume(resume);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse-glow">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <FileText className="w-8 h-8 text-primary animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Background effects */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,0,64,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,0,64,0.03)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none" />
      
      {/* Header */}
      <header className="relative z-10 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center neon-glow">
              <Briefcase className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary neon-text">JOB HUNTER</h1>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleSignOut} className="border-border hover:border-primary">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-8">
        <Tabs defaultValue="resumes" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-card border border-border">
            <TabsTrigger value="resumes" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileText className="w-4 h-4 mr-2" />
              My Resumes
            </TabsTrigger>
            <TabsTrigger value="search" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Search className="w-4 h-4 mr-2" />
              Search Jobs
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <GraduationCap className="w-4 h-4 mr-2" />
              AI Suggestions
            </TabsTrigger>
            <TabsTrigger value="applications" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Briefcase className="w-4 h-4 mr-2" />
              Applications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="resumes">
            <ResumeUpload 
              userId={user?.id} 
              resumes={resumes} 
              selectedResume={selectedResume}
              onResumeUploaded={handleResumeUploaded}
              onResumeSelected={setSelectedResume}
            />
          </TabsContent>

          <TabsContent value="search">
            <JobSearch userId={user?.id} selectedResume={selectedResume} />
          </TabsContent>

          <TabsContent value="suggestions">
            <AISuggestions userId={user?.id} selectedResume={selectedResume} />
          </TabsContent>

          <TabsContent value="applications">
            <MyApplications userId={user?.id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
