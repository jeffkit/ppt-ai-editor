import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownMessageProps {
  content: string;
}

export const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ content }) => {
  return (
    <div className="break-words overflow-wrap-anywhere word-break-break-all">
      <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ inline, className, children, ...props }: { inline?: boolean; className?: string; children?: React.ReactNode }) {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <SyntaxHighlighter
              style={tomorrow}
              language={match[1]}
              PreTag="div"
              className="rounded-md text-sm overflow-auto"
              wrapLines={true}
              wrapLongLines={true}
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono" {...props}>
              {children}
            </code>
          );
        },
        h1: ({ children }) => (
          <h1 className="text-lg font-bold mt-4 mb-2 text-gray-900">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base font-bold mt-3 mb-2 text-gray-900">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-bold mt-2 mb-1 text-gray-900">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="mb-2 leading-relaxed break-words overflow-wrap-anywhere">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="leading-relaxed break-words overflow-wrap-anywhere">{children}</li>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-gray-300 pl-3 italic text-gray-600 mb-2">
            {children}
          </blockquote>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-gray-900">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic">{children}</em>
        ),
        a: ({ children, href }) => (
          <a 
            href={href} 
            className="text-blue-600 hover:text-blue-800 underline" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ),
        table: ({ children }) => (
          <table className="border-collapse border border-gray-300 mb-2 text-sm">
            {children}
          </table>
        ),
        th: ({ children }) => (
          <th className="border border-gray-300 px-2 py-1 bg-gray-100 font-semibold text-left">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-gray-300 px-2 py-1">{children}</td>
        ),
      }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};