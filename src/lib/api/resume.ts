import { supabase } from "@/integrations/supabase/client";

export interface ParsedResume {
  skills: string[];
  experience: Array<{
    company: string;
    role: string;
    duration?: string;
    description?: string;
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field?: string;
    year?: string;
  }>;
  summary: string;
}

export async function parseResume(resumeText: string): Promise<{ success: boolean; data?: ParsedResume; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("parse-resume", {
      body: { resumeText },
    });

    if (error) {
      console.error("Parse resume error:", error);
      return { success: false, error: error.message };
    }

    return data;
  } catch (error) {
    console.error("Parse resume error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to parse resume" };
  }
}

export async function uploadResume(file: File, userId: string): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("resumes")
      .upload(fileName, file);

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return { success: false, error: uploadError.message };
    }

    const { data: urlData } = supabase.storage
      .from("resumes")
      .getPublicUrl(fileName);

    return { success: true, url: urlData.publicUrl };
  } catch (error) {
    console.error("Upload error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to upload resume" };
  }
}
