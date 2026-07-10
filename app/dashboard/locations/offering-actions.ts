'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import type { OfferingAssignment } from './types';

type MutationResult = { success: true } | { success: false; error: string };

export async function getLocationOfferings(
  locationId: string,
): Promise<{ items: OfferingAssignment[]; error?: string }> {
  try {
    const items = (await apiFetch(
      `/locations/${locationId}/offerings`,
    )) as OfferingAssignment[];
    return { items };
  } catch (e) {
    return { items: [], error: (e as Error).message };
  }
}

export async function assignOffering(
  locationId: string,
  nodeId: string,
): Promise<MutationResult> {
  try {
    await apiFetch(`/locations/${locationId}/offerings/${nodeId}`, { method: 'POST' });
    revalidatePath('/dashboard/locations');
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function unassignOffering(
  locationId: string,
  nodeId: string,
): Promise<MutationResult> {
  try {
    await apiFetch(`/locations/${locationId}/offerings/${nodeId}`, { method: 'DELETE' });
    revalidatePath('/dashboard/locations');
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
