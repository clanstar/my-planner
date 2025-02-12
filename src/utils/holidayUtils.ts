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

export class HolidayService {
  private static holidays: Map<number, Holiday[]> = new Map();
  private static readonly API_KEY = import.meta.env.VITE_HOLIDAY_API_KEY;
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000; // 1초
  
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

  private static async fetchHolidays(year: number): Promise<Holiday[]> {
    try {
      if (!this.API_KEY) {
        console.warn('Holiday API key is not configured');
        return [];
      }

      const url = new URL('https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo');
      url.searchParams.append('serviceKey', decodeURIComponent(this.API_KEY));
      url.searchParams.append('solYear', year.toString());
      url.searchParams.append('numOfRows', '100');
      url.searchParams.append('_type', 'json');

      const response = await this.fetchWithRetry(url.toString());
      const responseText = await response.text();

      try {
        const data = JSON.parse(responseText) as HolidayApiResponse;

        if (!data.response?.body?.items?.item) {
          return [];
        }

        const items = Array.isArray(data.response.body.items.item)
          ? data.response.body.items.item
          : [data.response.body.items.item];

        return items.map(item => ({
          date: this.formatDate(item.locdate),
          name: item.dateName,
          isHoliday: true
        }));

      } catch (parseError) {
        console.warn('Failed to parse holiday API response - continuing without holiday data');
        return [];
      }

    } catch (error) {
      console.warn('Failed to fetch holidays - continuing without holiday data');
      return [];
    }
  }

  public static async getHolidays(year: number): Promise<Holiday[]> {
    // 캐시 확인
    const cachedHolidays = this.holidays.get(year);
    if (cachedHolidays) {
      return cachedHolidays;
    }

    try {
      const holidays = await this.fetchHolidays(year);
      this.holidays.set(year, holidays); // 캐시에 저장
      return holidays;
    } catch (error) {
      console.error(`Error fetching holidays for year ${year}:`, error);
      return [];
    }
  }

  public static async isHoliday(date: Date): Promise<boolean> {
    try {
      const year = date.getFullYear();
      const holidays = await this.getHolidays(year);
      const dateString = date.toISOString().split('T')[0];
      return holidays.some(holiday => holiday.date === dateString);
    } catch (error) {
      console.warn('Error checking holiday status:', error);
      return false; // 오류 발생 시 휴일이 아닌 것으로 처리
    }
  }

  public static clearCache(): void {
    this.holidays.clear();
  }
}