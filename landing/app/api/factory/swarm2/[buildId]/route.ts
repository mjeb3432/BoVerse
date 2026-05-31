// Swarm 2 · bundle fetch + download. GET returns the manifest + files; or a
// downloadable artifact: ?download=zip | md | json.

import { NextResponse } from 'next/server';
import { getBuild } from '@/lib/swarm2/store';
import { zipStore } from '@/lib/swarm2/zip';
import { slug } from '@/lib/swarm2/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, ctx: { params: Promise<{ buildId: string }> }) {
  const { buildId } = await ctx.params;
  const build = await getBuild(buildId);
  if (!build) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const download = new URL(req.url).searchParams.get('download');
  const base = slug(build.manifest.workflow_name, 'workflow');

  if (download === 'zip') {
    const zip = zipStore(build.files.map((f) => ({ path: f.path, content: f.content })));
    return new NextResponse(new Uint8Array(zip), {
      headers: {
        'content-type': 'application/zip',
        'content-disposition': `attachment; filename="${base}-bundle.zip"`,
      },
    });
  }
  if (download === 'md') {
    const spec = build.files.find((f) => f.path === 'spec.md');
    return new NextResponse(spec?.content ?? '# (no spec)', {
      headers: { 'content-type': 'text/markdown; charset=utf-8', 'content-disposition': `attachment; filename="${base}-spec.md"` },
    });
  }
  if (download === 'json') {
    return new NextResponse(JSON.stringify(build.manifest, null, 2), {
      headers: { 'content-type': 'application/json', 'content-disposition': `attachment; filename="${base}-manifest.json"` },
    });
  }

  return NextResponse.json({ manifest: build.manifest, files: build.files });
}
