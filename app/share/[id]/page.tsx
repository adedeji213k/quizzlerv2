"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, AlertTriangle, Sparkles } from "lucide-react";

interface Choice {
  id: number;
  question_id: number;
  text: string;
  is_correct: boolean;
}

interface Question {
  id: number;
  text: string;
  choices: Choice[];
}

export default function ShareQuizPage() {
  const { id } = useParams();

  const [participantName, setParticipantName] = useState("");
  const [started, setStarted] = useState(false);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [quizTitle, setQuizTitle] = useState("");
  const [duration, setDuration] = useState<number | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number | null>>({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);

  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  // =========================================
  // Fetch quiz + questions
  // =========================================
  useEffect(() => {
    const fetchQuiz = async () => {
      setLoading(true);
      try {
        const { data: quizData, error: quizError } = await supabase
          .from("quizzes")
          .select("title, duration, owner")
          .eq("id", id)
          .single();
        if (quizError || !quizData) throw quizError;

        setQuizTitle(quizData.title);
        setDuration(quizData.duration);
        setTimeLeft((quizData.duration || 10) * 60);

        const { data: questionsData, error: qError } = await supabase
          .from("questions")
          .select("id, text")
          .eq("quiz_id", id)
          .order("id", { ascending: true });
        if (qError || !questionsData) throw qError;

        const questionIds = questionsData.map((q) => q.id);

        const { data: choicesData, error: cError } = await supabase
          .from("choices")
          .select("id, question_id, text, is_correct")
          .in("question_id", questionIds);
        if (cError || !choicesData) throw cError;

        const merged = questionsData.map((q) => ({
          ...q,
          choices: choicesData.filter((c) => c.question_id === q.id),
        }));

        setQuestions(merged);
      } catch (err) {
        console.error("Error loading shared quiz:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [id]);

  // =========================================
  // Timer
  // =========================================
  useEffect(() => {
    if (!started || showResults || loading || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinishQuiz();
          return 0;
        }
        if (prev <= 31) setShowWarning(true);
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, started, showResults, loading]);

  const handleAnswerSelect = (questionId: number, choiceId: number) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: choiceId }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      handleFinishQuiz();
    }
  };

  const handleFinishQuiz = async () => {
    let correctCount = 0;

    questions.forEach((q) => {
      const selected = selectedAnswers[q.id];
      const correct = q.choices.find((c) => c.is_correct);
      if (selected === correct?.id) correctCount++;
    });

    setScore(correctCount);
    setShowResults(true);
    setShowWarning(false);

    try {
      setSaving(true);

      // 1️⃣ Fetch quiz owner
      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .select("owner")
        .eq("id", id)
        .single();

      if (quizError || !quizData?.owner) throw new Error("Quiz owner not found");

      const quizOwnerId = quizData.owner;

      // 2️⃣ Insert quiz result
      const { data: shareResult, error } = await supabase
        .from("share_quiz_results")
        .insert({
          quiz_id: Number(id),
          quiz_owner_id: quizOwnerId,
          participant_name: participantName,
          score: correctCount,
          total_questions: questions.length,
        })
        .select()
        .single();

      if (error || !shareResult) throw error;

      // 3️⃣ Insert individual answers
      const answers = questions.map((q) => {
        const selectedId = selectedAnswers[q.id] ?? null;
        const correct = q.choices.find((c) => c.is_correct);

        return {
          share_quiz_result_id: shareResult.id, // ✅ correct table FK
          question_id: q.id,
          selected_choice_id: selectedId,
          is_correct: selectedId === correct?.id,
        };
      });

      const { error: answersError } = await supabase
        .from("share_quiz_result_answers") // ✅ fixed table name
        .insert(answers);

      if (answersError) throw answersError;

      console.log("✅ Results and answers saved successfully");
    } catch (err: any) {
      console.error("Error saving shared result:", err);
    } finally {
      setSaving(false);
    }
  };

  // =========================================
  // UI STATES
  // =========================================
  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh] text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading quiz...
      </div>
    );
  }

  const LogoHeader = () => (
    <Link href="/" className="flex items-center gap-3 mb-6 justify-center">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
        <Sparkles className="w-6 h-6 text-white" />
      </div>
      <span className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
        Quizzler
      </span>
    </Link>
  );

  if (!started) {
    return (
      <div className="max-w-md mx-auto py-20 px-4">
        <LogoHeader />
        <h2 className="text-2xl font-bold mb-4 text-center">{quizTitle}</h2>
        <input
          value={participantName}
          onChange={(e) => setParticipantName(e.target.value)}
          placeholder="Enter your name"
          className="w-full border rounded-xl px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          onClick={() => setStarted(true)}
          disabled={!participantName.trim()}
          className="w-full bg-primary text-white py-3 rounded-xl font-medium shadow hover:opacity-90 disabled:opacity-50 transition"
        >
          Start Quiz
        </button>
      </div>
    );
  }

  if (showResults) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <LogoHeader />
        <h2 className="text-2xl font-bold mb-2">
          Well done, {participantName}! 🎉
        </h2>
        <p className="mb-6 text-lg">
          You scored <span className="font-semibold">{score}</span> out of {questions.length}
        </p>

        <div className="border rounded-xl p-5 mb-8 bg-muted shadow-sm">
          <h3 className="text-lg font-semibold mb-2">
            Want to create your own quiz like this?
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Turn your documents into interactive quizzes in minutes.
          </p>
          <Link
            href="/register"
            className="inline-block bg-primary text-white px-5 py-2 rounded-xl font-medium shadow hover:opacity-90 transition"
          >
            Create Your Own Quiz →
          </Link>
        </div>

        <div className="space-y-4">
          {questions.map((q, idx) => {
            const selectedId = selectedAnswers[q.id];
            const correct = q.choices.find((c) => c.is_correct);
            return (
              <div key={q.id} className="border rounded-xl p-4 shadow-sm">
                <p className="font-medium mb-2">
                  {idx + 1}. {q.text}
                </p>
                {q.choices.map((choice) => (
                  <div
                    key={choice.id}
                    className={`p-2 rounded text-sm ${
                      choice.id === correct?.id
                        ? "bg-green-100 font-semibold"
                        : choice.id === selectedId
                        ? "bg-red-100"
                        : ""
                    }`}
                  >
                    {choice.text}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {saving && (
          <p className="text-sm text-muted-foreground mt-4 animate-pulse">
            Saving your results...
          </p>
        )}
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const selected = selectedAnswers[currentQuestion.id];
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <LogoHeader />
      <div className="flex justify-between mb-4 text-sm text-muted-foreground">
        <p>
          Time Left:{" "}
          <span className="font-semibold">
            {minutes}:{seconds.toString().padStart(2, "0")}
          </span>
        </p>
        <p>
          Question {currentIndex + 1} / {questions.length}
        </p>
      </div>

      {showWarning && (
        <div className="flex items-center text-amber-500 mb-3 text-sm">
          <AlertTriangle className="w-4 h-4 mr-2" /> Time is almost up!
        </div>
      )}

      <h3 className="text-xl font-semibold mb-4">{currentQuestion.text}</h3>

      <div className="space-y-3 mb-6">
        {currentQuestion.choices.map((choice) => (
          <button
            key={choice.id}
            onClick={() => handleAnswerSelect(currentQuestion.id, choice.id)}
            className={`w-full text-left border rounded-xl px-4 py-3 transition ${
              selected === choice.id ? "border-primary bg-primary/10" : "hover:bg-muted"
            }`}
          >
            {choice.text}
          </button>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleNext}
          disabled={!selected}
          className="bg-primary text-white px-5 py-2 rounded-xl font-medium shadow hover:opacity-90 disabled:opacity-50 transition"
        >
          {currentIndex === questions.length - 1 ? "Finish Quiz" : "Next"}
        </button>
      </div>
    </div>
  );
}
