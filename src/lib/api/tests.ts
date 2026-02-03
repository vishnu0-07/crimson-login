import { supabase } from "@/integrations/supabase/client";

export interface QuizQuestion {
  id: number;
  question: string;
  difficulty: "easy" | "medium" | "hard";
  options: Array<{ id: string; text: string }>;
  correctAnswer: string;
  explanation?: string;
}

export interface CodingQuestion {
  id: number;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  description: string;
  examples?: Array<{ input: string; output: string; explanation?: string }>;
  starterCode: string;
  expectedComplexity?: string;
  hints?: string[];
}

export interface GeneratedTest {
  title: string;
  description: string;
  timeLimit: number;
  questions: QuizQuestion[] | CodingQuestion[];
}

export async function generateTest(params: {
  role: string;
  company?: string;
  requirements?: string[];
  testType: "quiz" | "coding";
}): Promise<{ success: boolean; data?: GeneratedTest; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("generate-test", {
      body: params,
    });

    if (error) {
      console.error("Generate test error:", error);
      return { success: false, error: error.message };
    }

    return data;
  } catch (error) {
    console.error("Generate test error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to generate test" };
  }
}
