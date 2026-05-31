import OpengraphImage from './opengraph-image';

export const runtime = 'edge';
export const alt = 'BoVerse · Describe it. We build it.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function TwitterImage() {
  return OpengraphImage();
}
