'use client';
import { useEffect, useRef } from 'react';
import { useText } from './provider';
export function LoadingState() {
  const t = useText();
  return (
    <p className="admin-notice" role="status">
      {t('Loading your workspace…', 'جارٍ تحميل مساحة العمل…')}
    </p>
  );
}
export function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  const t = useText();
  return (
    <div className="admin-error" role="alert">
      <p>{message}</p>
      {retry && (
        <button className="admin-button secondary" onClick={retry}>
          {t('Try again', 'إعادة المحاولة')}
        </button>
      )}
    </div>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function PageTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="admin-page-title">
      <p className="admin-eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}
export function ConfirmDialog({
  title,
  description,
  busy,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const t = useText();
  useEffect(() => {
    const element = ref.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="admin-dialog"
      onCancel={(event) => {
        if (busy) event.preventDefault();
        else onCancel();
      }}
      aria-labelledby="confirmation-title"
    >
      <h2 id="confirmation-title">{title}</h2>
      <p>{description}</p>
      <div className="admin-actions">
        <button
          className="admin-button secondary"
          disabled={busy}
          onClick={onCancel}
        >
          {t('Cancel', 'إلغاء')}
        </button>
        <button className="admin-button" disabled={busy} onClick={onConfirm}>
          {busy ? t('Saving…', 'جارٍ الحفظ…') : t('Confirm', 'تأكيد')}
        </button>
      </div>
    </dialog>
  );
}
export function messageOf(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Unable to complete the request.';
}
