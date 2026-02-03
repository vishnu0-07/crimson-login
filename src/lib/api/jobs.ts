import { supabase } from "@/integrations/supabase/client";

export interface Job {
  company: string;
  role: string;
  location?: string;
  requirements?: string[];
  salary?: string;
  url: string;
  isRealJob: boolean;
  description?: string;
}

export interface JobSearchResult {
  jobs: Job[];
  suggestions?: string[];
  summary: string;
}

export async function searchJobs(params: {
  company?: string;
  role?: string;
  skills?: string[];
}): Promise<{ success: boolean; data?: JobSearchResult; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("search-jobs", {
      body: params,
    });

    if (error) {
      console.error("Job search error:", error);
      return { success: false, error: error.message };
    }

    return data;
  } catch (error) {
    console.error("Job search error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to search jobs" };
  }
}
