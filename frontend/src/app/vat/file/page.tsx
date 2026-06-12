import { Suspense } from "react";
import FileClient from "./file-client";

// Real filing: figures in, HMRC receipt out. Addressed by ?e=<entity>&period=<key>.
export default function VatFilePage() {
  return (
    <Suspense>
      <FileClient />
    </Suspense>
  );
}
