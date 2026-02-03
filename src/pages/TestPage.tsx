import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { generateTest, QuizQuestion, CodingQuestion, GeneratedTest } from "@/lib/api/tests";
import { Loader2, Clock, CheckCircle, ArrowRight, ArrowLeft, Send, Code, FileText } from "lucide-react";

const TestPage = () => {
  const { applicationId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const testType = (searchParams.get("type") as "quiz" | "coding") || "quiz";
  
  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<any>(null);
  const [test, setTest] = useState<GeneratedTest | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [score, setScore] = useState<{ score: number; maxScore: number } | null>(null);

  useEffect(() => {
    loadApplicationAndGenerateTest();
  }, [applicationId, testType]);

  const loadApplicationAndGenerateTest = async () => {
    try {
      // Fetch application details
      const { data: appData, error: appError } = await supabase
        .from("job_applications")
        .select("*")
        .eq("id", applicationId)
        .single();

      if (appError) throw appError;
      setApplication(appData);

      // Check if test already exists
      const { data: existingTest } = await supabase
        .from("tests")
        .select("*")
        .eq("application_id", applicationId)
        .eq("test_type", testType)
        .maybeSingle();

      if (existingTest) {
        if (existingTest.completed_at) {
          setCompleted(true);
          setScore({ score: existingTest.score, maxScore: existingTest.max_score });
          setTest({ 
            title: `${testType === "quiz" ? "Quiz" : "Coding"} Test`, 
            description: "", 
            timeLimit: 60, 
            questions: existingTest.questions as any 
          });
          setAnswers(existingTest.answers as Record<number, string> || {});
        } else {
          setTest({ 
            title: `${testType === "quiz" ? "Quiz" : "Coding"} Test`, 
            description: "", 
            timeLimit: 60, 
            questions: existingTest.questions as any 
          });
        }
        setLoading(false);
        return;
      }

      // Generate new test
      const requirements = Array.isArray(appData.requirements) 
        ? appData.requirements.map((r: any) => typeof r === 'string' ? r : JSON.stringify(r))
        : [];

      const result = await generateTest({
        role: appData.role_title,
        company: appData.company_name,
        requirements,
        testType,
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to generate test");
      }

      setTest(result.data);

      // Save test to database
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from("tests").insert([{
        application_id: applicationId,
        user_id: user?.id,
        test_type: testType,
        questions: result.data.questions as any,
        max_score: result.data.questions.length,
      }]);

    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Failed to load test",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: number, answer: string) => {
    setAnswers({ ...answers, [questionId]: answer });
  };

  const handleSubmit = async () => {
    if (!test) return;

    setSubmitting(true);

    try {
      let calculatedScore = 0;
      
      if (testType === "quiz") {
        const quizQuestions = test.questions as QuizQuestion[];
        quizQuestions.forEach((q) => {
          if (answers[q.id] === q.correctAnswer) {
            calculatedScore++;
          }
        });
      } else {
        // For coding, we'll give a base score for attempting
        calculatedScore = Object.keys(answers).length;
      }

      // Update test in database
      await supabase
        .from("tests")
        .update({
          answers,
          score: calculatedScore,
          completed_at: new Date().toISOString(),
        })
        .eq("application_id", applicationId)
        .eq("test_type", testType);

      // Update application status
      await supabase
        .from("job_applications")
        .update({ status: "test_taken" })
        .eq("id", applicationId);

      setScore({ score: calculatedScore, maxScore: test.questions.length });
      setCompleted(true);

      toast({
        title: "Test submitted!",
        description: `Your score: ${calculatedScore}/${test.questions.length}`,
      });
    } catch (error) {
      console.error("Submit error:", error);
      toast({
        title: "Failed to submit",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Generating your test...</p>
        </div>
      </div>
    );
  }

  if (completed && score) {
    const percentage = Math.round((score.score / score.maxScore) * 100);
    
    return (
      <div className="min-h-screen bg-background">
        <div className="fixed inset-0 bg-[linear-gradient(rgba(255,0,64,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,0,64,0.03)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none" />
        
        <div className="relative z-10 container mx-auto px-4 py-12 max-w-2xl">
          <Card className="bg-card border-border neon-border text-center">
            <CardHeader>
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-primary" />
              </div>
              <CardTitle className="text-2xl text-primary neon-text">Test Completed!</CardTitle>
              <CardDescription>
                {application?.role_title} at {application?.company_name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-5xl font-bold text-primary">
                {score.score}/{score.maxScore}
              </div>
              <p className="text-muted-foreground">
                You scored {percentage}% on this {testType === "quiz" ? "quiz" : "coding challenge"}
              </p>
              
              <Badge variant={percentage >= 70 ? "default" : "secondary"} className="text-lg py-2 px-4">
                {percentage >= 80 ? "Excellent!" : percentage >= 70 ? "Good Job!" : percentage >= 50 ? "Keep Practicing" : "Needs Improvement"}
              </Badge>

              <Button
                onClick={() => navigate("/dashboard")}
                className="w-full bg-primary hover:bg-primary/90 neon-glow"
              >
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">No test available</p>
      </div>
    );
  }

  const currentQ = test.questions[currentQuestion];
  const isQuiz = testType === "quiz";
  const question = currentQ as (QuizQuestion | CodingQuestion);

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,0,64,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,0,64,0.03)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none" />
      
      {/* Header */}
      <header className="relative z-10 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-primary">{test.title}</h1>
              <p className="text-sm text-muted-foreground">
                {application?.role_title} at {application?.company_name}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {test.timeLimit} min
              </Badge>
              <Badge variant="secondary">
                {currentQuestion + 1} / {test.questions.length}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Question */}
      <main className="relative z-10 container mx-auto px-4 py-8 max-w-3xl">
        <Card className="bg-card border-border neon-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              {isQuiz ? (
                <FileText className="w-5 h-5 text-primary" />
              ) : (
                <Code className="w-5 h-5 text-primary" />
              )}
              <Badge variant={(question as any).difficulty === "hard" ? "destructive" : (question as any).difficulty === "medium" ? "default" : "secondary"}>
                {(question as any).difficulty}
              </Badge>
            </div>
            <CardTitle className="text-lg mt-2">
              {isQuiz ? (question as QuizQuestion).question : (question as CodingQuestion).title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {isQuiz ? (
              // Quiz Question
              <RadioGroup
                value={answers[question.id] || ""}
                onValueChange={(value) => handleAnswerChange(question.id, value)}
              >
                {(question as QuizQuestion).options.map((option) => (
                  <div key={option.id} className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors">
                    <RadioGroupItem value={option.id} id={option.id} />
                    <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                      {option.text}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              // Coding Question
              <div className="space-y-4">
                <p className="text-muted-foreground">{(question as CodingQuestion).description}</p>
                
                {(question as CodingQuestion).examples && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm font-medium mb-2">Examples:</p>
                    {(question as CodingQuestion).examples?.map((ex, idx) => (
                      <div key={idx} className="text-sm font-mono mb-2">
                        <p>Input: {ex.input}</p>
                        <p>Output: {ex.output}</p>
                        {ex.explanation && <p className="text-muted-foreground">{ex.explanation}</p>}
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <Label>Your Solution:</Label>
                  <Textarea
                    value={answers[question.id] || (question as CodingQuestion).starterCode || ""}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    className="font-mono min-h-[200px] bg-input border-border"
                    placeholder="Write your code here..."
                  />
                </div>

                {(question as CodingQuestion).hints && (
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium">Hints:</p>
                    <ul className="list-disc list-inside">
                      {(question as CodingQuestion).hints?.map((hint, idx) => (
                        <li key={idx}>{hint}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                disabled={currentQuestion === 0}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              {currentQuestion === test.questions.length - 1 ? (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="bg-primary hover:bg-primary/90 neon-glow"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Submit Test
                </Button>
              ) : (
                <Button
                  onClick={() => setCurrentQuestion(currentQuestion + 1)}
                  className="bg-primary hover:bg-primary/90"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Question Navigator */}
        <div className="mt-6 flex flex-wrap gap-2 justify-center">
          {test.questions.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentQuestion(idx)}
              className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                idx === currentQuestion
                  ? "bg-primary text-primary-foreground"
                  : answers[(test.questions[idx] as any).id]
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
};

export default TestPage;
