import type { ReactNode } from "react";
import Image from "next/image";
import { ExternalLink } from "@/components/gov/sources";

export interface MaterialFigureProps {
  id: string;
  src: string;
  width: number;
  height: number;
  alt: string;
  title: string;
  caption: ReactNode;
  creator: string;
  sourceLabel: string;
  sourceUrl: string;
  creditLine: string;
  rightsLabel: string;
  rightsUrl: string;
  changeNote: string;
  evidenceBoundary: ReactNode;
  transcript?: ReactNode;
}

export function MaterialFigure({
  id,
  src,
  width,
  height,
  alt,
  title,
  caption,
  creator,
  sourceLabel,
  sourceUrl,
  creditLine,
  rightsLabel,
  rightsUrl,
  changeNote,
  evidenceBoundary,
  transcript,
}: MaterialFigureProps) {
  if (!alt.trim()) {
    throw new Error(`MaterialFigure ${id} needs useful alternative text.`);
  }
  if (width <= 0 || height <= 0) {
    throw new Error(`MaterialFigure ${id} needs fixed positive dimensions.`);
  }

  const portrait = height > width;

  return (
    <figure
      data-material-id={id}
      className="overflow-hidden rounded-lg border border-line bg-white"
    >
      <div className={portrait ? "mx-auto max-w-xl bg-white" : "bg-white"}>
        <Image
          src={src}
          width={width}
          height={height}
          alt={alt}
          sizes={portrait ? "(max-width: 640px) 100vw, 576px" : "(max-width: 768px) 100vw, 768px"}
          className="h-auto w-full"
        />
      </div>
      <figcaption className="border-t border-line p-5 sm:p-6">
        <h3 className="text-lg font-semibold text-ink">{title}</h3>
        <div className="mt-2 space-y-3 text-base leading-7 text-ink-soft">{caption}</div>

        <dl className="mt-5 grid gap-x-6 gap-y-3 border-t border-line pt-4 text-sm text-ink-soft sm:grid-cols-2">
          <div>
            <dt className="font-semibold text-ink">Creator</dt>
            <dd>{creator}</dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Original item</dt>
            <dd>
              <ExternalLink href={sourceUrl}>{sourceLabel}</ExternalLink>
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Rights</dt>
            <dd>
              <ExternalLink href={rightsUrl}>{rightsLabel}</ExternalLink>
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Changes</dt>
            <dd>{changeNote}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="font-semibold text-ink">Credit</dt>
            <dd>{creditLine}</dd>
          </div>
        </dl>

        <div
          role="note"
          className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950"
        >
          <strong>What this does not prove:</strong> {evidenceBoundary}
        </div>

        {transcript ? (
          <details className="mt-4 rounded-lg border border-line bg-paper px-4 py-2">
            <summary className="cursor-pointer py-2 font-semibold text-ink">
              Read the relevant notes
            </summary>
            <div className="pb-3 text-sm leading-6 text-ink-soft">{transcript}</div>
          </details>
        ) : null}
      </figcaption>
    </figure>
  );
}
