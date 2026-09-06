import { describe, expect, it } from 'vitest';
import { signAccessToken, verifyAccessToken } from '../src/utils/jwt';
import { Role } from '@prisma/client';

describe('jwt utils', () => {
  it('signs and verifies access tokens', () => {
    const token = signAccessToken({
      sub: '11111111-1111-4111-8111-111111111111',
      email: 'admin@civicfix.local',
      role: Role.ADMIN,
    });

    const payload = verifyAccessToken(token);
    expect(payload.email).toBe('admin@civicfix.local');
    expect(payload.role).toBe(Role.ADMIN);
  });

  it('rejects invalid tokens', () => {
    expect(() => verifyAccessToken('not.a.real.token')).toThrow();
  });
});
