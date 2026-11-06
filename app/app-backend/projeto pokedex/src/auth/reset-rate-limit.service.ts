import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

@Injectable()
export class ResetRateLimitService {
  private readonly buckets = new Map<
    string,
    { count: number; expires: number }
  >();

  consume(scope: string, value: string, limit: number, windowMs: number): void {
    const now = Date.now();
    for (const [key, bucket] of this.buckets) {
      if (bucket.expires <= now) this.buckets.delete(key);
    }
    const key = scope + createHash('sha256').update(value).digest('hex');
    const bucket = this.buckets.get(key);
    if (
      (bucket && bucket.count >= limit) ||
      (!bucket && this.buckets.size >= 10000)
    ) {
      throw new HttpException(
        'Muitas tentativas. Aguarde antes de tentar novamente.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    this.buckets.set(key, {
      count: (bucket?.count ?? 0) + 1,
      expires: bucket?.expires ?? now + windowMs,
    });
  }
}
