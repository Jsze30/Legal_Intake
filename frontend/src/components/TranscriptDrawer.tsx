import { useEffect, useRef } from 'react';
import type { TranscriptCase } from '../types';

interface TranscriptDrawerProps {
  transcript: TranscriptCase;
  open: boolean;
  highlightedTurn: number | null;
  onClose: () => void;
}

export function TranscriptDrawer({ transcript, open, highlightedTurn, onClose }: TranscriptDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const highlightedRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const priorFocus = document.activeElement as HTMLElement | null;
    document.body.classList.add('drawer-open');
    closeRef.current?.focus();
    highlightedRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.classList.remove('drawer-open');
      document.removeEventListener('keydown', handleKeyDown);
      priorFocus?.focus();
    };
  }, [open, highlightedTurn, onClose]);

  return (
    <>
      <button className={`drawer-backdrop${open ? ' is-open' : ''}`} type="button" onClick={onClose} aria-label="Close transcript" tabIndex={open ? 0 : -1} />
      <aside className={`drawer${open ? ' is-open' : ''}`} role="dialog" aria-modal="true" aria-labelledby="transcript-title" aria-hidden={!open}>
        <header className="drawer-head">
          <div>
            <div className="eyebrow">Source evidence</div>
            <h2 id="transcript-title">Call transcript</h2>
          </div>
          <button ref={closeRef} className="close" type="button" onClick={onClose} aria-label="Close transcript">×</button>
        </header>
        <div className="drawer-body">
          {transcript.transcript.map((turn, index) => (
            <article
              className={`turn${index === highlightedTurn ? ' highlight' : ''}`}
              ref={index === highlightedTurn ? highlightedRef : undefined}
              key={`${turn.speaker}-${index}`}
            >
              <div className="turn-label">{turn.speaker} · turn {index + 1}</div>
              <p>“{turn.text}”</p>
            </article>
          ))}
        </div>
      </aside>
    </>
  );
}
