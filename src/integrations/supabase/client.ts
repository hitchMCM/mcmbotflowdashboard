// PostgREST Client - Migration from Supabase to Self-Hosted PostgreSQL
// Uses proxy in both development (Vite) and production (Netlify) to avoid CORS issues

// Always use /api proxy - works in dev (Vite proxy) and prod (Netlify redirects)
const POSTGREST_URL = '/api';

interface QueryResult<T = any> {
  data: T[] | null;
  error: { message: string } | null;
  count?: number;
}

interface SingleResult<T = any> {
  data: T | null;
  error: { message: string } | null;
}

class PostgrestQueryBuilder implements PromiseLike<QueryResult> {
  private table: string;
  private params: URLSearchParams;
  private selectFields: string = '*';
  private insertData: any = null;
  private updateData: any = null;
  private deleteFlag: boolean = false;
  private countMode: 'exact' | 'planned' | 'estimated' | null = null;
  private headOnly: boolean = false;

  constructor(table: string) {
    this.table = table;
    this.params = new URLSearchParams();
  }

  select(fields: string = '*', options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }): PostgrestQueryBuilder {
    // Remove spaces after commas - PostgREST doesn't accept spaces in select
    this.selectFields = fields.replace(/,\s+/g, ',');
    if (options?.count) {
      this.countMode = options.count;
    }
    if (options?.head) {
      this.headOnly = true;
    }
    return this;
  }

  insert(data: any): PostgrestQueryBuilder {
    this.insertData = data;
    return this;
  }

  update(data: any): PostgrestQueryBuilder {
    this.updateData = data;
    return this;
  }

  delete(): PostgrestQueryBuilder {
    this.deleteFlag = true;
    return this;
  }

  eq(column: string, value: any): PostgrestQueryBuilder {
    this.params.append(column, `eq.${value}`);
    return this;
  }

  neq(column: string, value: any): PostgrestQueryBuilder {
    this.params.append(column, `neq.${value}`);
    return this;
  }

  gt(column: string, value: any): PostgrestQueryBuilder {
    this.params.append(column, `gt.${value}`);
    return this;
  }

  gte(column: string, value: any): PostgrestQueryBuilder {
    this.params.append(column, `gte.${value}`);
    return this;
  }

  lt(column: string, value: any): PostgrestQueryBuilder {
    this.params.append(column, `lt.${value}`);
    return this;
  }

  lte(column: string, value: any): PostgrestQueryBuilder {
    this.params.append(column, `lte.${value}`);
    return this;
  }

  in(column: string, values: any[]): PostgrestQueryBuilder {
    this.params.append(column, `in.(${values.join(',')})`);
    return this;
  }

  is(column: string, value: any): PostgrestQueryBuilder {
    this.params.append(column, `is.${value}`);
    return this;
  }

  like(column: string, pattern: string): PostgrestQueryBuilder {
    this.params.append(column, `like.${pattern}`);
    return this;
  }

  ilike(column: string, pattern: string): PostgrestQueryBuilder {
    this.params.append(column, `ilike.${pattern}`);
    return this;
  }

  // Support for OR conditions - PostgREST format
  or(filters: string): PostgrestQueryBuilder {
    this.params.append('or', `(${filters})`);
    return this;
  }

  // Support for AND conditions
  and(filters: string): PostgrestQueryBuilder {
    this.params.append('and', `(${filters})`);
    return this;
  }

  // Support for not conditions
  not(column: string, operator: string, value: any): PostgrestQueryBuilder {
    this.params.append(column, `not.${operator}.${value}`);
    return this;
  }

  // Support for contains (for arrays/jsonb)
  contains(column: string, value: any): PostgrestQueryBuilder {
    this.params.append(column, `cs.${JSON.stringify(value)}`);
    return this;
  }

  // Support for containedBy
  containedBy(column: string, value: any): PostgrestQueryBuilder {
    this.params.append(column, `cd.${JSON.stringify(value)}`);
    return this;
  }

  order(column: string, { ascending = true } = {}): PostgrestQueryBuilder {
    this.params.append('order', `${column}.${ascending ? 'asc' : 'desc'}`);
    return this;
  }

  limit(count: number): PostgrestQueryBuilder {
    this.params.append('limit', count.toString());
    return this;
  }

  offset(count: number): PostgrestQueryBuilder {
    this.params.append('offset', count.toString());
    return this;
  }

  range(from: number, to: number): PostgrestQueryBuilder {
    this.params.append('offset', from.toString());
    this.params.append('limit', (to - from + 1).toString());
    return this;
  }

  async maybeSingle(): Promise<SingleResult> {
    const result = await this.execute();
    return {
      data: Array.isArray(result.data) ? result.data[0] || null : result.data,
      error: result.error
    };
  }

  async single(): Promise<SingleResult> {
    const result = await this.execute();
    const data = Array.isArray(result.data) ? result.data[0] : result.data;
    return {
      data: data || null,
      error: result.error || (!data ? { message: 'No rows found' } : null)
    };
  }

  async execute(): Promise<QueryResult> {
    try {
      let url = `${POSTGREST_URL}/${this.table}`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      };

      // Add count header if needed
      if (this.countMode) {
        headers['Prefer'] = `count=${this.countMode}, return=representation`;
      }

      let options: RequestInit = { headers };

      // INSERT
      if (this.insertData) {
        options.method = 'POST';
        options.body = JSON.stringify(this.insertData);
        // Add select fields to URL if specified
        if (this.selectFields !== '*') {
          url += `?select=${encodeURIComponent(this.selectFields)}`;
        }
      }
      // UPDATE
      else if (this.updateData) {
        const paramsStr = this.params.toString();
        // Always include select in URL for UPDATE to get returned data
        url += `?select=${encodeURIComponent(this.selectFields)}${paramsStr ? '&' + paramsStr : ''}`;
        options.method = 'PATCH';
        options.body = JSON.stringify(this.updateData);
        console.log('[client.ts] UPDATE request:', url);
        console.log('[client.ts] UPDATE body:', options.body);
      }
      // DELETE
      else if (this.deleteFlag) {
        url += `?${this.params.toString()}`;
        options.method = 'DELETE';
      }
      // SELECT
      else {
        const paramsStr = this.params.toString();
        url += `?select=${encodeURIComponent(this.selectFields)}${paramsStr ? '&' + paramsStr : ''}`;
        options.method = this.headOnly ? 'HEAD' : 'GET';
      }

      const response = await fetch(url, options);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        return { data: null, error, count: 0 };
      }

      // Extract count from Content-Range header if available
      let count: number | undefined;
      const contentRange = response.headers.get('Content-Range');
      if (contentRange) {
        const match = contentRange.match(/\/(\d+|\*)/);
        if (match && match[1] !== '*') {
          count = parseInt(match[1], 10);
        }
      }

      // For HEAD requests, we don't have body
      if (this.headOnly) {
        return { data: null, error: null, count };
      }
      
      const data = await response.json().catch(() => []);
      return { data, error: null, count };
    } catch (error: any) {
      return { data: null, error: { message: error.message }, count: 0 };
    }
  }

  // Make the class thenable for async/await compatibility
  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

class PostgrestClient {
  from(table: string): PostgrestQueryBuilder {
    return new PostgrestQueryBuilder(table);
  }

  // Pour compatibilité avec les appels RPC Supabase
  async rpc(functionName: string, params?: any): Promise<{ data: any; error: any }> {
    try {
      const response = await fetch(`${POSTGREST_URL}/rpc/${functionName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params || {})
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        return { data: null, error };
      }
      
      const data = await response.json().catch(() => null);
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: { message: error.message } };
    }
  }

  // Stub for realtime channel (not supported by PostgREST, but needed for compatibility)
  channel(_name: string): RealtimeChannelStub {
    console.warn('Realtime channels are not supported with PostgREST. Using polling instead.');
    return new RealtimeChannelStub();
  }

  // Stub for removing channel
  removeChannel(_channel: RealtimeChannelStub): void {
    // No-op for PostgREST
  }
}

// Stub class for realtime channels (PostgREST doesn't support realtime)
class RealtimeChannelStub {
  on(_event: string, _filter: any, _callback: (payload: any) => void): this {
    return this;
  }
  
  subscribe(_callback?: (status: string) => void): this {
    // Call with 'SUBSCRIBED' to simulate successful subscription
    if (_callback) {
      setTimeout(() => _callback('SUBSCRIBED'), 0);
    }
    return this;
  }
  
  unsubscribe(): void {
    // No-op
  }
}

// Export avec le même nom pour compatibilité
export const supabase = new PostgrestClient();
