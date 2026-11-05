'use client';
export default function ErrorBoundary({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <section className="panel state" role="alert"><h1>Не удалось открыть раздел</h1><p>Попробуйте ещё раз. / Please try again.</p><button className="button" onClick={reset}>Повторить / Retry</button></section>; }

