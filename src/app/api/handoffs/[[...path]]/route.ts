import { NextResponse, type NextRequest } from 'next/server';

import type { HandoffTask } from '@/lib/types';
import { rfqMockStore } from '@/lib/api-mock/rfq/store';

type RouteContext = { params: Promise<{ path?: string[] }> };

async function getPath(context: RouteContext): Promise<string[]> {
  const { path = [] } = await context.params;
  return path;
}

export async function GET(_req: NextRequest, _context: RouteContext) {
  return NextResponse.json(Object.values(rfqMockStore.handoffs));
}

export async function POST(req: NextRequest, _context: RouteContext) {
  const task = (await req.json()) as HandoffTask;
  const taskId = task.taskId || `task-${Math.random().toString(36).slice(2, 11)}`;
  rfqMockStore.handoffs[taskId] = { ...task, taskId };
  return NextResponse.json(rfqMockStore.handoffs[taskId], { status: 201 });
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const path = await getPath(context);
  const taskId = path[0];
  if (!taskId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  delete rfqMockStore.handoffs[taskId];
  return new NextResponse(null, { status: 204 });
}