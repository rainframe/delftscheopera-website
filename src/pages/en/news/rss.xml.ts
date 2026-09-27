import type { APIContext } from 'astro';
import { newsFeed } from '@/lib/rss';

export const GET = (context: APIContext) => newsFeed('en', context);
