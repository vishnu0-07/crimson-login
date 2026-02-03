import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, Clock, CheckCircle, XCircle, FileText } from "lucide-react";

interface MyApplicationsProps {
  userId: string;
}

const MyApplications = ({ userId }: MyApplicationsProps) => {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
  }, [userId]);

  const fetchApplications = async () => {
    const { data, error } = await supabase
      .from("job_applications")
      .select("*, tests(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching applications:", error);
    } else {
      setApplications(data || []);
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
      pending: { variant: "secondary", icon: <Clock className="w-3 h-3" /> },
      applied: { variant: "default", icon: <FileText className="w-3 h-3" /> },
      test_taken: { variant: "default", icon: <CheckCircle className="w-3 h-3" /> },
      accepted: { variant: "default", icon: <CheckCircle className="w-3 h-3" /> },
      rejected: { variant: "destructive", icon: <XCircle className="w-3 h-3" /> },
    };

    const config = configs[status] || configs.pending;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse-glow">
          <Briefcase className="w-12 h-12 text-primary animate-pulse" />
        </div>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-8 text-center">
          <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No applications yet</p>
          <p className="text-sm text-muted-foreground">
            Search for jobs and apply to get started
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {applications.map((app) => (
        <Card key={app.id} className="bg-card border-border hover:border-primary/50 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">{app.role_title}</h3>
                <p className="text-primary">{app.company_name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Applied {new Date(app.created_at).toLocaleDateString()}
                </p>
              </div>
              {getStatusBadge(app.status)}
            </div>

            {app.tests && app.tests.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-sm font-medium mb-2">Test Results:</p>
                {app.tests.map((test: any) => (
                  <div key={test.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {test.test_type === "quiz" ? "Quiz" : "Coding"} Test
                    </span>
                    {test.completed_at ? (
                      <Badge variant="outline">
                        Score: {test.score}/{test.max_score}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">In Progress</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}

            {app.job_url && (
              <a
                href={app.job_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline mt-3 inline-block"
              >
                View Original Listing →
              </a>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default MyApplications;
