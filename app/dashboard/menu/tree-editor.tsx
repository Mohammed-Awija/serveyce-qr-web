'use client';

import { useState, useTransition } from 'react';
import { createNode, deleteNode } from './actions';
import { ComponentEditor } from './component-editor';
import type { TreeNode } from './types';

export function TreeEditor({ tree }: { tree: TreeNode[] }) {
  return (
    <div className="space-y-4">
      <AddNodeForm parentId={undefined} label="Add top-level category or item" />
      <div className="space-y-1">
        {tree.length === 0 && (
          <p className="text-sm text-gray-400">Nothing yet. Add your first item above.</p>
        )}
        {tree.map((node) => (
          <NodeRow key={node.id} node={node} depth={0} />
        ))}
      </div>
    </div>
  );
}

function NodeRow({ node, depth }: { node: TreeNode; depth: number }) {
  const [expanded, setExpanded] = useState(true);
  const [addingChild, setAddingChild] = useState(false);
  const [configuring, setConfiguring] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isCategory = node.type === 'CATEGORY';

  function remove() {
    // The API cascade-deletes children, so a category takes its whole subtree with it.
    const descendants = countDescendants(node);
    const warning = descendants
      ? `Delete "${node.name}" and the ${descendants} item${descendants === 1 ? '' : 's'} inside it?`
      : `Delete "${node.name}"?`;
    if (!confirm(warning)) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteNode(node.id);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div>
      <div
        className="flex items-center justify-between rounded border bg-white p-3"
        style={{ marginLeft: depth * 20 }}
      >
        <div className="flex items-center gap-2">
          {isCategory && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="text-gray-400 w-4"
            >
              {expanded ? '▼' : '▶'}
            </button>
          )}
          {!isCategory && <span className="w-4" />}
          <span className="font-medium">{node.name}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              isCategory ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
            }`}
          >
            {isCategory ? 'category' : 'item'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {isCategory && (
            <button
              onClick={() => setAddingChild((a) => !a)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              + Add inside
            </button>
          )}
          {!isCategory && (
            <button
              onClick={() => setConfiguring((c) => !c)}
              className="text-sm text-purple-600 hover:text-purple-800"
            >
              {configuring ? 'Close' : 'Configure'}
            </button>
          )}
          <button
            onClick={remove}
            disabled={isPending}
            className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 mt-1" style={{ marginLeft: depth * 20 }}>
          {error}
        </p>
      )}

      {addingChild && (
        <div style={{ marginLeft: (depth + 1) * 20 }} className="mt-1">
          <AddNodeForm
            parentId={node.id}
            label={`Add inside "${node.name}"`}
            onDone={() => setAddingChild(false)}
          />
        </div>
      )}

      {configuring && !isCategory && (
        <div style={{ marginLeft: (depth + 1) * 20 }} className="mt-1">
          <ComponentEditor itemId={node.id} />
        </div>
      )}

      {isCategory && expanded && node.children.length > 0 && (
        <div className="mt-1 space-y-1">
          {node.children.map((child) => (
            <NodeRow key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function countDescendants(node: TreeNode): number {
  return node.children.reduce((sum, c) => sum + 1 + countDescendants(c), 0);
}

function AddNodeForm({
  parentId,
  label,
  onDone,
}: {
  parentId?: string;
  label: string;
  onDone?: () => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'CATEGORY' | 'ITEM'>('ITEM');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createNode({ name, type, parentId });
      if (result?.error) {
        setError(result.error);
      } else {
        setName('');
        setType('ITEM');
        onDone?.();
      }
    });
  }

  return (
    <div className="rounded border bg-gray-50 p-3 space-y-2">
      <p className="text-xs text-gray-500">{label}</p>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="flex-1 rounded border px-3 py-2 text-sm"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as 'CATEGORY' | 'ITEM')}
          className="rounded border px-3 py-2 text-sm"
        >
          <option value="ITEM">Item</option>
          <option value="CATEGORY">Category</option>
        </select>
        <button
          onClick={submit}
          disabled={isPending || !name.trim()}
          className="bg-gray-900 text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Add
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
