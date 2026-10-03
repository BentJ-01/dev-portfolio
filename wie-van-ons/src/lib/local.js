// localStorage kan ontbreken of gooien (privé-venster, geblokkeerde opslag).
const read = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key, value) => {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* niets aan te doen */
  }
};

let memoryToken = null;

export const getToken = () => read('wvo.token') ?? memoryToken;
export const setToken = (token) => {
  memoryToken = token;
  write('wvo.token', token);
};
export const getAdminKey = () => read('wvo.adminKey');
export const setAdminKey = (key) => write('wvo.adminKey', key);
