"use client";

import { useState } from "react";
import {
  ChevronDown,
  Plus,
  Check,
  Building2,
  Landmark,
  Handshake,
  Users,
  User,
  Globe,
  Heart,
  Building,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Entity, EntityIconName } from "@/types/dashboard";
import { ENTITY_ICON_NAMES, ENTITY_TYPE_LABELS } from "@/types/dashboard";

const ICON_COMPONENTS: Record<EntityIconName, typeof Building2> = {
  "building-2": Building2,
  landmark: Landmark,
  handshake: Handshake,
  users: Users,
  user: User,
  globe: Globe,
  heart: Heart,
  building: Building,
  "users-round": UsersRound,
};

function EntityIcon({ type, className }: { type: EntityIconName; className?: string }) {
  const Icon = ICON_COMPONENTS[type];
  return <Icon className={className} />;
}

interface EntityHeaderProps {
  entity: Entity | null;
  entities: Entity[];
  isLoading?: boolean;
  onEntityChange: (entityId: string) => void;
}

interface IdentifierDisplay {
  label: string;
  value: string;
}

function formatIdentifiers(entity: Entity): IdentifierDisplay[] {
  const displays: IdentifierDisplay[] = [];

  if (entity.identifiers.crn) {
    displays.push({ label: "CRN", value: entity.identifiers.crn });
  }
  if (entity.identifiers.utr) {
    displays.push({ label: "UTR", value: entity.identifiers.utr });
  }
  if (entity.identifiers.vrn) {
    displays.push({ label: "VRN", value: entity.identifiers.vrn });
  }
  if (entity.identifiers.charityNumber) {
    displays.push({ label: "Charity No", value: entity.identifiers.charityNumber });
  }

  return displays.slice(0, 3);
}

export function EntityHeader({
  entity,
  entities,
  isLoading,
  onEntityChange,
}: EntityHeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  if (isLoading) {
    return <EntityHeaderSkeleton />;
  }

  if (!entity) {
    return <EntityHeaderEmpty />;
  }

  const identifiers = formatIdentifiers(entity);
  const entityIconName = ENTITY_ICON_NAMES[entity.type];
  const entityTypeLabel = ENTITY_TYPE_LABELS[entity.type];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
            <EntityIcon type={entityIconName} className="h-6 w-6 text-gray-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{entity.name}</h1>
            <p className="text-sm text-gray-500">{entityTypeLabel}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
              {identifiers.map((id, index) => (
                <span key={id.label} className="flex items-center">
                  {index > 0 && <span className="mx-2 h-1 w-1 rounded-full bg-gray-400" />}
                  <span className="font-medium">{id.label}:</span>&nbsp;{id.value}
                </span>
              ))}
            </div>
          </div>
        </div>

        {entities.length > 1 && (
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2"
            >
              Switch Entity
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  isDropdownOpen && "rotate-180"
                )}
              />
            </Button>

            {isDropdownOpen && (
              <div className="absolute right-0 top-full z-10 mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-lg">
                <div className="py-2">
                  {entities.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => {
                        onEntityChange(e.id);
                        setIsDropdownOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50",
                        e.id === entity.id && "bg-blue-50"
                      )}
                    >
                      <EntityIcon type={ENTITY_ICON_NAMES[e.type]} className="h-5 w-5 text-gray-500" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {e.id === entity.id && (
                            <Check className="h-4 w-4 text-blue-600" />
                          )}
                          <span className="font-medium text-gray-900">
                            {e.name}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {ENTITY_TYPE_LABELS[e.type]}
                        </span>
                      </div>
                    </button>
                  ))}
                  <div className="border-t border-gray-100 mt-2 pt-2">
                    <button className="flex w-full items-center gap-3 px-4 py-3 text-left text-blue-600 hover:bg-gray-50">
                      <Plus className="h-4 w-4" />
                      <span>Add New Entity</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EntityHeaderSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-1 h-4 w-32" />
            <div className="mt-2 flex gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-26" />
            </div>
          </div>
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}

function EntityHeaderEmpty() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="text-center py-4">
        <p className="text-gray-600 mb-4">
          Welcome! Let&apos;s set up your first entity.
        </p>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Your First Entity
        </Button>
      </div>
    </div>
  );
}

export { EntityHeaderSkeleton };
