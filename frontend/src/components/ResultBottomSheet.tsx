interface ResultBottomSheetProps {
  result: { is_correct: boolean; correct_answer: string; hint: string; explanation: string } | null;
  onContinue: () => void;
  isLast: boolean;
  isSubmitting?: boolean;
  sidebarOffset?: boolean;
}

export default function ResultBottomSheet({
  result,
  onContinue,
  isLast,
  isSubmitting,
  sidebarOffset,
}: ResultBottomSheetProps) {
  const visible = !!result;
  const correct = result?.is_correct;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-[70] transition-transform duration-300 ease-out ${
        visible ? 'translate-y-0' : 'translate-y-full'
      } ${sidebarOffset ? 'md:left-52' : ''}`}
    >
      <div
        className={`px-6 pt-6 pb-8 rounded-t-3xl shadow-2xl border-t-2 ${
          correct
            ? 'bg-[#071a10] border-secondary/40'
            : 'bg-[#1c0a0a] border-error/40'
        }`}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <span
            className={`material-symbols-outlined text-3xl ${correct ? 'text-secondary' : 'text-error'}`}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {correct ? 'check_circle' : 'cancel'}
          </span>
          <span className={`font-headline font-black text-xl ${correct ? 'text-secondary' : 'text-error'}`}>
            {correct ? 'Correct!' : 'Incorrect'}
          </span>
        </div>

        {/* Wrong: show correct answer */}
        {!correct && result?.correct_answer && (
          <div className="text-sm text-on-surface-variant mb-2">
            Correct Answer:{' '}
            <strong className="text-on-surface">{result.correct_answer}</strong>
          </div>
        )}

        {/* Hint */}
        {!correct && result?.hint && (
          <div className="flex items-center gap-2 text-tertiary text-sm mb-2">
            <span className="material-symbols-outlined text-sm">lightbulb</span>
            <span>{result.hint}</span>
          </div>
        )}

        {/* Explanation */}
        {result?.explanation && (
          <p className="text-on-surface-variant text-sm leading-relaxed mb-5">
            {result.explanation}
          </p>
        )}

        {/* Continue button */}
        <button
          onClick={onContinue}
          disabled={isSubmitting}
          className={`w-full py-4 rounded-2xl font-headline font-black text-base tracking-wide transition-all active:scale-[0.98] disabled:opacity-50 ${
            correct
              ? 'bg-secondary text-on-secondary hover:brightness-110 shadow-lg shadow-secondary/20'
              : 'bg-error text-on-error hover:brightness-110 shadow-lg shadow-error/20'
          }`}
        >
          {isSubmitting ? 'Saving...' : isLast ? 'Finish' : 'Continue →'}
        </button>
      </div>
    </div>
  );
}
