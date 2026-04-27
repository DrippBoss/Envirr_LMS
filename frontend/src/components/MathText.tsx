import katex from 'katex';

interface MathTextProps {
  text: string;
  className?: string;
}

function renderMath(expr: string, displayMode: boolean): string {
  try {
    return katex.renderToString(expr, { displayMode, throwOnError: false, output: 'html' });
  } catch {
    return expr;
  }
}

/**
 * Renders a string containing LaTeX math delimiters:
 *   $...$   → inline math
 *   $$...$$ → display/block math
 * Plain text segments are rendered as-is.
 */
export default function MathText({ text, className }: MathTextProps) {
  if (!text) return null;

  const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const html = renderMath(part.slice(2, -2).trim(), true);
          return <span key={i} className="block my-2" dangerouslySetInnerHTML={{ __html: html }} />;
        }
        if (part.startsWith('$') && part.endsWith('$')) {
          const html = renderMath(part.slice(1, -1).trim(), false);
          return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
