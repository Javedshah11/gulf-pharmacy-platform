import { notFound } from 'next/navigation';
import { hasLocale } from './dictionaries';
export function requireLocale(value: string) {
  if (!hasLocale(value)) notFound();
  return value;
}
