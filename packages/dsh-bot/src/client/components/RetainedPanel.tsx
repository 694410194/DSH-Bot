import { useEffect, useState, type ReactNode } from 'react';
/** Keep an opened section's DOM and drafts, without mounting unopened sections. */
export function RetainedPanel({ active, children, id, labelledBy }: { active: boolean; children: ReactNode; id?: string; labelledBy?: string }) {
  const [visited, setVisited] = useState(active);
  useEffect(() => {
    if (active) setVisited(true);
  }, [active]);
  return active || visited ? (
    <div hidden={!active} role="tabpanel" id={id} aria-labelledby={labelledBy}>
      {children}
    </div>
  ) : null;
}
