import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { searchJobs, Job } from "@/lib/api/jobs";
import { Search, Loader2, ExternalLink, MapPin, DollarSign, Briefcase } from "lucide-react";
import JobCard from "./JobCard";

interface JobSearchProps {
  userId: string;
  selectedResume: any;
}

const JobSearch = ({ userId, selectedResume }: JobSearchProps) => {
  const { toast } = useToast();
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<{ jobs: Job[]; summary: string; suggestions?: string[] } | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!company.trim() || !role.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter both company and role",
        variant: "destructive",
      });
      return;
    }

    setSearching(true);
    setResults(null);

    try {
      const result = await searchJobs({ company, role });
      
      if (!result.success) {
        throw new Error(result.error);
      }

      setResults(result.data || null);
      
      const realJobs = result.data?.jobs?.filter(j => j.isRealJob) || [];
      toast({
        title: "Search complete",
        description: `Found ${realJobs.length} job listings`,
      });
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Search failed",
        description: error instanceof Error ? error.message : "Failed to search jobs",
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <Card className="bg-card border-border neon-border">
        <CardHeader>
          <CardTitle className="text-primary neon-text">Search Jobs</CardTitle>
          <CardDescription>
            Enter a company and role to search for job openings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company">Company Name</Label>
                <Input
                  id="company"
                  placeholder="e.g., Google, Microsoft, Amazon"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="bg-input border-border focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role / Position</Label>
                <Input
                  id="role"
                  placeholder="e.g., Software Engineer, Product Manager"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="bg-input border-border focus:border-primary"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={searching}
              className="w-full bg-primary hover:bg-primary/90 neon-glow"
            >
              {searching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Search Jobs
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <div className="space-y-4">
          {/* Summary */}
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <p className="text-muted-foreground">{results.summary}</p>
            </CardContent>
          </Card>

          {/* Suggestions if no jobs found */}
          {results.suggestions && results.suggestions.length > 0 && (
            <Card className="bg-card border-border border-l-4 border-l-primary">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {results.suggestions.map((suggestion, idx) => (
                    <li key={idx}>{suggestion}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Job Listings */}
          <div className="space-y-4">
            {results.jobs?.filter(job => job.isRealJob).map((job, idx) => (
              <JobCard 
                key={idx} 
                job={job} 
                userId={userId} 
                resumeId={selectedResume?.id}
              />
            ))}
          </div>

          {results.jobs?.filter(job => job.isRealJob).length === 0 && (
            <Card className="bg-card border-border">
              <CardContent className="p-8 text-center">
                <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No job listings found</p>
                <p className="text-sm text-muted-foreground">Try different search terms</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default JobSearch;
