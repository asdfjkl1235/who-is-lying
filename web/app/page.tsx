import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-8 text-center">
        <div>
          <h1 className="text-5xl font-extrabold tracking-tight text-white">
            WHO IS <span className="text-accent-400">LYING?</span>
          </h1>
          <p className="mt-4 text-lg text-white/50">
            One word. One imposter. Can your friends find them?
          </p>
        </div>

        <div className="flex w-full flex-col gap-3">
          <Link href="/create" className="btn-primary w-full text-lg">
            Create Game
          </Link>
          <Link href="/join" className="btn-secondary w-full text-lg">
            Join Game
          </Link>
        </div>

        <p className="text-sm text-white/30">
          No downloads. Play directly in your browser.
          <br />
          Perfect for Discord.
        </p>
      </div>
    </main>
  );
}
