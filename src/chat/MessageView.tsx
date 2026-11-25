import { Fragment, type ReactNode } from 'react';

/**
 * Safe mini-markdown → React (no dangerouslySetInnerHTML). Supports:
 * ### headings, - bullets, 1. lists, --- rules, **bold**, *italic* / _italic_, `code`, [S1] citations.
 */
function inline(text: string, onCite?: (n: number) => void, key = ''): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[S\d+\]|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const k = `${key}-${i++}`;
    if (tok.startsWith('**')) out.push(<strong key={k} className="font-semibold text-oat-50">{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith('`')) out.push(<code key={k} className="rounded bg-espresso-950 px-1.5 py-0.5 font-mono text-[0.85em] text-sage-200">{tok.slice(1, -1)}</code>);
    else if (tok.startsWith('[S')) {
      const n = Number(tok.slice(2, -1));
      out.push(
        <button
          key={k}
          type="button"
          onClick={() => onCite?.(n)}
          className="mx-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-field/15 px-1 align-super text-[10px] font-bold text-field hover:bg-field/25"
          aria-label={`Source ${n}`}
        >
          {n}
        </button>,
      );
    } else out.push(<em key={k}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text, onCite }: { text: string; onCite?: (n: number) => void }) {
  const lines = text.split('\n');
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const L = list;
    const Tag = L.ordered ? 'ol' : 'ul';
    blocks.push(
      <Tag key={`l${blocks.length}`} className={`my-1.5 space-y-1 pl-5 ${L.ordered ? 'list-decimal' : 'list-disc marker:text-sage-400'}`}>
        {L.items.map((it, j) => (
          <li key={j}>{inline(it, onCite, `li${blocks.length}-${j}`)}</li>
        ))}
      </Tag>,
    );
    list = null;
  };
  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    const bullet = /^\s*[-•]\s+(.*)/.exec(line);
    const num = /^\s*\d+\.\s+(.*)/.exec(line);
    if (bullet || num) {
      const ordered = !!num;
      if (!list || list.ordered !== ordered) {
        flush();
        list = { ordered, items: [] };
      }
      list!.items.push((bullet ?? num)![1]);
      return;
    }
    flush();
    if (!line.trim()) return;
    if (line.startsWith('### ')) blocks.push(<p key={idx} className="mt-2 font-semibold text-sage-200">{inline(line.slice(4), onCite, `h${idx}`)}</p>);
    else if (line === '---') blocks.push(<hr key={idx} className="my-3 border-espresso-600" />);
    else blocks.push(<p key={idx} className="my-1.5">{inline(line, onCite, `p${idx}`)}</p>);
  });
  flush();
  return <Fragment>{blocks}</Fragment>;
}
