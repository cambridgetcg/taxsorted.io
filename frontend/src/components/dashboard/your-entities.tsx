"use client";

// The real panel: your entities, from the api, owned by this browser.
// Everything below it on the dashboard is sample books until wired.

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, type ApiEntity, type RailStatus } from "@/lib/api";

export function YourEntities() {
  const [entities, setEntities] = useState<ApiEntity[] | null>(null);
  const [rail, setRail] = useState<RailStatus | null>(null);
  const [apiDown, setApiDown] = useState(false);

  useEffect(() => {
    api
      .listEntities()
      .then((r) => setEntities(r.entities))
      .catch(() => setApiDown(true));
    api.railStatus().then(setRail).catch(() => {});
  }, []);

  return (
    <Card className="border-accent/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold leading-none tracking-tight">
            Yours, for real{" "}
            {rail && (
              <Badge variant="outline" className="ml-2 align-middle">
                {rail.configured ? rail.env : "awaiting HMRC keys"}
              </Badge>
            )}
          </h2>
          <Button size="sm" asChild>
            <Link href="/vat/">
              {entities?.length ? "Open the cockpit" : "Create your first entity"}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <CardDescription>
          Plug in your details, connect to HMRC, file with a receipt. No
          account needed — this browser is your key.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {apiDown ? (
          <p className="text-sm text-ink-soft">
            We can&apos;t reach the api right now, so we can&apos;t show your
            entities — try again shortly.
          </p>
        ) : entities === null ? (
          <p className="text-sm text-ink-soft">Looking for your entities…</p>
        ) : entities.length === 0 ? (
          <p className="text-sm text-ink-soft">
            None yet. Three plain details and you&apos;re in.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {entities.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/vat/?e=${e.id}`}
                  className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-1.5 text-sm hover:bg-gray-50"
                >
                  <span className="font-medium">{e.name}</span>
                  <Badge variant={e.connected ? "success" : "outline"}>
                    {e.connected ? "connected" : "not connected"}
                  </Badge>
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/vat/"
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-line px-4 py-1.5 text-sm text-ink-soft hover:text-ink"
              >
                <Plus className="h-3.5 w-3.5" /> add another
              </Link>
            </li>
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
