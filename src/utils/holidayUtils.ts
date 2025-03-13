import { format } from 'date-fns';

interface Holiday {
  date: string;
  name: string;
  isHoliday: boolean;
}

interface HolidayApiResponse {
  response: {
    header: {
      resultCode: string;
      resultMsg: string;
    };
    body: {
      items: {
        item: Array<{
          locdate: number;
          dateName: string;
        }> | {
          locdate: number;
          dateName: string;
        };
      };
      totalCount: number;
    };
  };
}

// LocalStorage 키 상수
const HOLIDAY_CACHE_KEY = 'holiday_cache_';

export class HolidayService {
  private static holidays: Map<number, Holiday[]> = new Map();
  private static readonly API_KEY = import.meta.env.VITE_HOLIDAY_API_KEY;
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000; // 1초
  private static readonly CACHE_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30일 (밀리초)
  private static fetchPromises: Map<number, Promise<Holiday[]>> = new Map();

  private static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private static formatDate(date: number): string {
    const dateStr = date.toString();
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
  }

  private static async fetchWithRetry(url: string): Promise<Response> {
    let lastError: Error | null = null;
    
    for (let i = 0; i < this.MAX_RETRIES; i++) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response;
      } catch (error) {
        lastError = error as Error;
        if (i < this.MAX_RETRIES - 1) {
          await this.delay(this.RETRY_DELAY * Math.pow(2, i)); // exponential backoff
          continue;
        }
      }
    }
    
    throw lastError || new Error('Failed to fetch after retries');
  }

  // localStorage에 캐시 저장
  private static saveToLocalStorage(year: number, holidays: Holiday[]) {
    try {
      const now = new Date().getTime();
      const cacheData = {
        timestamp: now,
        data: holidays
      };
      localStorage.setItem(`${HOLIDAY_CACHE_KEY}${year}`, JSON.stringify(cacheData));
    } catch (_) {
      // 저장 실패 시 조용히 진행
    }
  }

  // localStorage에서 캐시 로드
  private static loadFromLocalStorage(year: number): Holiday[] | null {
    try {
      const cachedData = localStorage.getItem(`${HOLIDAY_CACHE_KEY}${year}`);
      if (!cachedData) return null;
      
      const { timestamp, data } = JSON.parse(cachedData);
      const now = new Date().getTime();
      
      // 캐시 만료 확인
      if (now - timestamp > this.CACHE_EXPIRY) {
        localStorage.removeItem(`${HOLIDAY_CACHE_KEY}${year}`);
        return null;
      }
      
      return data;
    } catch (_) {
      return null;
    }
  }

  private static async fetchHolidays(year: number): Promise<Holiday[]> {
    try {
      if (!this.API_KEY) {
        return [];
      }

      const url = new URL('https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo');
      url.searchParams.append('serviceKey', this.API_KEY);
      url.searchParams.append('solYear', year.toString());
      url.searchParams.append('numOfRows', '100');
      url.searchParams.append('_type', 'json');

      const response = await this.fetchWithRetry(url.toString());
      const responseText = await response.text();

      try {
        const data = JSON.parse(responseText) as HolidayApiResponse;

        if (data.response?.header?.resultCode !== '00') {
          return [];
        }

        if (!data.response?.body?.items?.item) {
          return [];
        }

        const items = data.response.body.items.item;
        const holidayItems = Array.isArray(items) ? items : [items];

        const holidays = holidayItems.map(item => ({
          date: this.formatDate(item.locdate),
          name: item.dateName,
          isHoliday: true
        }));

        return holidays;
      } catch (parseError) {
        return [];
      }
    } catch (error) {
      return [];
    }
  }

  public static async getHolidays(year: number): Promise<Holiday[]> {
    // 1. 메모리 캐시 확인
    const cachedHolidays = this.holidays.get(year);
    if (cachedHolidays) {
      return cachedHolidays;
    }

    // 2. 이미 진행 중인 요청이 있는지 확인
    if (this.fetchPromises.has(year)) {
      return this.fetchPromises.get(year)!;
    }

    // 3. localStorage 캐시 확인
    const localStorageHolidays = this.loadFromLocalStorage(year);
    if (localStorageHolidays) {
      this.holidays.set(year, localStorageHolidays);
      return localStorageHolidays;
    }

    // 4. API 요청으로 데이터 가져오기
    const fetchPromise = this.fetchHolidays(year).then(holidays => {
      if (holidays.length > 0) {
        // 메모리 캐시에 저장
        this.holidays.set(year, holidays);
        // localStorage에 저장
        this.saveToLocalStorage(year, holidays);
      }
      // 완료 후 프로미스 맵에서 제거
      this.fetchPromises.delete(year);
      return holidays;
    }).catch(() => {
      // 에러 발생 시 프로미스 맵에서 제거
      this.fetchPromises.delete(year);
      return [];
    });

    // 진행 중인 요청 저장
    this.fetchPromises.set(year, fetchPromise);
    return fetchPromise;
  }

  public static async isHoliday(date: Date): Promise<boolean> {
    try {
      const year = date.getFullYear();
      const holidays = await this.getHolidays(year);
      const dateString = format(date, 'yyyy-MM-dd');
      return holidays.some(holiday => holiday.date === dateString);
    } catch (error) {
      return false; // 오류 발생 시 휴일이 아닌 것으로 처리
    }
  }

  public static clearCache(): void {
    this.holidays.clear();
    this.fetchPromises.clear();
    
    // localStorage에서 휴일 캐시 데이터도 모두 삭제
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(HOLIDAY_CACHE_KEY)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (_) {
      // 삭제 실패 시 조용히 진행
    }
  }
}