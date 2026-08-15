import ReactMarkdown from 'react-markdown';
import Link from 'next/link';

/**
 * Renderer Markdown untuk Blog, Knowledge Base, legal pages, dan CMS.
 * Berjalan di Server Component — tanpa JavaScript tambahan di klien.
 */

export function Markdown({ content }: { content: string }) {
  return (
    <div className="prose-ws">
      <ReactMarkdown
        components={{
          a: ({ href, children }) => {
            const url = href ?? '';
            if (url.startsWith('/')) {
              return <Link href={url}>{children}</Link>;
            }
            if (url.startsWith('http')) {
              return (
                <a href={url} target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              );
            }
            return <a href={url}>{children}</a>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
