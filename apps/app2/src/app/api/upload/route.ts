import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { requireAuth } from '@/lib/auth';
import { apiErrorResponse } from '@/lib/api-error';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['.txt', '.png', '.jpg', '.jpeg', '.gif', '.webp']);
const UPLOAD_ROOT = path.join(os.tmpdir(), 'chatbot-gate-uploads');

function safeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'upload';
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(['admin', 'noc']);

    const formData = await request.formData();
    const file = formData.get('file');
    const caseId = safeSegment(String(formData.get('caseId') || 'case'));

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    const extension = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 });
    }

    const uploadDir = path.join(UPLOAD_ROOT, caseId);
    const safeName = safeSegment(file.name);
    const filePath = path.join(uploadDir, `${Date.now()}-${safeName}`);
    const buffer = Buffer.from(await file.arrayBuffer());

    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(filePath, buffer);

    const textContent = extension === '.txt' ? buffer.toString('utf8').slice(0, 12000) : '';

    return NextResponse.json({
      name: file.name,
      path: filePath,
      size: file.size,
      content: textContent,
    });
  } catch (error) {
    return apiErrorResponse(error, '[Upload API]');
  }
}
