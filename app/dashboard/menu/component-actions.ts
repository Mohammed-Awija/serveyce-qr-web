'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import type {
  ComponentConfig,
  ComponentSetBy,
  ServiceComponent,
  ServiceComponentType,
} from '@/lib/components';

export async function getComponents(
  itemId: string,
): Promise<{ components: ServiceComponent[]; error?: string }> {
  try {
    const components: ServiceComponent[] = await apiFetch(
      `/service-components?itemId=${itemId}`,
    );
    return { components };
  } catch (e) {
    return { error: (e as Error).message, components: [] };
  }
}

export async function addComponent(input: {
  offeringNodeId: string;
  type: ServiceComponentType;
  label: string;
  config: ComponentConfig;
  setBy: ComponentSetBy;
  required?: boolean;
  displayOrder?: number;
}) {
  if (!input.label?.trim()) return { error: 'Label is required' };
  try {
    await apiFetch('/service-components', {
      method: 'POST',
      body: JSON.stringify({ ...input, label: input.label.trim() }),
    });
    revalidatePath('/dashboard/menu');
    return { success: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function updateComponent(
  id: string,
  patch: {
    label?: string;
    config?: ComponentConfig;
    setBy?: ComponentSetBy;
    required?: boolean;
    displayOrder?: number;
  },
) {
  try {
    await apiFetch(`/service-components/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    revalidatePath('/dashboard/menu');
    return { success: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function removeComponent(id: string) {
  try {
    await apiFetch(`/service-components/${id}`, { method: 'DELETE' });
    revalidatePath('/dashboard/menu');
    return { success: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/**
 * Swap a component with its neighbour by displayOrder. The API has no reorder
 * endpoint, so this is two PATCHes; positions are re-derived from the current
 * list order rather than trusted from the client.
 */
export async function moveComponent(
  itemId: string,
  id: string,
  direction: 'up' | 'down',
) {
  try {
    const components: ServiceComponent[] = await apiFetch(
      `/service-components?itemId=${itemId}`,
    );
    const index = components.findIndex((c) => c.id === id);
    if (index === -1) return { error: 'Component not found' };

    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= components.length) return { success: true };

    // Existing rows can share a displayOrder (they all default to 0), so
    // renumber from the swapped order instead of trading the two values.
    const reordered = [...components];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

    await Promise.all(
      reordered.map((c, i) =>
        c.displayOrder === i
          ? null
          : apiFetch(`/service-components/${c.id}`, {
              method: 'PATCH',
              body: JSON.stringify({ displayOrder: i }),
            }),
      ),
    );

    revalidatePath('/dashboard/menu');
    return { success: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
