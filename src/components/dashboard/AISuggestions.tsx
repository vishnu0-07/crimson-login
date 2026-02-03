import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { searchJobs, Job } from "@/lib/api/jobs";
import { Sparkles, Loader2, Briefcase, AlertCircle } from "lucide-react";
import JobCard from "./JobCard";

interface AISuggestionsProps {
  userId: string;
  selectedResume: any;
}

const AISuggestions = ({ userId, selectedResume }: AISuggestionsProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ jobs: Job[]; summary: string; suggestions?: string[] } | null>(null);

  const handleGetSuggestions = async () => {
    if (!selectedResume) {
      toast({
        title: "No resume selected",
        description: "Please upload and select a resume first",
        variant: "destructive",
      });
      return;
    }

    if (!selectedResume.extracted_skills || selectedResume.extracted_skills.length === 0) {
      toast({
        title: "No skills found",
        description: "Your resume doesn't have any extracted skills. Try re-uploading.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResults(null);

    try {
      const result = await searchJobs({ skills: selectedResume.extracted_skills });
      
      if (!result.success) {
        throw new Error(result.error);
      }

      setResults(result.data || null);
      
      const realJobs = result.data?.jobs?.filter(j => j.isRealJob) || [];
      toast({
        title: "AI Analysis Complete",
        description: `Found ${realJobs.length} matching opportunities`,
      });
    } catch (error) {
      console.error("AI suggestion error:", error);
      toast({
        title: "Failed to get suggestions",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Analysis Card */}
      <Card className="bg-card border-border neon-border">
        <CardHeader>
          <CardTitle className="text-primary neon-text flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            AI Job Suggestions
          </CardTitle>
          <CardDescription>
            Based on your resume skills, find matching job opportunities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedResume ? (
            <>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm font-medium mb-2">Selected Resume:</p>
                <p className="text-sm text-muted-foreground">{selectedResume.file_name}</p>
                
                {selectedResume.extracted_skills?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground mb-2">Skills to match:</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedResume.extracted_skills.map((skill: string, idx: number) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Button
                onClick={handleGetSuggestions}
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 neon-glow"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing & Searching...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Find Matching Jobs
                  </>
                )}
              </Button>
            </>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No resume selected</p>
              <p className="text-sm text-muted-foreground">
                Upload a resume in the "My Resumes" tab first
              </p>
            </div>
          )}
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
                <p className="text-muted-foreground">No matching jobs found</p>
                <p className="text-sm text-muted-foreground">
                  Try updating your resume with more skills
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default AISuggestions;
