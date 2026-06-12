import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface MarkdownMessageProps {
  content: string;
  className?: string;
}

/**
 * Renders AI tutor responses as Markdown with GitHub-flavored extensions,
 * LaTeX math ($...$ inline, $$...$$ block via remark-math + rehype-katex),
 * code blocks, lists, and tables. KaTeX CSS is loaded globally in index.html.
 */
export default function MarkdownMessage({ content, className }: MarkdownMessageProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => <strong className="font-bold text-on-surface">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          h1: ({ children }) => <h1 className="text-lg font-bold font-headline mb-2 mt-1">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-bold font-headline mb-2 mt-1">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-bold font-headline mb-1 mt-1">{children}</h3>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:brightness-110">
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-primary/40 pl-3 my-2 text-on-surface-variant italic">
              {children}
            </blockquote>
          ),
          code: ({ className: codeCls, children }) => {
            const isBlock = (codeCls ?? '').includes('language-');
            if (isBlock) {
              return (
                <code className={`${codeCls ?? ''} block`}>{children}</code>
              );
            }
            return (
              <code className="bg-surface-container-highest text-primary px-1.5 py-0.5 rounded text-[0.85em] font-mono">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="bg-surface-container-lowest border border-outline-variant/10 rounded-xl p-3 my-2 overflow-x-auto text-[13px] font-mono leading-relaxed">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-2">
              <table className="w-full text-sm border-collapse">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-outline-variant/20 px-3 py-1.5 text-left font-bold bg-surface-container-high">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-outline-variant/20 px-3 py-1.5">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
