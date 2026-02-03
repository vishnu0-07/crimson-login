import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { parseResume, uploadResume } from "@/lib/api/resume";
import { Upload, FileText, Check, Loader2, Trash2 } from "lucide-react";

interface ResumeUploadProps {
  userId: string;
  resumes: any[];
  selectedResume: any;
  onResumeUploaded: (resume: any) => void;
  onResumeSelected: (resume: any) => void;
}

const ResumeUpload = ({ userId, resumes, selectedResume, onResumeUploaded, onResumeSelected }: ResumeUploadProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF, Word document, or text file",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setParsing(true);

    try {
      // Upload file to storage
      const uploadResult = await uploadResume(file, userId);
      if (!uploadResult.success) {
        throw new Error(uploadResult.error);
      }

      // Read file content for parsing
      let fileContent = "";
      if (file.type === "text/plain") {
        fileContent = await file.text();
      } else {
        // For PDFs and Word docs, we'll store the filename and let the AI work with metadata
        fileContent = `Resume file: ${file.name}. File type: ${file.type}. Please analyze based on common resume structures.`;
      }

      // Parse resume with AI
      const parseResult = await parseResume(fileContent);
      
      // Save to database
      const { data: savedResume, error } = await supabase
        .from("resumes")
        .insert({
          user_id: userId,
          file_name: file.name,
          file_url: uploadResult.url,
          extracted_skills: parseResult.success ? parseResult.data?.skills : [],
          extracted_experience: parseResult.success ? parseResult.data?.experience : [],
          extracted_education: parseResult.success ? parseResult.data?.education : [],
          raw_text: fileContent,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Resume uploaded successfully!",
        description: parseResult.success 
          ? `Extracted ${parseResult.data?.skills?.length || 0} skills` 
          : "Uploaded but parsing failed - you can try again",
      });

      onResumeUploaded(savedResume);
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload resume",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setParsing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async (resumeId: string) => {
    const { error } = await supabase.from("resumes").delete().eq("id", resumeId);
    if (error) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Resume deleted" });
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card className="bg-card border-border neon-border">
        <CardHeader>
          <CardTitle className="text-primary neon-text">Upload Resume</CardTitle>
          <CardDescription>Upload your resume to get AI-powered job suggestions</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <p className="text-muted-foreground">
                  {parsing ? "Parsing resume with AI..." : "Uploading..."}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-12 h-12 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">
                  PDF, DOC, DOCX, or TXT (max 10MB)
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resume List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {resumes.map((resume) => (
          <Card
            key={resume.id}
            className={`bg-card border cursor-pointer transition-all ${
              selectedResume?.id === resume.id
                ? "border-primary neon-border"
                : "border-border hover:border-primary/50"
            }`}
            onClick={() => onResumeSelected(resume)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{resume.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Uploaded {new Date(resume.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {selectedResume?.id === resume.id && (
                  <Check className="w-5 h-5 text-primary" />
                )}
              </div>

              {resume.extracted_skills && resume.extracted_skills.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground mb-2">Skills:</p>
                  <div className="flex flex-wrap gap-1">
                    {resume.extracted_skills.slice(0, 6).map((skill: string, idx: number) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                    {resume.extracted_skills.length > 6 && (
                      <Badge variant="outline" className="text-xs">
                        +{resume.extracted_skills.length - 6} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="mt-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(resume.id);
                }}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {resumes.length === 0 && (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No resumes uploaded yet</p>
            <p className="text-sm text-muted-foreground">Upload your resume to get started</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ResumeUpload;
