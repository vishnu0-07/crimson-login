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
    const { company, role, skills } = await req.json();

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      throw new Error("FIRECRAWL_API_KEY is not configured");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let searchQuery = "";
    
    if (company && role) {
      // Manual search: specific company and role
      searchQuery = `${company} ${role} job openings careers hiring 2024 2025`;
    } else if (skills && skills.length > 0) {
      // AI-suggested search: based on skills
      const topSkills = skills.slice(0, 5).join(" ");
      searchQuery = `${topSkills} jobs hiring now careers 2024 2025`;
    } else {
      return new Response(
        JSON.stringify({ error: "Either company/role or skills are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Searching jobs with query:", searchQuery);

    // Use Firecrawl to search for jobs
    const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 10,
        tbs: "qdr:m", // Last month
        scrapeOptions: {
          formats: ["markdown"]
        }
      }),
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error("Firecrawl error:", searchResponse.status, errorText);
      throw new Error(`Search failed: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    const searchResults = searchData.data || [];

    console.log(`Found ${searchResults.length} search results`);

    // Use AI to analyze and structure the job results
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a job search analyst. Analyze search results and extract job listings.
            For each job found, extract: company name, role title, location, requirements, salary (if available), and application URL.
            Determine if each result is a real job posting. Filter out non-job content.
            Be helpful and provide actionable information.`
          },
          {
            role: "user",
            content: `Analyze these search results and extract job listings. 
            Search was for: ${company ? `${company} - ${role}` : `Skills: ${skills?.join(", ")}`}
            
            Results:
            ${searchResults.map((r: any, i: number) => `
            --- Result ${i + 1} ---
            URL: ${r.url}
            Title: ${r.title}
            Description: ${r.description || ""}
            Content: ${r.markdown?.substring(0, 2000) || ""}
            `).join("\n")}
            `
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "structure_job_listings",
              description: "Structure the extracted job listings",
              parameters: {
                type: "object",
                properties: {
                  jobs: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        company: { type: "string" },
                        role: { type: "string" },
                        location: { type: "string" },
                        requirements: {
                          type: "array",
                          items: { type: "string" }
                        },
                        salary: { type: "string" },
                        url: { type: "string" },
                        isRealJob: { type: "boolean" },
                        description: { type: "string" }
                      },
                      required: ["company", "role", "url", "isRealJob"]
                    }
                  },
                  suggestions: {
                    type: "array",
                    items: { type: "string" },
                    description: "Suggestions if no jobs found or for better results"
                  },
                  summary: { type: "string" }
                },
                required: ["jobs", "summary"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "structure_job_listings" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI analysis error:", aiResponse.status, errorText);
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No analysis response from AI");
    }

    const analysisResult = JSON.parse(toolCall.function.arguments);
    console.log(`Analyzed ${analysisResult.jobs?.length || 0} jobs`);

    return new Response(
      JSON.stringify({ success: true, data: analysisResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error searching jobs:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to search jobs" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
