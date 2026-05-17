import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Download, QrCode, X } from 'lucide-react';

type QrShareButtonProps = {
  url: string;
  buttonLabel?: string;
  buttonTitle?: string;
  className?: string;
  iconOnly?: boolean;
};

export default function QrShareButton({
  url,
  buttonLabel = 'QR',
  buttonTitle = 'Generate QR code',
  className = '',
  iconOnly = false,
}: QrShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    QRCode.toDataURL(url, {
      width: 400,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setError('Could not generate QR code.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, url]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard');
    } catch {
      alert('Could not copy link');
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = 'share-link-qr.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={buttonTitle}
        className={className}
      >
        <QrCode className="h-4 w-4" />
        {!iconOnly && <span>{buttonLabel}</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Share this link</h3>
                <p className="mt-1 text-sm text-slate-500 break-all">{url}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setQrDataUrl(null);
                  setError(null);
                }}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close QR dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              {loading && <p className="text-sm text-slate-500">Generating QR code…</p>}
              {!loading && error && <p className="text-sm text-red-600">{error}</p>}
              {!loading && !error && qrDataUrl && (
                <img src={qrDataUrl} alt="QR code for share link" className="h-56 w-56 rounded-lg bg-white p-2 shadow-sm" />
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Copy className="h-4 w-4" />
                Copy link
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={!qrDataUrl}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}