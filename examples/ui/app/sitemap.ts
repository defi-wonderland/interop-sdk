import type { MetadataRoute } from 'next';
import { APPS } from './config/features';

const BASE_URL = 'https://interop.wonderland.xyz';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: BASE_URL,
      changeFrequency: 'weekly',
      priority: 1,
    },
    ...APPS.map((app) => ({
      url: `${BASE_URL}${app.href}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
