"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { formatMoney, priceFor } from "@/lib/money";
import type { Currency, Service } from "@/lib/types";

const CurrencyContext = createContext<Currency>("NGN");

/**
 * Detects the visitor's currency once from their location (see /api/geo)
 * and shares it with every <Price />. Pages stay statically cached; the
 * naira price renders first and switches to dollars only for visitors
 * outside Nigeria.
 */
export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<Currency>("NGN");

  useEffect(() => {
    let cancelled = false;
    try {
      const cached = sessionStorage.getItem("currency");
      if (cached === "NGN" || cached === "USD") {
        setCurrency(cached);
        return;
      }
    } catch {}
    fetch("/api/geo", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { currency: Currency }) => {
        if (cancelled) return;
        setCurrency(d.currency);
        try {
          sessionStorage.setItem("currency", d.currency);
        } catch {}
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return <CurrencyContext.Provider value={currency}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  return useContext(CurrencyContext);
}

export function Price({ service }: { service: Pick<Service, "price_ngn_kobo" | "price_usd_cents"> }) {
  const currency = useCurrency();
  const p = priceFor(service, currency);
  return <span className="tabular-nums">{formatMoney(p.minor, p.currency)}</span>;
}
