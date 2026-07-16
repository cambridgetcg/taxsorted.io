import { Suspense } from "react";
import FileClient from "./file-client";

// Real filing: figures in, HMRC receipt out. Addressed by ?e=<entity>&period=<key>.
export default function VatFilePage() {
  return (
    <Suspense
      fallback={
        <p className="mx-auto max-w-3xl px-4 py-12 text-base text-ink-soft">
          Loading the filing page…
        </p>
      }
    >
      <FileClient />
    </Suspense>
  );
}
