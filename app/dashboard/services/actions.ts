'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';

export async function createOffering(formData: FormData) {
  const name = formData.get('name') as string;
  const icon = (formData.get('icon') as string) || 'bell';

  if (!name || name.trim().length === 0) {
    return { error: 'Name is required' };
  }

  try {
    await apiFetch('/offering-types', {
      method: 'POST',
      body: JSON.stringify({ name: name.trim(), icon }),
    });
    revalidatePath('/dashboard/services');
    return { success: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function toggleOffering(id: string, enabled: boolean) {
  try {
    await apiFetch(`/offering-types/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    });
    revalidatePath('/dashboard/services');
    return { success: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function deleteOffering(id: string) {
  try {
    await apiFetch(`/offering-types/${id}`, { method: 'DELETE' });
    revalidatePath('/dashboard/services');
    return { success: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
