import AsyncStorage from '@react-native-async-storage/async-storage';

/** Storage keys — identical to the web app so behavior matches. */
export const K = {
  accessToken: 'smash_access_token', // web: sessionStorage (memory-backed in mobile too)
  refreshToken: 'smash_refresh_token', // web: localStorage
  activeScreen: 'sp_activeScreen',
  activeOrgId: 'sp_activeOrgId',
  activeWsId: 'sp_activeWsId',
  activeProjId: 'sp_activeProjId',
  activeView: 'sp_activeView',
  theme: 'studiopilot_theme',
} as const;

export const store = {
  get: (key: string) => AsyncStorage.getItem(key),
  set: (key: string, value: string) => AsyncStorage.setItem(key, value),
  remove: (key: string) => AsyncStorage.removeItem(key),
  async getMany(keys: string[]): Promise<Record<string, string | null>> {
    const pairs = await AsyncStorage.multiGet(keys);
    return Object.fromEntries(pairs);
  },
  async removeMany(keys: string[]) {
    await AsyncStorage.multiRemove(keys);
  },
};
