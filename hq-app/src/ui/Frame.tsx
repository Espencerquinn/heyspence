import type { ReactNode } from 'react';

export function Frame(props: {
  title?: string;
  meta?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const { title, meta, className, children } = props;
  return (
    <section className={`frame ${className ?? ''}`}>
      <i className="c tl" /><i className="c tr" /><i className="c bl" /><i className="c br" />
      {title && (
        <div className="frame__head">
          <span className="frame__title">{title}</span>
          {meta && <span className="frame__meta">{meta}</span>}
        </div>
      )}
      {children}
    </section>
  );
}
