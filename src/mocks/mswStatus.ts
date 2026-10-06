/** Tracks whether the MSW service worker is intercepting requests (dev only). */
let active = false;

export const setMswActive = (v: boolean) => { active = v; };
export const isMswActive = () => active;
