import { apiFetch } from '@/lib/api';
import { TreeEditor } from './tree-editor';
import type { TreeNode } from './types';

export default async function MenuPage() {
  let tree: TreeNode[] = [];
  let error: string | null = null;

  try {
    tree = await apiFetch('/offering-nodes/tree');
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <main className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Menu</h1>
      <p className="text-sm text-gray-500 mb-6">
        Build your services as a tree. Categories hold other items; items are what guests
        request. A single item with no children is a simple one-tap service.
      </p>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700 mb-6">
          {error}
        </div>
      )}

      <TreeEditor tree={tree} />
    </main>
  );
}
