import Link from "next/link";
import { FragmentsLogo } from "@/components/brand/fragments-logo";
import { GameLogo } from "@/components/brand/game-logo";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { cn } from "@/lib/utils/cn";

export default function HubHomePage() {
  return (
    <div className="relative mx-auto flex w-full max-w-4xl flex-col gap-14 overflow-hidden px-4 pb-24 pt-4 sm:gap-16 sm:px-6 sm:pt-10">
      <div
        className={cn(
          "pointer-events-none absolute inset-0 -z-10 rounded-[2rem]",
          "bg-[radial-gradient(circle_at_50%_12%,rgba(59,130,246,0.2),transparent_46%),linear-gradient(160deg,#0B0D12_0%,#121826_58%,#0B0D12_100%)]",
        )}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-56 w-[min(34rem,95vw)] -translate-x-1/2 rounded-full bg-[#60A5FA]/12 blur-3xl"
        aria-hidden
      />
      <header className="relative flex flex-col gap-3 text-center sm:text-left">
        <h1 className="font-codex text-2xl font-semibold tracking-[0.08em] text-[var(--gold-bright)] sm:text-3xl">
          Choose your path
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-[#B6C6EA] sm:text-base">
          A collection of Flesh and Blood-inspired experiences for memory, mastery, and discovery.
        </p>
      </header>

      <section aria-labelledby="experiences-heading" className="flex flex-col gap-5">
        <div className="flex items-end justify-between gap-4">
          <h2 id="experiences-heading" className="font-codex text-sm font-semibold uppercase tracking-[0.22em] text-[#60A5FA]">
            Choose your path
          </h2>
          <p className="hidden text-xs text-[#93A7D4] sm:block">Choose an experience to enter.</p>
        </div>

        <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(20rem,1fr))]">
          <Panel
            variant="textured"
            className={cn(
              "relative overflow-hidden border border-[var(--gold)]/28 p-6 backdrop-blur-sm sm:p-8",
              "shadow-[0_0_30px_rgba(201,162,39,0.10),inset_0_1px_0_rgba(250,204,21,0.08)]",
              "transition-[transform,box-shadow,border-color] duration-300",
              "hover:-translate-y-0.5 hover:border-[var(--gold)]/38 hover:shadow-[0_0_40px_rgba(201,162,39,0.16),0_0_28px_rgba(59,130,246,0.12),inset_0_1px_0_rgba(250,204,21,0.1)]",
            )}
            style={{
              backgroundImage: `
                linear-gradient(165deg, rgba(32,14,24,0.68) 0%, rgba(127,29,29,0.18) 50%, rgba(18,8,20,0.74) 100%),
                url("/assets/guess-bg.png")
              `,
              backgroundSize: "cover, cover",
              backgroundPosition: "center, center",
              backgroundBlendMode: "normal, soft-light",
            }}
          >
            <div
              className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[var(--gold)]/08 blur-3xl"
              aria-hidden
            />
            <div className="flex items-center justify-center">
              <GameLogo
                brand="guess"
                placement="header"
                href="/guess"
                openInNewTab
                className="h-12 max-h-12 sm:h-14 sm:max-h-14"
              />
            </div>
            <h3 className="font-codex mt-3 text-xl font-semibold tracking-[0.08em] text-[var(--gold-bright)] sm:text-2xl">
              Guess the Card
            </h3>
            <p className="mt-3 max-w-prose text-sm leading-relaxed text-[var(--parchment-dim)] sm:text-[0.95rem]">
              Read the clues. Name the card before the final reveal. Solo, challenge, co-op, and competitive
              modes await within.
            </p>
            <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/guess" target="_blank" rel="noopener noreferrer">
                  Enter Guess the Card
                </Link>
              </Button>
            </div>
          </Panel>

          <Panel
            variant="subtle"
            className={cn(
              "relative overflow-hidden border border-[#2F7F5F]/38 p-6 shadow-[0_0_28px_rgba(74,222,128,0.08)] backdrop-blur-sm sm:p-8",
              "transition-[transform,box-shadow,border-color] duration-300",
              "hover:-translate-y-0.5 hover:border-[#4ADE80]/48 hover:shadow-[0_0_36px_rgba(74,222,128,0.16),0_0_22px_rgba(134,239,172,0.12)]",
            )}
            style={{
              backgroundImage: `
                linear-gradient(165deg, rgba(11,18,16,0.72) 0%, rgba(47,127,95,0.18) 52%, rgba(11,18,16,0.78) 100%),
                url("/assets/fragments-bg.png")
              `,
              backgroundSize: "cover, cover",
              backgroundPosition: "center, center",
              backgroundBlendMode: "normal, soft-light",
            }}
          >
            <div
              className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#4ADE80]/14 blur-3xl"
              aria-hidden
            />
            <div className="flex items-center justify-center">
              <FragmentsLogo
                placement="header"
                href="/puzzle"
                openInNewTab
                className="max-w-max [&_img]:object-center [&_img]:h-14 [&_img]:max-h-14 sm:[&_img]:h-16 sm:[&_img]:max-h-16"
              />
            </div>
            <h3 className="font-codex mt-3 text-xl font-semibold tracking-[0.08em] text-[#DDFEEA] sm:text-2xl">
              Fragments of Rathe
            </h3>
            <p className="mt-3 max-w-prose text-sm leading-relaxed text-[#BDE9CF] sm:text-[0.95rem]">
              Reassemble the image from scattered fragments.
            </p>
            <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <Button
                asChild
                size="lg"
                className="w-full border-[#4ADE80]/45 bg-[linear-gradient(180deg,#2F7F5F_0%,#1F5A44_100%)] text-[#E9FFEF] hover:border-[#86EFAC]/75 hover:shadow-[0_0_24px_rgba(74,222,128,0.24)] sm:w-auto"
              >
                <Link href="/puzzle" target="_blank" rel="noopener noreferrer">
                  Enter Fragments
                </Link>
              </Button>
            </div>
          </Panel>
        </div>

        <Panel
          variant="subtle"
          className="border border-[#60A5FA]/14 bg-[linear-gradient(175deg,rgba(18,24,38,0.72),rgba(11,13,18,0.8))] p-5 shadow-[0_0_18px_rgba(59,130,246,0.07)] sm:p-6"
        >
          <p className="font-codex text-[0.58rem] font-semibold uppercase tracking-[0.26em] text-[#7EB5FF]">
            On the horizon
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[#ABBCE2]">
            More trials are being inscribed… New experiences are coming to the Codex.
          </p>
        </Panel>
      </section>
    </div>
  );
}
