'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';

export async function createLocation(formData: FormData) {
  const name = formData.get('name') as string;
  const kind = (formData.get('kind') as string) || 'ROOM';
  const notes = (formData.get('notes') as string) || undefined;

  if (!name || name.trim().length === 0) {
    return { error: 'Name is required' };
  }

  try {
    await apiFetch('/locations', {
      method: 'POST',
      body: JSON.stringify({ name: name.trim(), kind, notes }),
    });
    revalidatePath('/dashboard/locations');
    return { success: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function deleteLocation(id: string) {
  try {
    await apiFetch(`/locations/${id}`, { method: 'DELETE' });
    revalidatePath('/dashboard/locations');
    return { success: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
