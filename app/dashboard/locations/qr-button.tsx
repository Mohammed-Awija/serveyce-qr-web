'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export function QrButton({
  orgSlug,
  locationId,
  locationName,
}: {
  orgSlug: string;
  locationId: string;
  locationName: string;
}) {
  const [open, setOpen] = useState(false);

  // Build the guest URL. Uses the current origin so it works in dev and prod.
  const guestUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/o/${orgSlug}/l/${locationId}`
      : `/o/${orgSlug}/l/${locationId}`;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-blue-600 hover:text-blue-800"
      >
        QR
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg">QR Code — {locationName}</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="flex flex-col items-center gap-4">
              <div className="bg-white p-4 rounded border" id="qr-print-area">
                <QRCodeSVG value={guestUrl} size={220} level="M" />
                <p className="text-center text-sm font-medium mt-2">{locationName}</p>
              </div>

              <p className="text-xs text-gray-500 break-all text-center">{guestUrl}</p>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => window.print()}
                  className="flex-1 bg-gray-900 text-white rounded px-4 py-2 text-sm font-medium"
                >
                  Print
                </button>
                <a
                  href={guestUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center border rounded px-4 py-2 text-sm font-medium hover:bg-gray-50"
                >
                  Preview
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
