import { useEffect } from 'react';

export function useUnsavedWarning(when: boolean) {
  useEffect(()=>{
    if (!when) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue=''; };
    window.addEventListener('beforeunload', handler);
    return ()=> window.removeEventListener('beforeunload', handler);
  }, [when]);
}
