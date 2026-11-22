import 'dotenv/config';
export function databaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!value || !/^postgres(ql)?:\/\//.test(value))
    throw new Error(
      'A valid DATABASE_URL is required in packages/database/.env',
    );
  return value;
}
