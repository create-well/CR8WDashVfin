import React, { useState } from 'react';

export function InlineEdit({ value, onSave, className, style, multiline }: {
  value: string; onSave: (v: string) => void;
  className?: string; style?: React.CSSProperties; multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function commit() {
    if (draft.trim() && draft !== value) onSave(draft.trim());
    setEditing(false);
  }

  if (editing) {
    const props = {
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
      onBlur: commit,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !multiline) { e.preventDefault(); commit(); }
        if (e.key === 'Escape') { setDraft(value); setEditing(false); }
      },
      autoFocus: true,
      style: { width: '100%', background: 'rgba(255,255,255,0.1)', border: '1px solid var(--clay-velour)', borderRadius: 6, padding: '4px 8px', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: 'inherit', ...style },
    };
    return multiline
      ? <textarea {...props} rows={3} style={{ ...props.style, resize: 'vertical' }} />
      : <input {...props} />;
  }

  return (
    <span
      className={className}
      style={{ cursor: 'text', ...style }}
      onClick={() => { setDraft(value); setEditing(true); }}
      title="Click to edit"
    >
      {value}
    </span>
  );
}
