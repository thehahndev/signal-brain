export default function Home() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: 640 }}>
      <h1>Signal Brain</h1>
      <p>
        A ruthless attention-filter for AI-dev content. This deployment is API-only: capture and
        feedback run through the Telegram webhook, and the daily digest runs on a Vercel Cron.
      </p>
      <ul>
        <li>
          <code>POST /api/telegram</code> — bot webhook (capture + button callbacks)
        </li>
        <li>
          <code>GET /api/cron/digest</code> — daily ranking pipeline
        </li>
      </ul>
    </main>
  );
}
