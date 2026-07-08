import { RequestsBoard } from './requests-board';

export default function RequestsPage() {
  return (
    <main className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Requests</h1>
      <p className="text-sm text-gray-500 mb-6">
        Live guest requests. Updates every few seconds.
      </p>
      <RequestsBoard />
    </main>
  );
}
