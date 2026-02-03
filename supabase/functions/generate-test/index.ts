import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { role, company, requirements, testType } = await req.json();
    
    if (!role || !testType) {
      return new Response(
        JSON.stringify({ error: "Role and test type are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Generating ${testType} test for ${role} at ${company}`);

    const systemPrompt = testType === "coding" 
      ? `You are an expert technical interviewer. Generate coding challenges for a ${role} position.
         Create practical coding problems that test real-world skills.
         Each problem should have:
         - A clear problem statement
         - Input/output examples
         - Expected time complexity
         - Starter code template
         Focus on skills relevant to: ${requirements?.join(", ") || role}`
      : `You are an expert interviewer. Generate multiple choice quiz questions for a ${role} position.
         Questions should test both technical knowledge and problem-solving skills.
         Each question should have 4 options with only one correct answer.
         Focus on skills relevant to: ${requirements?.join(", ") || role}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Generate a ${testType === "coding" ? "3 coding challenges" : "10 multiple choice questions"} test for the ${role} position${company ? ` at ${company}` : ""}.
            ${requirements?.length ? `Key requirements: ${requirements.join(", ")}` : ""}
            Make the questions progressively harder.`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_test",
              description: "Generate a structured test",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  timeLimit: { type: "number", description: "Time limit in minutes" },
                  questions: {
                    type: "array",
                    items: testType === "coding" ? {
                      type: "object",
                      properties: {
                        id: { type: "number" },
                        title: { type: "string" },
                        difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                        description: { type: "string" },
                        examples: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              input: { type: "string" },
                              output: { type: "string" },
                              explanation: { type: "string" }
                            }
                          }
                        },
                        starterCode: { type: "string" },
                        expectedComplexity: { type: "string" },
                        hints: { type: "array", items: { type: "string" } }
                      },
                      required: ["id", "title", "difficulty", "description", "starterCode"]
                    } : {
                      type: "object",
                      properties: {
                        id: { type: "number" },
                        question: { type: "string" },
                        difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                        options: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              id: { type: "string" },
                              text: { type: "string" }
                            }
                          }
                        },
                        correctAnswer: { type: "string" },
                        explanation: { type: "string" }
                      },
                      required: ["id", "question", "options", "correctAnswer"]
                    }
                  }
                },
                required: ["title", "description", "timeLimit", "questions"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_test" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI error:", response.status, errorText);
      throw new Error(`Failed to generate test: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No test generated from AI");
    }

    const testData = JSON.parse(toolCall.function.arguments);
    console.log(`Generated test with ${testData.questions?.length || 0} questions`);

    return new Response(
      JSON.stringify({ success: true, data: testData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating test:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to generate test" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
