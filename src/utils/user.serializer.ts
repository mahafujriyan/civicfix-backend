import { User } from '@prisma/client';

type WithPassword = { passwordHash?: string | null };

export function omitPassword<T extends WithPassword>(user: T): Omit<T, 'passwordHash'> {
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

export type PublicUser = Omit<User, 'passwordHash'>;
