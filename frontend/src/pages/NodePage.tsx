import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, useAuth } from "../context/AuthContext";
import QuestionCard from "../components/QuestionCard";
import FillBlankCard from "../components/FillBlankCard";
import ProofPuzzleCard from "../components/ProofPuzzleCard";
import MultiSelectCard from "../components/MultiSelectCard";
import ResultBottomSheet from "../components/ResultBottomSheet";
import FlashcardModal, { type Flashcard } from "../components/FlashcardModal";
import "../components/Flashcard.css";

type NodeState = "loading" | "video" | "practice" | "failed" | "complete";

export default function NodePage() {
  const { nodeId } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState<NodeState>("loading");

  const [videoUrl, setVideoUrl] = useState("");
  const [nodeTitle, setNodeTitle] = useState("");
  const [questions, setQuestions] = useState<any[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [lives, setLives] = useState(3);
  const [maxLives, setMaxLives] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [revisionCards, setRevisionCards] = useState<Flashcard[]>([]);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [stars, setStars] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [practiceStartTime, setPracticeStartTime] = useState<number | null>(null);
  const [timeSpent, setTimeSpent] = useState(0); // seconds
  const { user } = useAuth();
  const [breadcrumb, setBreadcrumb] = useState({ subject: "Mathematics", grade: "Grade 10", unit: "" });
  const [xpBurst, setXpBurst] = useState(false);
  const [wrongAnswers, setWrongAnswers] = useState(0);
  const [incorrectQuestions, setIncorrectQuestions] = useState<{ question: string; correct_answer: string }[]>([]);
  const [showMistakes, setShowMistakes] = useState(false);
  const [nodeDescription, setNodeDescription] = useState("");
  const [nodeObjectives, setNodeObjectives] = useState<string[]>([]);
  const [streak, setStreak] = useState(0);
  const [pathId, setPathId] = useState<number | null>(null);

  useEffect(() => {
    if (result?.is_correct) {
      setXpBurst(true);
      const t = setTimeout(() => setXpBurst(false), 1200);
      return () => clearTimeout(t);
    }
  }, [result]);

  useEffect(() => {
    loadNode();
    api.get('gamification/stats/').then(r => setStreak(r.data?.current_streak ?? 0)).catch(() => {});
  }, [nodeId]);

  const loadNode = async () => {
    try {
      const res = await api.post(`student/nodes/${nodeId}/start/`);
      const url = res.data.video_url || "";
      setVideoUrl(url);
      setNodeTitle(res.data.title || "Lesson");
      setNodeDescription(res.data.description || "");
      setNodeObjectives(res.data.objectives || []);
      setPathId(res.data.path_id ?? null);
      setBreadcrumb({
        subject: res.data.subject || "Mathematics",
        grade: res.data.grade || "Grade 10",
        unit: res.data.path_title || "",
      });

      if (res.data.node_type === "CHAPTER_TEST") {
        await loadTestQuestions();
      } else {
        setState("video");
      }
    } catch {
      navigate("/");
    }
  };

  const loadPracticeQuestions = async () => {
    const res = await api.get(`student/nodes/${nodeId}/practice/`);
    setQuestions(res.data);
    setQIndex(0);
    setResult(null);
    setWrongAnswers(0);
    setIncorrectQuestions([]);
    setShowMistakes(false);
    setPracticeStartTime(Date.now());
    setState("practice");
  };

  const loadTestQuestions = async () => {
    const res = await api.get(`student/nodes/${nodeId}/practice/`);
    setQuestions(res.data);
    setQIndex(0);
    setResult(null);
    setWrongAnswers(0);
    setIncorrectQuestions([]);
    setShowMistakes(false);
    setPracticeStartTime(Date.now());
    setState("practice");
    setLives(99);
  };

  const handleVideoComplete = async () => {
    const res = await api.post(`student/nodes/${nodeId}/video-complete/`);
    setLives(res.data.lives);
    setMaxLives(res.data.lives);
    await loadPracticeQuestions();
  };

  const handleAnswerSubmit = async (answer: string) => {
    const res = await api.post(`student/nodes/${nodeId}/practice/answer/`, {
      question_id: questions[qIndex].id,
      given_answer: answer,
    });

    // Enrich correct_answer: if it's a single letter key (A/B/C/D), append the option text
    let correctAnswer = res.data.correct_answer as string;
    const currentQ = questions[qIndex];
    if (
      currentQ?.options_json &&
      typeof correctAnswer === 'string' &&
      correctAnswer.length === 1 &&
      currentQ.options_json[correctAnswer]
    ) {
      correctAnswer = `${correctAnswer}: ${currentQ.options_json[correctAnswer]}`;
    }

    setResult({
      is_correct: res.data.is_correct,
      correct_answer: correctAnswer,
      explanation: res.data.explanation,
      hint: res.data.hint,
    });

    if (lives !== 99) {
      setLives(res.data.lives_remaining);
    }

    if (!res.data.is_correct) {
      setWrongAnswers(w => w + 1);
      setIncorrectQuestions(prev => [...prev, {
        question: questions[qIndex].question_text,
        correct_answer: correctAnswer,
      }]);
    }

    return res.data.is_correct;
  };

  const handleNextQuestion = async () => {
    if (lives !== 99 && lives <= 0) {
      setState("failed");
      return;
    }

    if (qIndex < questions.length - 1) {
      setQIndex((i) => i + 1);
      setResult(null);
    } else {
      setIsSubmitting(true);
      try {
        const comp = await api.post(`student/nodes/${nodeId}/practice/complete/`);

        if (comp.data.status === "failed") {
          setState("failed");
          return;
        }

        setStars(comp.data.stars || 0);
        setXpEarned(comp.data.xp || 0);
        setTimeSpent(practiceStartTime ? Math.round((Date.now() - practiceStartTime) / 1000) : 0);

        const revRes = await api.get(`student/nodes/${nodeId}/revision-cards/`);
        setRevisionCards(revRes.data);

        setState("complete");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleRetry = async () => {
    await api.post(`student/nodes/${nodeId}/practice/retry/`);
    setLives(maxLives);
    if (videoUrl) {
      setState("video");
    } else {
      await loadPracticeQuestions();
    }
  };

  const finishNode = () => navigate(pathId ? `/map/${pathId}` : -1 as any);

  // ─── Loading ────────────────────────────────────────────────
  if (state === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <p className="text-outline text-xs font-bold uppercase tracking-[0.2em] font-label">
            Initializing orbit...
          </p>
        </div>
      </div>
    );
  }

  // ─── Video / Lesson Player ──────────────────────────────────
  if (state === "video") {
    return (
      <div className="min-h-screen bg-background">
        <main className="max-w-[1920px] mx-auto px-6 pt-20 pb-32">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs font-medium text-outline mb-6 tracking-wide uppercase font-label">
            <span>{breadcrumb.subject}</span>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span>{breadcrumb.grade}</span>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span>{breadcrumb.unit}</span>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span className="text-primary-fixed-dim">Now Playing</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left — Video Player */}
            <div className="lg:col-span-2 space-y-6">
              <div className="relative group aspect-video rounded-2xl overflow-hidden bg-surface-container-lowest shadow-2xl">
                {videoUrl ? (
                  videoUrl.includes("youtube") ? (
                    <iframe
                      width="100%"
                      height="100%"
                      src={videoUrl.replace("watch?v=", "embed/")}
                      allowFullScreen
                      className="border-0"
                    />
                  ) : (
                    <video src={videoUrl} controls className="w-full h-full" />
                  )
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-container-lowest">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 blur-[80px] rounded-full" />
                    <div className="relative z-10 flex flex-col items-center gap-4 text-center px-8">
                      <div className="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center">
                        <span className="material-symbols-outlined text-on-surface-variant text-4xl">videocam_off</span>
                      </div>
                      <h3 className="text-lg font-bold text-on-surface font-headline">Video Lesson Coming Soon</h3>
                      <p className="text-sm text-on-surface-variant max-w-sm">
                        Our instructors are recording a high-quality video for this topic. Skip ahead to start the practice challenge!
                      </p>
                    </div>
                  </div>
                )}


              </div>

              {/* Video Info */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-2">
                <div>
                  <h1 className="text-3xl font-extrabold font-headline text-on-surface tracking-tight mb-2">
                    {nodeTitle}
                  </h1>
                  {nodeDescription && (
                    <p className="text-outline text-sm">
                      {nodeDescription}
                    </p>
                  )}
                </div>
                <button
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-secondary-container text-on-secondary-container font-bold text-sm transition-all hover:brightness-110 active:scale-95"
                  onClick={handleVideoComplete}
                >
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  Mark as Watched
                </button>
              </div>

              {/* About Section */}
              {nodeDescription && (
                <div className="bg-surface-container-low rounded-2xl p-8 space-y-4">
                  <h3 className="text-lg font-bold font-headline text-primary">About this Lesson</h3>
                  <p className="text-on-surface-variant leading-relaxed">
                    {nodeDescription}
                  </p>
                </div>
              )}
            </div>

            {/* Right Sidebar */}
            <aside className="space-y-6">
              <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-xl space-y-6 sticky top-20">
                {/* Lesson Objectives */}
                <div>
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-outline mb-4">Lesson Objectives</h3>
                  <ul className="space-y-4">
                    {nodeObjectives.map((text, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span
                          className="material-symbols-outlined text-xl text-outline-variant"
                          style={{ fontVariationSettings: "'FILL' 0" }}
                        >
                          radio_button_unchecked
                        </span>
                        <span className="text-sm text-on-surface-variant">
                          {text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>



                {/* AI Doubt */}
                <button
                  className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary py-3.5 rounded-xl font-bold text-sm hover:brightness-110 transition-all active:scale-95"
                  onClick={() => navigate('/tutor')}
                >
                  <span className="material-symbols-outlined text-base">photo_camera</span>
                  Ask AI Doubt
                </button>
              </div>
            </aside>
          </div>
        </main>

        {/* Bottom Nav */}
        <nav className="bg-background/90 backdrop-blur-2xl fixed bottom-0 left-0 w-full z-50 border-t border-outline-variant/10 shadow-[0_-8px_32px_rgba(0,0,0,0.4)]">
          <div className="flex justify-between items-center px-8 py-3 max-w-[1920px] mx-auto">
            {/* Navigation Controls */}
            <div className="flex gap-2">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 px-4 py-2 text-outline hover:text-on-surface font-bold transition-all"
              >
                <span className="material-symbols-outlined">chevron_left</span>
                <span className="hidden md:inline font-label text-xs font-semibold uppercase tracking-widest">Previous Lesson</span>
              </button>
              <button className="flex items-center gap-2 px-4 py-2 text-outline hover:text-on-surface font-bold transition-all">
                <span className="hidden md:inline font-label text-xs font-semibold uppercase tracking-widest">Next Lesson</span>
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>

            {/* Center Tabs */}
            <div className="hidden lg:flex gap-2">
              {[
                { icon: "menu_book", label: "Curriculum", active: true },
                { icon: "folder_open", label: "Resources", active: false },
                { icon: "forum", label: "Discussions", active: false },
              ].map((tab) => (
                <div
                  key={tab.label}
                  className={`flex flex-col items-center justify-center px-6 py-2 rounded-xl ${
                    tab.active ? "bg-secondary/10 text-secondary" : "text-outline hover:text-on-surface"
                  }`}
                >
                  <span className="material-symbols-outlined">{tab.icon}</span>
                  <span className="font-label text-[10px] font-semibold uppercase tracking-widest mt-1">{tab.label}</span>
                </div>
              ))}
            </div>

            {/* Primary CTA — Take Quiz / Start Challenge */}
            <div className="flex items-center gap-4">
              <div className={!videoUrl ? "" : "opacity-100"}>
                <button
                  className="flex flex-col items-center justify-center bg-secondary/10 text-secondary rounded-xl px-8 py-2 border border-secondary/20 hover:bg-secondary/20 transition-all active:scale-95"
                  onClick={handleVideoComplete}
                >
                  <span className="material-symbols-outlined">rocket_launch</span>
                  <span className="font-label text-[10px] font-semibold uppercase tracking-widest mt-1">
                    {videoUrl ? "Take Quiz" : "Start Practice"}
                  </span>
                </button>
              </div>
              {videoUrl && (
                <span className="hidden xl:block text-[10px] text-outline w-24 leading-tight uppercase font-bold tracking-tighter">
                  Watch video to unlock quiz
                </span>
              )}
            </div>
          </div>
        </nav>
      </div>
    );
  }

  // ─── Practice / Quiz ────────────────────────────────────────
  if (state === "practice") {
    const q = questions[qIndex];
    const isTest = lives === 99;
    const progress = ((qIndex + 1) / questions.length) * 100;

    if (q?.question_type === 'FILL_BLANK') {
      return (
        <FillBlankCard
          key={qIndex}
          question={q}
          onSubmit={handleAnswerSubmit}
          result={result}
          onSkip={handleNextQuestion}
          onNext={handleNextQuestion}
          qIndex={qIndex}
          total={questions.length}
        />
      );
    }

    if (q?.question_type === 'MULTI_SELECT') {
      return (
        <MultiSelectCard
          key={qIndex}
          question={q}
          onSubmit={handleAnswerSubmit}
          result={result}
          onSkip={handleNextQuestion}
          onNext={handleNextQuestion}
          qIndex={qIndex}
          total={questions.length}
        />
      );
    }

    if (q?.question_type === 'PROOF_PUZZLE') {
      return (
        <ProofPuzzleCard
          key={qIndex}
          question={q}
          onSubmit={handleAnswerSubmit}
          result={result}
          onSkip={handleNextQuestion}
          onNext={handleNextQuestion}
          qIndex={qIndex}
          total={questions.length}
        />
      );
    }

    return (
      <div className="min-h-screen bg-background selection:bg-primary-container/30">

        {/* ── Top bar (overlays global Navbar) ──────────────────── */}
        <header className="fixed top-0 left-0 w-full z-[60] flex items-center justify-between px-5 h-14 bg-background border-b border-outline-variant/10 backdrop-blur-xl">
          {/* Left: close + brand */}
          <div className="flex items-center gap-3 w-52 shrink-0">
            <button
              className="material-symbols-outlined text-outline hover:text-on-surface transition-colors"
              onClick={() => navigate(-1)}
            >
              close
            </button>
            <div className="leading-none">
              <span className="font-black text-base text-white font-headline">Envirr</span>
              <p className="text-[9px] uppercase tracking-[0.15em] text-outline font-bold truncate max-w-[140px]">
                {nodeTitle}
              </p>
            </div>
          </div>

          {/* Center: subject tab */}
          <nav className="hidden md:flex items-center gap-1">
            <span className="px-4 py-1.5 text-sm font-bold rounded-lg text-primary border-b-2 border-primary pb-0.5">
              {breadcrumb.subject}
            </span>
          </nav>

          {/* Right: lives + timer */}
          <div className="flex items-center gap-4 w-52 justify-end shrink-0">
            {!isTest && (
              <div className="flex items-center gap-1">
                {Array.from({ length: maxLives }).map((_, i) => (
                  <span
                    key={i}
                    className={`material-symbols-outlined text-base ${i < lives ? "text-error" : "text-outline-variant/40"}`}
                    style={{ fontVariationSettings: i < lives ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    favorite
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1.5 bg-surface-container px-3 py-1 rounded-full border border-outline-variant/10">
              <span className="material-symbols-outlined text-outline text-sm">timer</span>
              <span className="text-sm font-bold text-on-surface font-headline">
                {isTest ? "Test" : "Practice"}
              </span>
            </div>
          </div>
        </header>

        {/* ── Left sidebar (below top bar) ─────────────────────── */}
        <aside className="fixed left-0 top-14 h-[calc(100vh-3.5rem)] w-52 bg-surface-container border-r border-outline-variant/10 z-[55] hidden md:flex flex-col py-5 px-3">
          {/* Commander identity */}
          <div className="flex items-center gap-2.5 px-2 mb-6">
            <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-primary text-sm">rocket_launch</span>
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-bold leading-none truncate">{user?.username || "Student"}</p>
              <p className="text-outline text-[9px] mt-0.5 capitalize">{user?.role || "student"}</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-0.5">
            {[
              { icon: "grid_view",      label: "Mission Control" },
              { icon: "account_tree",   label: "Curriculum",    active: true },
              { icon: "leaderboard",    label: "Rankings" },
              { icon: "science",        label: "Laboratory" },
              { icon: "settings",       label: "Settings" },
            ].map((item) => (
              <div
                key={item.label}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  item.active
                    ? "bg-primary/10 text-primary"
                    : "text-outline hover:text-on-surface hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-outlined text-lg">{item.icon}</span>
                {item.label}
              </div>
            ))}
          </nav>
        </aside>

        {/* ── Main content ─────────────────────────────────────── */}
        <main className="md:ml-52 pt-14 pb-24 min-h-screen flex flex-col">
          <div className="flex-1 flex flex-col justify-center max-w-3xl mx-auto w-full px-6 py-8">

            {/* Streak + XP + question # row */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                {/* Question number badge */}
                <div className="w-9 h-9 rounded-xl bg-surface-container border border-outline-variant/15 flex items-center justify-center">
                  <span className="text-base font-black text-on-surface font-headline">{qIndex + 1}</span>
                </div>
                {/* Streak chip */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary/10 text-secondary rounded-full border border-secondary/20">
                  <span
                    className="material-symbols-outlined text-sm"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    local_fire_department
                  </span>
                  <span className="text-xs font-black uppercase tracking-wider">{streak} Day Streak</span>
                </div>
              </div>
              {/* XP earned + burst */}
              <div className="relative">
                {xpBurst && (
                  <span className="animate-xp-burst absolute -top-7 left-0 right-0 text-center text-secondary font-black text-sm font-headline">
                    +10 XP
                  </span>
                )}
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container rounded-full border border-outline-variant/10">
                  <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                    bolt
                  </span>
                  <span className="text-xs font-bold text-on-surface-variant">
                    +{xpEarned || "0"} XP Earned
                  </span>
                </div>
              </div>
            </div>

            {/* Question card */}
            <QuestionCard
              key={qIndex}
              question={q}
              onSubmit={handleAnswerSubmit}
              result={result}
            />
          </div>
        </main>

        {/* ── Bottom bar ───────────────────────────────────────── */}
        <footer className="fixed bottom-0 left-0 w-full z-[60] border-t border-outline-variant/10 bg-background/90 backdrop-blur-xl">
          {/* Progress bar */}
          <div className="h-1 bg-surface-container-highest">
            <div
              className="h-full bg-secondary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="md:pl-52 flex items-center justify-between px-6 py-3 gap-4">
            {/* Report button */}
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-outline hover:text-on-surface hover:bg-surface-container transition-all font-bold text-sm">
              <span className="material-symbols-outlined text-base">flag</span>
              Report
            </button>

            <button
              className="px-5 py-2.5 rounded-xl text-outline hover:text-on-surface hover:bg-surface-container transition-all font-bold text-sm"
              onClick={() => setState("video")}
            >
              <span className="material-symbols-outlined text-sm align-middle mr-1">replay</span>
              Rewatch
            </button>
          </div>
        </footer>

        <ResultBottomSheet
          result={result}
          onContinue={handleNextQuestion}
          isLast={qIndex === questions.length - 1}
          isSubmitting={isSubmitting}
          sidebarOffset
        />
      </div>
    );
  }

  // ─── Failed ─────────────────────────────────────────────────
  if (state === "failed") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 overflow-hidden selection:bg-primary/30">
        {/* Ambient Nebula */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-error/5 blur-[120px]" />
          <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
        </div>

        <div className="relative z-10 w-full max-w-2xl flex flex-col items-center">
          {/* Central Content Card */}
          <div className="bg-surface-container-low rounded-3xl p-8 md:p-12 text-center relative overflow-hidden w-full">
            {/* Atmospheric glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-error/5 to-transparent opacity-50" />

            {/* Icon */}
            <div className="relative z-10 flex justify-center mb-6">
              <div className="w-24 h-24 rounded-full bg-error-container/10 flex items-center justify-center border border-error-container/20">
                <span className="material-symbols-outlined text-error text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  heart_minus
                </span>
              </div>
            </div>

            {/* Banner */}
            <div className="relative z-10 inline-flex items-center gap-2 bg-error-container text-on-error-container px-6 py-2 rounded-full font-headline font-extrabold tracking-widest text-sm uppercase mb-6 shadow-lg shadow-error-container/20">
              <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
              {lives === 99 ? "Test Failed" : "Out of Lives"}
            </div>

            <h1 className="relative z-10 text-4xl md:text-5xl font-headline font-black mb-6 tracking-tight text-on-surface">
              {lives === 99 ? "Keep Trying!" : "Mission Failed"}
            </h1>

            <p className="relative z-10 text-on-surface-variant text-center max-w-md mx-auto mb-8 leading-relaxed">
              {lives === 99
                ? "You didn't meet the passing score. Review the chapter and try again."
                : "Review the video lesson and try again to master this concept. Every great astronaut fails before they fly."}
            </p>

            {/* Stats Grid */}
            <div className="relative z-10 grid grid-cols-2 gap-4 text-left mb-2">
              <div className="bg-surface-container-lowest p-6 rounded-2xl flex flex-col justify-between h-28">
                <span className="text-outline text-xs font-label font-bold uppercase tracking-widest">Questions</span>
                <div className="flex items-center gap-2 text-on-surface font-headline text-2xl font-black">
                  <span className="material-symbols-outlined text-xl">quiz</span>
                  {qIndex + 1} / {questions.length}
                </div>
              </div>
              <div className="bg-surface-container-lowest p-6 rounded-2xl flex flex-col justify-between h-28 border border-error-container/20">
                <span className="text-outline text-xs font-label font-bold uppercase tracking-widest">Vitality</span>
                <div className="flex items-center gap-2 text-error font-headline text-2xl font-black">
                  <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                  0/{maxLives}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-4 w-full px-4 mt-8">
            <button
              className="w-full py-5 bg-secondary-container text-on-secondary-container rounded-2xl font-headline font-extrabold text-lg flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-secondary-container/20 group"
              onClick={handleRetry}
            >
              Try Again
              <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">refresh</span>
            </button>
            <button
              className="w-full py-5 bg-transparent border-2 border-outline-variant text-on-surface rounded-2xl font-headline font-bold text-lg hover:bg-surface-container-high transition-colors"
              onClick={finishNode}
            >
              Back to Map
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Complete ───────────────────────────────────────────────
  if (state === "complete") {
    const isTest = lives === 99;
    const livesLost = maxLives - lives;
    const precision = questions.length > 0
      ? Math.round(((questions.length - wrongAnswers) / questions.length) * 100)
      : 100;

    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 overflow-hidden selection:bg-primary/30">
        {/* Ambient Nebula Background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
          <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-secondary/5 blur-[120px]" />
        </div>

        {/* Animated confetti */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {[
            { left: '5%',  w: 6,  h: 6,  bg: '#27a640', dur: '2.8s', delay: '0s',    r: 'rounded-full' },
            { left: '12%', w: 8,  h: 8,  bg: '#58a6ff', dur: '3.2s', delay: '0.3s',  r: 'rotate-45' },
            { left: '22%', w: 5,  h: 8,  bg: '#f0883e', dur: '2.5s', delay: '0.1s',  r: '' },
            { left: '35%', w: 10, h: 6,  bg: '#27a640', dur: '3.8s', delay: '0.5s',  r: 'rounded-sm' },
            { left: '48%', w: 6,  h: 6,  bg: '#58a6ff', dur: '2.9s', delay: '0.2s',  r: 'rounded-full' },
            { left: '58%', w: 7,  h: 7,  bg: '#d2a8ff', dur: '3.1s', delay: '0.7s',  r: 'rotate-45' },
            { left: '67%', w: 5,  h: 9,  bg: '#f0883e', dur: '2.7s', delay: '0.4s',  r: '' },
            { left: '75%', w: 9,  h: 5,  bg: '#27a640', dur: '3.5s', delay: '0.1s',  r: 'rounded-full' },
            { left: '85%', w: 6,  h: 6,  bg: '#58a6ff', dur: '2.6s', delay: '0.6s',  r: 'rotate-45' },
            { left: '92%', w: 8,  h: 8,  bg: '#d2a8ff', dur: '3.3s', delay: '0.3s',  r: 'rounded-sm' },
            { left: '18%', w: 5,  h: 5,  bg: '#f0883e', dur: '2.4s', delay: '0.8s',  r: '' },
            { left: '42%', w: 7,  h: 7,  bg: '#27a640', dur: '3.0s', delay: '0.2s',  r: 'rounded-full' },
            { left: '62%', w: 6,  h: 10, bg: '#58a6ff', dur: '2.8s', delay: '0.9s',  r: 'rotate-45' },
            { left: '78%', w: 8,  h: 5,  bg: '#d2a8ff', dur: '3.4s', delay: '0.15s', r: '' },
            { left: '30%', w: 5,  h: 5,  bg: '#f0883e', dur: '2.6s', delay: '0.5s',  r: 'rounded-sm' },
            { left: '53%', w: 9,  h: 9,  bg: '#27a640', dur: '3.7s', delay: '0.35s', r: 'rounded-full' },
            { left: '88%', w: 6,  h: 6,  bg: '#58a6ff', dur: '2.9s', delay: '0.7s',  r: 'rotate-45' },
            { left: '8%',  w: 7,  h: 7,  bg: '#d2a8ff', dur: '3.2s', delay: '0.4s',  r: '' },
          ].map((c, i) => (
            <div
              key={i}
              className={`absolute top-0 animate-confetti ${c.r}`}
              style={{
                left: c.left,
                width: c.w,
                height: c.h,
                backgroundColor: c.bg,
                animationDuration: c.dur,
                animationDelay: c.delay,
                opacity: 0.75,
              }}
            />
          ))}
        </div>

        <main className="relative z-10 w-full max-w-2xl flex flex-col items-center">
          {/* Central Content Card — Matches lesson_completed stitch */}
          <div className="bg-surface-container-low rounded-3xl p-8 md:p-12 text-center relative overflow-hidden w-full group">
            {/* Glowing Atmosphere */}
            <div className="absolute inset-0 bg-gradient-to-b from-secondary/5 to-transparent opacity-50" />

            {/* Star Rating Display */}
            <div className="relative z-10 flex justify-center gap-4 mb-6">
              {[1, 2, 3].map((s) => (
                <span
                  key={s}
                  className={`material-symbols-outlined animate-star-pop ${
                    s === 2 ? "text-6xl md:text-8xl -translate-y-4" : "text-5xl md:text-7xl"
                  }`}
                  style={{
                    fontVariationSettings: "'FILL' 1",
                    color: s <= stars ? "#f0883e" : "#414752",
                    filter: s <= stars ? "drop-shadow(0 0 15px rgba(240,136,62,0.4))" : "none",
                    animationDelay: `${(s - 1) * 0.15}s`,
                  }}
                >
                  star
                </span>
              ))}
            </div>

            {/* Gold Banner */}
            {stars >= 3 && (
              <div className="relative z-10 inline-flex items-center gap-2 bg-tertiary-container text-on-tertiary-container px-6 py-2 rounded-full font-headline font-extrabold tracking-widest text-sm uppercase mb-8 shadow-lg shadow-tertiary-container/20">
                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                Perfect Score!
              </div>
            )}

            <h1 className="relative z-10 text-4xl md:text-5xl font-headline font-black mb-10 tracking-tight text-on-surface">
              Lesson Mastered
            </h1>

            {/* Stats Grid — Asymmetrical per stitch */}
            <div className="relative z-10 grid grid-cols-2 gap-4 text-left">
              <div className="animate-stat-in bg-surface-container-lowest p-6 rounded-2xl flex flex-col justify-between h-32" style={{ animationDelay: '0.3s' }}>
                <span className="text-outline text-xs font-label font-bold uppercase tracking-widest">Experience Points</span>
                <div className="flex items-center gap-2 text-secondary font-headline text-3xl font-black">
                  <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                  +{xpEarned} XP
                </div>
              </div>
              <div className="animate-stat-in bg-surface-container-lowest p-6 rounded-2xl flex flex-col justify-between h-32" style={{ animationDelay: '0.45s' }}>
                <span className="text-outline text-xs font-label font-bold uppercase tracking-widest">Precision</span>
                <div className="flex items-center gap-2 text-primary font-headline text-3xl font-black">
                  <span className="material-symbols-outlined text-2xl">target</span>
                  {precision}%
                </div>
              </div>
              <div className="animate-stat-in bg-surface-container-lowest p-6 rounded-2xl flex flex-col justify-between h-32" style={{ animationDelay: '0.6s' }}>
                <span className="text-outline text-xs font-label font-bold uppercase tracking-widest">Time Spent</span>
                <div className="flex items-center gap-2 text-on-surface font-headline text-3xl font-black">
                  <span className="material-symbols-outlined text-2xl">timer</span>
                  {String(Math.floor(timeSpent / 60)).padStart(2, "0")}:{String(timeSpent % 60).padStart(2, "0")}
                </div>
              </div>
              {isTest ? (
                <div className="animate-stat-in bg-surface-container-lowest p-6 rounded-2xl flex flex-col justify-between h-32" style={{ animationDelay: '0.75s' }}>
                  <span className="text-outline text-xs font-label font-bold uppercase tracking-widest">Accuracy</span>
                  <div className="flex items-center gap-2 text-secondary font-headline text-3xl font-black">
                    <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>target</span>
                    {questions.length - wrongAnswers}/{questions.length}
                  </div>
                </div>
              ) : (
                <div className="animate-stat-in bg-surface-container-lowest p-6 rounded-2xl flex flex-col justify-between h-32 relative overflow-hidden border border-error-container/20" style={{ animationDelay: '0.75s' }}>
                  <span className="text-outline text-xs font-label font-bold uppercase tracking-widest">Vitality</span>
                  <div className="flex items-center gap-2 text-error font-headline text-3xl font-black">
                    <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                    {lives}/{maxLives}
                  </div>
                  {livesLost > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 py-1 bg-error-container text-[10px] text-center text-on-error-container font-bold uppercase">
                      -{livesLost} Heart{livesLost > 1 ? "s" : ""}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-4 w-full px-4 mt-8">
            {revisionCards.length > 0 && !showRevisionModal ? (
              <button
                className="w-full py-5 bg-secondary-container text-on-secondary-container rounded-2xl font-headline font-extrabold text-lg flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-secondary-container/20 group"
                onClick={() => setShowRevisionModal(true)}
              >
                Quick Revision First
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">auto_fix_high</span>
              </button>
            ) : (
              <button
                className="w-full py-5 bg-secondary-container text-on-secondary-container rounded-2xl font-headline font-extrabold text-lg flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-secondary-container/20 group"
                onClick={finishNode}
              >
                Continue to Next Lesson
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </button>
            )}
            {incorrectQuestions.length > 0 && (
              <button
                className="w-full py-5 bg-transparent border-2 border-outline-variant text-on-surface rounded-2xl font-headline font-bold text-lg hover:bg-surface-container-high transition-colors"
                onClick={() => setShowMistakes(true)}
              >
                Review Mistakes ({incorrectQuestions.length})
              </button>
            )}
            <button
              onClick={finishNode}
              className="w-full py-3 text-outline text-sm font-bold hover:text-on-surface transition-colors"
            >
              Back to Map
            </button>
          </div>

          {/* Inline mistakes review */}
          {showMistakes && (
            <div className="w-full px-4 mt-6 mb-4">
              <div className="bg-surface-container rounded-2xl border border-outline-variant/10 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/10">
                  <h3 className="text-sm font-black text-white">Mistakes Review</h3>
                  <button onClick={() => setShowMistakes(false)} className="material-symbols-outlined text-outline hover:text-on-surface text-lg">close</button>
                </div>
                <div className="divide-y divide-outline-variant/10">
                  {incorrectQuestions.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 px-5 py-4">
                      <span className="material-symbols-outlined text-error text-lg shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span>
                      <div className="min-w-0">
                        <p className="text-sm text-on-surface-variant leading-snug">{item.question}</p>
                        <p className="text-xs text-secondary mt-1 font-bold">✓ {item.correct_answer}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>

        {showRevisionModal && (
          <FlashcardModal
            cards={revisionCards}
            onComplete={() => setShowRevisionModal(false)}
            finalButtonText="Done"
          />
        )}
      </div>
    );
  }

  return null;
}
