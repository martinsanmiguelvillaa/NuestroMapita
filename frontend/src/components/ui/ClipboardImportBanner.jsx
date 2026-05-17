import { useNavigate } from 'react-router-dom';
import { useClipboardImport } from '../../hooks/useClipboardImport';

export default function ClipboardImportBanner() {
  const { clipboardUrl, dismiss, accept } = useClipboardImport();
  const navigate = useNavigate();

  if (!clipboardUrl) return null;

  const handleImport = () => {
    const url = accept();
    navigate(`/share-target?url=${encodeURIComponent(url)}`);
  };

  const short = clipboardUrl.length > 50
    ? clipboardUrl.slice(0, 50) + '…'
    : clipboardUrl;

  return (
    <div className="clipboard-banner">
      <div className="clipboard-banner__content">
        <span className="clipboard-banner__icon">📋</span>
        <div className="clipboard-banner__text">
          <strong>¿Querés guardar este link?</strong>
          <span className="clipboard-banner__url">{short}</span>
        </div>
      </div>
      <div className="clipboard-banner__actions">
        <button className="btn btn-primary btn-sm" onClick={handleImport}>
          Guardar
        </button>
        <button className="btn btn-ghost btn-sm" onClick={dismiss}>
          No
        </button>
      </div>
    </div>
  );
}
