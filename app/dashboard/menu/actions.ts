'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';

export async function createNode(input: {
  name: string;
  type: 'CATEGORY' | 'ITEM';
  parentId?: string;
}) {
  if (!input.name?.trim()) return { error: 'Name is required' };
  try {
    await apiFetch('/offering-nodes', {
      method: 'POST',
      body: JSON.stringify({
        name: input.name.trim(),
        type: input.type,
        parentId: input.parentId,
      }),
    });
    revalidatePath('/dashboard/menu');
    return { success: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function deleteNode(id: string) {
  try {
    await apiFetch(`/offering-nodes/${id}`, { method: 'DELETE' });
    revalidatePath('/dashboard/menu');
    return { success: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
