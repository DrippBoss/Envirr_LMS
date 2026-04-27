import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../context/AuthContext';
import QuestionCard from '../components/QuestionCard';
import ResultBottomSheet from '../components/ResultBottomSheet';
import MathText from '../components/MathText';

type Phase = 'loading' | 'intro' | 'quiz' | 'complete';

export default function MockTestPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('loading');
  const [questions, setQuestions] = useState<any[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<{ correct: boolean; question: string; correct_answer: string }[]>([]);

  useEffect(() => {
    api.get('student/mock-test/questions/')
      .then(r => { setQuestions(r.data); setPhase('intro'); })
      .catch(() => navigate('/'));
  }, []);

  const handleAnswerSubmit = async (answer: string) => {
    const q = questions[qIndex];
    const res = await api.post('student/mock-test/check/', {
      question_id: q.id,
      given_answer: answer,
    });

    // Enrich correct_answer label for MCQ
    let correctAnswer = res.data.correct_answer as string;
    if (q?.options_json && typeof correctAnswer === 'string' && correctAnswer.length === 1 && q.options_json[correctAnswer]) {
      correctAnswer = `${correctAnswer}: ${q.options_json[correctAnswer]}`;
    }

    setResult({ ...res.data, correct_answer: correctAnswer });
    setAnswers(prev => [...prev, {
      correct: res.data.is_correct,
      question: q.question_text,
      correct_answer: correctAnswer,
    }]);
    if (res.data.is_correct) setScore(s => s + 1);
    return res.data.is_correct as boolean;
  };

  const handleNext = () => {
    setResult(null);
    if (qIndex < questions.length - 1) {
      setQIndex(i => i + 1);
    } else {
      setPhase('complete');
    }
  };

  const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
  const progress = questions.length > 0 ? ((qIndex + 1) / questions.length) * 100 : 0;

  // ── Loading ──────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <p className="text-outline text-xs font-bold uppercase tracking-[0.2em]">Building your test...</p>
        </div>
      </div>
    );
  }

  // ── Intro ────────────────────────────────────────────────────
  if (phase === 'intro') {
    const chapters = [...new Set(questions.map(q => q.chapter).filter(Boolean))];
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 pt-16">
        <div className="max-w-md w-full bg-surface-container rounded-3xl p-8 border border-outline-variant/10 shadow-2xl space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-primary text-4xl">auto_awesome</span>
          </div>
          <div>
            <h1 className="text-2xl font-black font-headline text-white mb-2">AI Mock Test</h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              {questions.length} questions personalised from your weak areas. No lives — just your score.
            </p>
          </div>
          {chapters.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {chapters.map(c => (
                <span key={c} className="px-3 py-1 bg-surface-container-high rounded-full text-xs text-slate-400 border border-outline-variant/20">{c}</span>
              ))}
            </div>
          )}
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { icon: 'quiz', label: `${questions.length} Qs` },
              { icon: 'timer', label: 'No limit' },
              { icon: 'emoji_events', label: 'Score tracked' },
            ].map(s => (
              <div key={s.label} className="bg-surface-container-high rounded-xl p-3">
                <span className="material-symbols-outlined text-primary text-xl block mb-1">{s.icon}</span>
                <span className="text-xs text-slate-400 font-bold">{s.label}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setPhase('quiz')}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-secondary-container to-secondary text-on-secondary-container font-black text-base hover:brightness-110 active:scale-95 transition-all"
          >
            Start Test →
          </button>
        </div>
      </div>
    );
  }

  // ── Complete ─────────────────────────────────────────────────
  if (phase === 'complete') {
    const grade = pct >= 80 ? { label: 'Excellent!', color: 'text-secondary', icon: 'emoji_events' }
                : pct >= 60 ? { label: 'Good Job!',  color: 'text-primary',   icon: 'thumb_up'    }
                :             { label: 'Keep Practising', color: 'text-error', icon: 'fitness_center' };
    return (
      <div className="min-h-screen bg-background pt-20 pb-16 px-4">
        <div className="max-w-lg mx-auto space-y-6">
          {/* Score card */}
          <div className="bg-surface-container rounded-3xl p-8 border border-outline-variant/10 text-center space-y-4">
            <span className={`material-symbols-outlined text-6xl ${grade.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{grade.icon}</span>
            <div>
              <p className={`text-4xl font-black font-headline ${grade.color}`}>{pct}%</p>
              <p className="text-white font-bold text-lg mt-1">{grade.label}</p>
              <p className="text-slate-500 text-sm mt-1">{score} / {questions.length} correct</p>
            </div>
            {/* Score bar */}
            <div className="h-2 bg-surface-container-highest rounded-full overflow-hidden">
              <div className="h-full bg-secondary rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* Answer review */}
          <div className="bg-surface-container rounded-2xl border border-outline-variant/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-outline-variant/10">
              <h3 className="text-sm font-black text-white">Answer Review</h3>
            </div>
            <div className="divide-y divide-outline-variant/10">
              {answers.map((a, i) => (
                <div key={i} className="flex items-start gap-3 px-5 py-3.5">
                  <span className={`material-symbols-outlined text-lg shrink-0 mt-0.5 ${a.correct ? 'text-secondary' : 'text-error'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                    {a.correct ? 'check_circle' : 'cancel'}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-on-surface-variant leading-snug line-clamp-2">
                      <MathText text={a.question} />
                    </p>
                    {!a.correct && (
                      <p className="text-xs text-secondary mt-1">
                        Answer: <MathText text={a.correct_answer} />
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex-1 py-3.5 rounded-xl border border-outline-variant/20 text-slate-400 hover:text-white hover:border-outline-variant/40 font-bold transition-all"
            >
              Dashboard
            </button>
            <button
              onClick={() => { setPhase('loading'); setQIndex(0); setScore(0); setAnswers([]); setResult(null);
                api.get('student/mock-test/questions/').then(r => { setQuestions(r.data); setPhase('intro'); }); }}
              className="flex-1 py-3.5 rounded-xl bg-primary text-on-primary font-bold hover:brightness-110 active:scale-95 transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Quiz ─────────────────────────────────────────────────────
  const q = questions[qIndex];
  return (
    <div className="min-h-screen bg-background selection:bg-primary-container/30">
      {/* Top bar */}
      <header className="fixed top-0 left-0 w-full z-[60] flex items-center justify-between px-5 h-14 bg-background border-b border-outline-variant/10 backdrop-blur-xl">
        <button className="material-symbols-outlined text-outline hover:text-on-surface transition-colors" onClick={() => navigate('/')}>close</button>
        <div className="flex items-center gap-2 bg-surface-container px-4 py-1.5 rounded-full border border-outline-variant/10">
          <span className="material-symbols-outlined text-primary text-sm">auto_awesome</span>
          <span className="text-sm font-bold text-white">AI Mock Test</span>
        </div>
        <div className="flex items-center gap-1.5 bg-surface-container px-3 py-1 rounded-full border border-outline-variant/10">
          <span className="material-symbols-outlined text-secondary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
          <span className="text-sm font-bold text-on-surface">{score} / {qIndex}</span>
        </div>
      </header>

      {/* Progress bar */}
      <div className="fixed top-14 left-0 w-full h-1 bg-surface-container-highest z-[59]">
        <div className="h-full bg-secondary transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <main className="pt-20 pb-40 px-4 max-w-2xl mx-auto">
        <p className="text-xs text-outline font-bold uppercase tracking-widest mb-6 text-center">
          Question {qIndex + 1} of {questions.length} · <span className="text-slate-500">{q.chapter}</span>
        </p>
        <QuestionCard question={q} onSubmit={handleAnswerSubmit} result={result} />
      </main>

      <ResultBottomSheet
        result={result}
        onContinue={handleNext}
        isLast={qIndex === questions.length - 1}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
