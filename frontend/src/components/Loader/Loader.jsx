import './Loader.css';

export default function Loader({ fullPage = false, text = '' }) {
  const content = (
    <div className="loader-wrapper" role="status" aria-label={text || 'Loading'}>
      <div className="loader-spinner">
        <div className="spinner-ring" />
        <div className="spinner-ring spinner-ring-inner" />
      </div>
      {text && <p className="loader-text">{text}</p>}
    </div>
  );

  if (fullPage) {
    return <div className="loader-fullpage">{content}</div>;
  }

  return content;
}
