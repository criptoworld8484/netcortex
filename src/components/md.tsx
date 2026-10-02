import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MD({ children, className = "" }: { children: string; className?: string }) {
  if (!children || !children.trim()) return null;
  return (
    <div
      className={`prose prose-sm prose-invert max-w-none
        prose-p:my-1.5 prose-li:my-0.5
        prose-strong:text-fg prose-code:rounded prose-code:bg-panel2 prose-code:px-1.5 prose-code:py-0.5 prose-code:font-mono prose-code:text-sm prose-code:text-accent prose-code:before:content-none prose-code:after:content-none
        prose-pre:border prose-pre:border-edge prose-pre:bg-[#0b0f16] prose-pre:font-mono prose-pre:text-xs
        prose-a:text-sky prose-headings:mb-1 prose-headings:mt-3 prose-h3:text-base prose-h4:text-sm ${className}`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
