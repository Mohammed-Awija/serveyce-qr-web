'use server';

import { apiFetch } from '@/lib/api';

export async function getGroups(itemId: string) {
  try {
    const groups = await apiFetch(`/modifiers/groups?itemId=${itemId}`);
    return { groups };
  } catch (e) {
    return { error: (e as Error).message, groups: [] };
  }
}

export async function addGroup(input: {
  offeringNodeId: string;
  name: string;
  selectionType: 'SINGLE' | 'MULTIPLE';
  required: boolean;
}) {
  if (!input.name?.trim()) return { error: 'Name is required' };
  try {
    await apiFetch('/modifiers/groups', {
      method: 'POST',
      body: JSON.stringify({ ...input, name: input.name.trim() }),
    });
    return { success: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function addOption(input: { modifierGroupId: string; name: string }) {
  if (!input.name?.trim()) return { error: 'Name is required' };
  try {
    await apiFetch('/modifiers/options', {
      method: 'POST',
      body: JSON.stringify({ ...input, name: input.name.trim() }),
    });
    return { success: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function removeGroup(id: string) {
  try {
    await apiFetch(`/modifiers/groups/${id}`, { method: 'DELETE' });
    return { success: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function removeOption(id: string) {
  try {
    await apiFetch(`/modifiers/options/${id}`, { method: 'DELETE' });
    return { success: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
