import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Job } from "@/lib/api/jobs";
import { ExternalLink, MapPin, DollarSign, Briefcase, FileEdit, Code, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface JobCardProps {
  job: Job;
  userId: string;
  resumeId?: string;
}

const JobCard = ({ job, userId, resumeId }: JobCardProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [applying, setApplying] = useState(false);

  const handleApply = async (testType: "quiz" | "coding") => {
    setApplying(true);

    try {
      // Create job application
      const { data: application, error } = await supabase
        .from("job_applications")
        .insert({
          user_id: userId,
          resume_id: resumeId,
          company_name: job.company,
          role_title: job.role,
          job_url: job.url,
          job_description: job.description,
          requirements: job.requirements || [],
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Application started!",
        description: `Taking ${testType === "quiz" ? "quiz" : "coding"} test for ${job.role}`,
      });

      // Navigate to test page
      navigate(`/test/${application.id}?type=${testType}`);
    } catch (error) {
      console.error("Apply error:", error);
      toast({
        title: "Failed to apply",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setApplying(false);
    }
  };

  const isTechnicalRole = /engineer|developer|programmer|architect|devops|sre|data|ml|ai|software/i.test(job.role);

  return (
    <Card className="bg-card border-border hover:border-primary/50 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{job.role}</CardTitle>
            <p className="text-primary font-medium">{job.company}</p>
          </div>
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <ExternalLink className="w-5 h-5" />
          </a>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Location & Salary */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {job.location && (
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {job.location}
            </div>
          )}
          {job.salary && (
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              {job.salary}
            </div>
          )}
        </div>

        {/* Description */}
        {job.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {job.description}
          </p>
        )}

        {/* Requirements */}
        {job.requirements && job.requirements.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Requirements:</p>
            <div className="flex flex-wrap gap-1">
              {job.requirements.slice(0, 5).map((req, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {req}
                </Badge>
              ))}
              {job.requirements.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{job.requirements.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Apply Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={() => handleApply("quiz")}
            disabled={applying}
            variant="outline"
            className="flex-1 border-border hover:border-primary hover:bg-primary/10"
          >
            {applying ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileEdit className="w-4 h-4 mr-2" />
            )}
            Take Quiz
          </Button>
          {isTechnicalRole && (
            <Button
              onClick={() => handleApply("coding")}
              disabled={applying}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {applying ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Code className="w-4 h-4 mr-2" />
              )}
              Coding Test
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default JobCard;
