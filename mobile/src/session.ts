let token: string | null = null;
let expire: (() => void) | undefined;
export const getToken = () => token;
export const setToken = (value: string | null) => { token = value; };
export const onExpired = (callback?: () => void) => { expire = callback; };
export const expireSession = () => { token = null; expire?.(); };
