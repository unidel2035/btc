/**
 * Integram Cloud Database Client
 * https://интеграм.рф - облачная база данных с REST API
 */

import axios, { AxiosInstance } from 'axios';

export interface IntegramConfig {
  serverURL: string;
  database: string;
  login: string;
  password: string;
}

export interface IntegramObject {
  id: number;
  type: number;
  value: string;
  requisites: Record<string, unknown>;
  up?: number;
  created?: string;
  modified?: string;
}

export interface IntegramListResponse {
  objects: IntegramObject[];
  total?: number;
}

export class IntegramClient {
  private client: AxiosInstance;
  private config: IntegramConfig;
  private token: string | null = null;
  private xsrfToken: string | null = null;
  private isAuthenticated: boolean = false;

  constructor(config: IntegramConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: `${config.serverURL}/${config.database}`,
      withCredentials: true,
      timeout: 10000,
    });
  }

  /**
   * Аутентификация в Интеграм
   */
  async authenticate(): Promise<void> {
    if (this.isAuthenticated) {
      return;
    }

    try {
      // Integram API требует form-data с полями: db, login, pwd
      const formData = new URLSearchParams();
      formData.append('db', this.config.database);
      formData.append('login', this.config.login);
      formData.append('pwd', this.config.password);

      const response = await this.client.post('/auth', formData.toString(), {
        params: {
          JSON: '', // флаг для получения JSON ответа
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      // Integram возвращает токен и _xsrf в JSON ответе
      if (response.data && response.data.token) {
        this.token = response.data.token;
        this.xsrfToken = response.data._xsrf || response.data.token;
        this.isAuthenticated = true;
        console.log('✅ Integram authenticated successfully:', {
          userId: response.data.id,
          token: this.token?.substring(0, 10) + '...',
        });
        return;
      }

      throw new Error('Failed to extract authentication token from response');
    } catch (error) {
      console.error('❌ Integram authentication failed:', error);
      this.isAuthenticated = false;
      throw error;
    }
  }

  /**
   * Получить все объекты из таблицы
   */
  async getObjects<T = IntegramObject>(typeId: number, limit?: number): Promise<T[]> {
    await this.ensureAuthenticated();

    try {
      const response = await this.client.get(`/object/${typeId}`, {
        params: {
          JSON: '',
        },
        headers: this.getHeaders(),
      });

      // Integram возвращает объекты в поле "object" (не "objects")
      const objects = response.data?.object || [];

      // Также получаем реквизиты из поля "reqs"
      const reqs = response.data?.reqs || {};

      // Объединяем объекты с их реквизитами
      const result = objects.map((obj: any) => ({
        ...obj,
        id: parseInt(obj.id),
        type: parseInt(obj.base),
        value: obj.val,
        requisites: reqs[obj.id] || {},
        up: parseInt(obj.up),
      }));

      return limit ? result.slice(0, limit) : result;
    } catch (error) {
      console.error(`Failed to get objects for type ${typeId}:`, error);
      throw error;
    }
  }

  /**
   * Создать объект
   */
  async createObject(
    typeId: number,
    value: string,
    requisites: Record<string, unknown> = {},
  ): Promise<number> {
    await this.ensureAuthenticated();

    try {
      const response = await this.client.post<{ id: number }>('/_d_new', null, {
        params: {
          type: typeId,
          value: value,
          up: 1, // Независимый объект
        },
        headers: this.getHeaders(),
      });

      const objectId = response.data?.id;
      if (!objectId) {
        throw new Error('Failed to create object: no ID returned');
      }

      // Установить реквизиты если есть
      if (Object.keys(requisites).length > 0) {
        await this.updateRequisites(objectId, requisites);
      }

      return objectId;
    } catch (error) {
      console.error(`Failed to create object for type ${typeId}:`, error);
      throw error;
    }
  }

  /**
   * Обновить реквизиты объекта
   */
  async updateRequisites(objectId: number, requisites: Record<string, unknown>): Promise<void> {
    await this.ensureAuthenticated();

    try {
      await this.client.post('/_m_save', null, {
        params: {
          id: objectId,
          ...requisites,
        },
        headers: this.getHeaders(),
      });
    } catch (error) {
      console.error(`Failed to update requisites for object ${objectId}:`, error);
      throw error;
    }
  }

  /**
   * Удалить объект
   */
  async deleteObject(objectId: number): Promise<void> {
    await this.ensureAuthenticated();

    try {
      await this.client.post('/_d_del', null, {
        params: {
          id: objectId,
        },
        headers: this.getHeaders(),
      });
    } catch (error) {
      console.error(`Failed to delete object ${objectId}:`, error);
      throw error;
    }
  }

  /**
   * Найти объект по значению
   */
  async findObjectByValue(typeId: number, value: string): Promise<IntegramObject | null> {
    const objects = await this.getObjects(typeId);
    return objects.find((obj) => obj.value === value) || null;
  }

  /**
   * Создать таблицу (тип объектов)
   * Примечание: это упрощенная версия, полное создание таблиц лучше делать через веб-интерфейс
   */
  async createTable(
    tableName: string,
    columns: Array<{ name: string; type: string }>,
  ): Promise<number> {
    await this.ensureAuthenticated();

    // Это заглушка - фактическое создание таблиц через API может требовать более сложной логики
    // Рекомендуется создавать таблицы через веб-интерфейс Интеграм
    console.warn(
      `Creating table "${tableName}" with columns:`,
      columns.map((c) => `${c.name}:${c.type}`).join(', '),
    );
    console.warn('Note: Full table creation is recommended via Integram web interface');

    throw new Error(
      'Table creation via API is not yet fully implemented. Please use Integram web interface.',
    );
  }

  /**
   * Проверить подключение
   */
  async ping(): Promise<boolean> {
    try {
      await this.ensureAuthenticated();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Получить информацию о БД
   */
  getDatabaseInfo(): { serverURL: string; database: string; login: string } {
    return {
      serverURL: this.config.serverURL,
      database: this.config.database,
      login: this.config.login,
    };
  }

  private async ensureAuthenticated(): Promise<void> {
    if (!this.isAuthenticated) {
      await this.authenticate();
    }
  }

  private getHeaders() {
    return {
      'X-XSRF-TOKEN': this.xsrfToken || '',
      // Cookie: имя базы данных=токен
      Cookie: `${this.config.database}=${this.token}; XSRF-TOKEN=${this.xsrfToken}`,
    };
  }
}
