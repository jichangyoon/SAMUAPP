import { Preferences } from '@capacitor/preferences';

// 네이티브 스토리지 유틸리티 - 웹과 네이티브 앱 모두 지원
export class NativeStorage {
  // 데이터 저장
  static async setItem(key: string, value: string): Promise<void> {
    try {
      await Preferences.set({ key, value });
    } catch (error) {
      // 네이티브 API 실패 시 localStorage 폴백
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, value);
      }
    }
  }

  // 데이터 가져오기
  static async getItem(key: string): Promise<string | null> {
    try {
      const { value } = await Preferences.get({ key });
      return value;
    } catch (error) {
      // 네이티브 API 실패 시 localStorage 폴백
      if (typeof window !== 'undefined' && window.localStorage) {
        return localStorage.getItem(key);
      }
      return null;
    }
  }

  // 데이터 삭제
  static async removeItem(key: string): Promise<void> {
    try {
      await Preferences.remove({ key });
    } catch (error) {
      // 네이티브 API 실패 시 localStorage 폴백
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(key);
      }
    }
  }

  // 모든 데이터 삭제
  static async clear(): Promise<void> {
    try {
      await Preferences.clear();
    } catch (error) {
      // 네이티브 API 실패 시 localStorage 폴백
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.clear();
      }
    }
  }
}