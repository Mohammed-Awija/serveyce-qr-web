export type TreeNode = {
  id: string;
  name: string;
  type: 'CATEGORY' | 'ITEM';
  enabled: boolean;
  children: TreeNode[];
};
