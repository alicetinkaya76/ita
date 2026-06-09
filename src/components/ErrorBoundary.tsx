import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReload = () => {
    // Clear the reload guard and force a fresh load
    sessionStorage.removeItem('itta-chunk-reload');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isChunkError =
        this.state.error?.message?.includes('dynamically imported module') ||
        this.state.error?.message?.includes('Failed to fetch') ||
        this.state.error?.message?.includes('Loading chunk');

      return (
        <div className="error-boundary">
          <div className="error-boundary-card">
            <h2 className="error-boundary-title">
              {isChunkError ? 'Güncelleme Algılandı' : 'Beklenmeyen Hata'}
            </h2>
            <p className="error-boundary-text">
              {isChunkError
                ? 'Yeni bir sürüm yayınlandı. Sayfayı yenileyerek güncel sürümü yükleyebilirsiniz.'
                : 'Bir şeyler yanlış gitti. Lütfen sayfayı yenileyin veya ana sayfaya dönün.'}
            </p>
            <div className="error-boundary-actions">
              <button onClick={this.handleReload} className="error-boundary-btn primary">
                Sayfayı Yenile
              </button>
              <a href={import.meta.env.BASE_URL} className="error-boundary-btn secondary">
                Ana Sayfa
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
