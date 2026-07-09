'use client';

import { useEffect, useState, useTransition } from 'react';
import { getGroups, addGroup, addOption, removeGroup, removeOption } from './modifier-actions';

type Option = { id: string; name: string };
type Group = {
  id: string;
  name: string;
  selectionType: 'SINGLE' | 'MULTIPLE';
  required: boolean;
  options: Option[];
};

export function ModifierPanel({ itemId }: { itemId: string }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function load() {
    const res = await getGroups(itemId);
    setLoadError(res.error ?? null);
    setGroups(res.groups ?? []);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await getGroups(itemId);
      if (cancelled) return;
      setLoadError(res.error ?? null);
      setGroups(res.groups ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [itemId]);

  // New group form state
  const [groupName, setGroupName] = useState('');
  const [groupType, setGroupType] = useState<'SINGLE' | 'MULTIPLE'>('SINGLE');
  const [groupRequired, setGroupRequired] = useState(false);

  function submitGroup() {
    setFormError(null);
    startTransition(async () => {
      const result = await addGroup({
        offeringNodeId: itemId,
        name: groupName,
        selectionType: groupType,
        required: groupRequired,
      });
      if (result?.error) {
        setFormError(result.error);
        return;
      }
      setGroupName('');
      setGroupType('SINGLE');
      setGroupRequired(false);
      await load();
    });
  }

  if (loading) return <p className="text-xs text-gray-400 p-3">Loading options…</p>;

  return (
    <div className="rounded border bg-gray-50 p-3 space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase">Options</p>

      {loadError && (
        <p className="text-xs text-red-600">Could not load options: {loadError}</p>
      )}

      {!loadError && groups.length === 0 && (
        <p className="text-xs text-gray-400">No option groups yet.</p>
      )}

      {groups.map((g) => (
        <GroupBlock key={g.id} group={g} onChange={load} />
      ))}

      {/* Add a new group */}
      <div className="border-t pt-3 space-y-2">
        <div className="flex gap-2">
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Option group (e.g. Size, Toppings)"
            className="flex-1 rounded border px-2 py-1.5 text-sm"
          />
          <select
            value={groupType}
            onChange={(e) => setGroupType(e.target.value as 'SINGLE' | 'MULTIPLE')}
            className="rounded border px-2 py-1.5 text-sm"
          >
            <option value="SINGLE">Pick one</option>
            <option value="MULTIPLE">Pick many</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={groupRequired}
            onChange={(e) => setGroupRequired(e.target.checked)}
          />
          Required
        </label>
        <button
          onClick={submitGroup}
          disabled={!groupName.trim()}
          className="bg-gray-900 text-white rounded px-3 py-1.5 text-sm font-medium disabled:opacity-50"
        >
          Add option group
        </button>
        {formError && <p className="text-xs text-red-600">{formError}</p>}
      </div>
    </div>
  );
}

function GroupBlock({ group, onChange }: { group: Group; onChange: () => void }) {
  const [optionName, setOptionName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function run(action: () => Promise<{ error?: string } | undefined>, onSuccess?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result?.error) {
        setError(result.error);
        return;
      }
      onSuccess?.();
      onChange();
    });
  }

  return (
    <div className="rounded bg-white border p-2 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-medium">{group.name}</span>
          <span className="text-xs text-gray-400 ml-2">
            {group.selectionType === 'SINGLE' ? 'pick one' : 'pick many'}
            {group.required ? ' · required' : ''}
          </span>
        </div>
        <button
          onClick={() => {
            // Deleting a group cascade-deletes its options on the API side.
            if (!confirm(`Delete the "${group.name}" option group?`)) return;
            run(() => removeGroup(group.id));
          }}
          className="text-xs text-red-600"
        >
          Delete
        </button>
      </div>

      <div className="flex flex-wrap gap-1">
        {group.options.map((o) => (
          <span
            key={o.id}
            className="inline-flex items-center gap-1 bg-gray-100 rounded-full px-2 py-0.5 text-xs"
          >
            {o.name}
            <button
              onClick={() => run(() => removeOption(o.id))}
              className="text-gray-400 hover:text-red-600"
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={optionName}
          onChange={(e) => setOptionName(e.target.value)}
          placeholder="Add option (e.g. Large)"
          className="flex-1 rounded border px-2 py-1 text-xs"
        />
        <button
          onClick={() =>
            run(
              () => addOption({ modifierGroupId: group.id, name: optionName }),
              () => setOptionName(''),
            )
          }
          disabled={!optionName.trim()}
          className="bg-gray-700 text-white rounded px-2 py-1 text-xs disabled:opacity-50"
        >
          Add
        </button>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
