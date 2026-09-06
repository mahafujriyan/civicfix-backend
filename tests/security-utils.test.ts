import { describe, expect, it } from 'vitest';
import { hashPassword, comparePassword } from '../src/utils/password';
import { omitPassword } from '../src/utils/user.serializer';

describe('password utils', () => {
  it('hashes and verifies passwords', async () => {
    const hash = await hashPassword('Citizen@12345');
    expect(hash).not.toEqual('Citizen@12345');
    await expect(comparePassword('Citizen@12345', hash)).resolves.toBe(true);
    await expect(comparePassword('wrong-password', hash)).resolves.toBe(false);
  });
});

describe('user serializer', () => {
  it('removes passwordHash from user objects', () => {
    const safe = omitPassword({
      id: '1',
      email: 'a@b.com',
      passwordHash: 'secret',
      fullName: 'A',
    });
    expect(safe).toEqual({ id: '1', email: 'a@b.com', fullName: 'A' });
    expect('passwordHash' in safe).toBe(false);
  });
});
