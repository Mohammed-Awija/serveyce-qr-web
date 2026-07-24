'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import {
  addComponent,
  getComponents,
  moveComponent,
  removeComponent,
  updateComponent,
} from './component-actions';
import { ADMIN_REGISTRY } from './component-registry';
import {
  BUILT_TYPES,
  type ComponentConfig,
  type ComponentSetBy,
  type ServiceComponent,
  type ServiceComponentType,
} from '@/lib/components';

export function ComponentEditor({ itemId }: { itemId: string }) {
  const [components, setComponents] = useState<ServiceComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(async () => {
    const res = await getComponents(itemId);
    setLoadError(res.error ?? null);
    setComponents(res.components);
    setLoading(false);
  }, [itemId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await getComponents(itemId);
      if (cancelled) return;
      setLoadError(res.error ?? null);
      setComponents(res.components);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [itemId]);

  // New component form
  const [newType, setNewType] = useState<ServiceComponentType>('SINGLE_SELECT');
  const [newLabel, setNewLabel] = useState('');

  function submitNew() {
    const def = ADMIN_REGISTRY[newType];
    if (!def) return;
    setFormError(null);
    startTransition(async () => {
      const result = await addComponent({
        offeringNodeId: itemId,
        type: newType,
        label: newLabel,
        config: def.defaultConfig,
        setBy: def.setBy,
        required: false,
        displayOrder: components.length,
      });
      if (result?.error) {
        setFormError(result.error);
        return;
      }
      setNewLabel('');
      setNewType('SINGLE_SELECT');
      await load();
    });
  }

  function run(action: () => Promise<{ error?: string } | undefined>) {
    setFormError(null);
    startTransition(async () => {
      const result = await action();
      if (result?.error) {
        setFormError(result.error);
        return;
      }
      await load();
    });
  }

  if (loading) {
    return <p className="text-xs text-gray-400 p-3">Loading components…</p>;
  }

  return (
    <div className="rounded border bg-gray-50 p-3 space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase">Components</p>

      {loadError && (
        <p className="text-xs text-red-600">Could not load components: {loadError}</p>
      )}

      {!loadError && components.length === 0 && (
        <p className="text-xs text-gray-400">No components yet.</p>
      )}

      {components.map((component, i) => (
        <ComponentRow
          key={component.id}
          component={component}
          busy={isPending}
          isFirst={i === 0}
          isLast={i === components.length - 1}
          onConfigChange={(config: ComponentConfig) =>
            run(() => updateComponent(component.id, { config }))
          }
          onRequiredChange={(required: boolean) =>
            run(() => updateComponent(component.id, { required }))
          }
          onSetByChange={(setBy: ComponentSetBy) =>
            // Admin-set components can't be "required" — the guest can't fill them.
            run(() =>
              updateComponent(component.id, {
                setBy,
                ...(setBy === 'ADMIN' ? { required: false } : {}),
              }),
            )
          }
          onMove={(direction: 'up' | 'down') =>
            run(() => moveComponent(itemId, component.id, direction))
          }
          onDelete={() => {
            if (!confirm(`Delete the "${component.label}" component?`)) return;
            run(() => removeComponent(component.id));
          }}
        />
      ))}

      {/* Add a component */}
      <div className="border-t pt-3 space-y-2">
        <div className="flex gap-2">
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Label (e.g. Size, Toppings, Photos)"
            className="flex-1 rounded border px-2 py-1.5 text-sm"
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as ServiceComponentType)}
            className="rounded border px-2 py-1.5 text-sm"
          >
            {BUILT_TYPES.map((type) => (
              <option key={type} value={type}>
                {ADMIN_REGISTRY[type]?.name ?? type}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={submitNew}
          disabled={isPending || !newLabel.trim()}
          className="bg-gray-900 text-white rounded px-3 py-1.5 text-sm font-medium disabled:opacity-50"
        >
          Add component
        </button>
        {formError && <p className="text-xs text-red-600">{formError}</p>}
      </div>
    </div>
  );
}

function ComponentRow({
  component,
  busy,
  isFirst,
  isLast,
  onConfigChange,
  onRequiredChange,
  onSetByChange,
  onMove,
  onDelete,
}: {
  component: ServiceComponent;
  busy: boolean;
  isFirst: boolean;
  isLast: boolean;
  onConfigChange: (config: ComponentConfig) => void;
  onRequiredChange: (required: boolean) => void;
  onSetByChange: (setBy: ComponentSetBy) => void;
  onMove: (direction: 'up' | 'down') => void;
  onDelete: () => void;
}) {
  const def = ADMIN_REGISTRY[component.type];
  const adminSet = component.setBy === 'ADMIN';

  return (
    <div className="rounded bg-white border p-2 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{component.label}</span>
          <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
            {def?.name ?? component.type}
          </span>
          {component.required && (
            <span className="text-xs text-[#B08D57]">required</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onMove('up')}
            disabled={busy || isFirst}
            className="text-xs text-gray-400 hover:text-gray-700 disabled:opacity-30"
            aria-label="Move up"
          >
            ↑
          </button>
          <button
            onClick={() => onMove('down')}
            disabled={busy || isLast}
            className="text-xs text-gray-400 hover:text-gray-700 disabled:opacity-30"
            aria-label="Move down"
          >
            ↓
          </button>
          <button
            onClick={onDelete}
            disabled={busy}
            className="text-xs text-red-600 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>

      {def ? (
        <>
          {def.supportsSetBy && (
            <label className="flex items-center gap-2 text-xs text-gray-600">
              Filled in by
              <select
                value={component.setBy}
                disabled={busy}
                onChange={(e) => onSetByChange(e.target.value as ComponentSetBy)}
                className="rounded border px-2 py-1 text-xs"
              >
                <option value="GUEST">the guest</option>
                <option value="ADMIN">you (fixed value)</option>
              </select>
            </label>
          )}
          <def.ConfigEditor
            component={component}
            onChange={onConfigChange}
            busy={busy}
          />
          {/* Required is meaningless for admin-set values — the guest can't fill them. */}
          {def.supportsRequired && !adminSet && (
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={component.required}
                disabled={busy}
                onChange={(e) => onRequiredChange(e.target.checked)}
              />
              Required
            </label>
          )}
        </>
      ) : (
        // A type that exists on the API but isn't wired into the editor yet.
        <p className="text-xs text-gray-400">
          This component type isn&apos;t editable here yet.
        </p>
      )}
    </div>
  );
}
