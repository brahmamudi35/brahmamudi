"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BookmarkPlus, Filter, SearchX } from "lucide-react";
import { toast } from "sonner";

import {
  ProfileCard,
  ProfileCardSkeleton,
} from "@/components/profiles/profile-card";
import {
  EMPTY_FILTERS,
  type Filters,
  filtersToObject,
  filtersToQuery,
  objectToFilters,
  SearchFilters,
} from "@/components/profiles/search-filters";
import { Container } from "@/components/site/container";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { apiFetch } from "@/lib/api";
import { handleApiError } from "@/lib/form";
import { useReferenceData } from "@/lib/reference";
import type { Paginated, ProfileSummary, SavedSearch } from "@/lib/types";
import { cn } from "@/lib/utils";

const PAGE = 24;

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchInner />
    </Suspense>
  );
}

function SearchInner() {
  const { data: ref } = useReferenceData();
  const params = useSearchParams();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  // ?saved=<id> preloads that saved search's filters
  useEffect(() => {
    const id = params.get("saved");
    if (!id) return;
    apiFetch<SavedSearch>(`/saved-searches/${id}/`)
      .then((s) => setFilters(objectToFilters(s.filters)))
      .catch(() => {});
  }, [params]);
  const [results, setResults] = useState<ProfileSummary[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  const query = useMemo(() => filtersToQuery(filters).toString(), [filters]);

  const fetchPage = useCallback(
    async (offset: number) => {
      const p = new URLSearchParams(query);
      p.set("limit", String(PAGE));
      p.set("offset", String(offset));
      return apiFetch<Paginated<ProfileSummary>>(`/profiles/?${p.toString()}`);
    },
    [query],
  );

  // Refetch (debounced) whenever filters change.
  useEffect(() => {
    setLoading(true);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      try {
        const data = await fetchPage(0);
        setResults(data.results);
        setCount(data.count);
      } catch {
        setResults([]);
        setCount(0);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(debounce.current);
  }, [fetchPage]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const data = await fetchPage(results.length);
      setResults((prev) => [...prev, ...data.results]);
    } finally {
      setLoadingMore(false);
    }
  }

  const activeCount =
    filters.subcaste.length +
    filters.marital_status.length +
    filters.region.length +
    filters.food_habit.length +
    [
      filters.q,
      filters.age_min,
      filters.age_max,
      filters.height_min,
      filters.height_max,
      filters.nakshatram,
      filters.gothram,
      filters.country_living,
    ].filter(Boolean).length;

  const filterPanel = ref && (
    <SearchFilters
      value={filters}
      onChange={setFilters}
      enums={ref.enums}
      nakshatram={ref.nakshatram}
    />
  );

  return (
    <Container className="py-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Search profiles</h1>
          <p className="text-sm text-muted-foreground">
            {count === null
              ? "Loading…"
              : `${count.toLocaleString("en-IN")} ${count === 1 ? "match" : "matches"}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <>
              <SaveSearchDialog filters={filters} />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters(EMPTY_FILTERS)}
              >
                Clear
              </Button>
            </>
          )}
          <Sheet>
            <SheetTrigger
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium lg:hidden",
              )}
            >
              <Filter className="size-4" />
              Filters
              {activeCount > 0 && (
                <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                  {activeCount}
                </span>
              )}
            </SheetTrigger>
            <SheetContent side="left" className="w-80 overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-4 px-1">{filterPanel}</div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="mt-6 flex gap-8">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-20">{filterPanel}</div>
        </aside>

        <div className="min-w-0 flex-1">
          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProfileCardSkeleton key={i} />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-20 text-center text-muted-foreground">
              <SearchX className="size-8" />
              <p>No profiles match these filters.</p>
              <Button variant="outline" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>
                Clear filters
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {results.map((p) => (
                  <ProfileCard key={p.id} profile={p} />
                ))}
              </div>
              {count !== null && results.length < count && (
                <div className="mt-8 flex justify-center">
                  <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                    {loadingMore && <Spinner />}
                    Load more
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Container>
  );
}

function SaveSearchDialog({ filters }: { filters: Filters }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [alerts, setAlerts] = useState(true);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await apiFetch("/saved-searches/", {
        method: "POST",
        body: {
          name: name.trim() || "My search",
          filters: filtersToObject(filters),
          alerts_enabled: alerts,
        },
      });
      toast.success("Search saved.");
      setOpen(false);
      setName("");
    } catch (err) {
      handleApiError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <BookmarkPlus className="size-4" />
        Save
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading">Save this search</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          placeholder="Name (e.g. Goldsmith, 25–30, Telangana)"
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={alerts}
            onCheckedChange={(v) => setAlerts(v === true)}
          />
          Email me when new profiles match
        </label>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Spinner />}
            Save search
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
