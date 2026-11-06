import React from "react";
import {
  Home,
  Zap,
  Droplets,
  Flame,
  Wifi,
  ShoppingBag,
  Shirt,
  Tv,
  Sparkles,
  Receipt,
  Coffee,
  Utensils,
} from "lucide-react";

export function CategoryIcon({
  name,
  iconKey,
  className = "h-5 w-5",
}: {
  name: string;
  iconKey?: string;
  className?: string;
}) {
  const lower = name.toLowerCase();

  if (iconKey === "Home" || lower.includes("kira")) {
    return <Home className={className} />;
  }
  if (iconKey === "Zap" || lower.includes("elektrik")) {
    return <Zap className={className} />;
  }
  if (iconKey === "Droplets" || lower.includes("su")) {
    return <Droplets className={className} />;
  }
  if (iconKey === "Flame" || lower.includes("doğalgaz") || lower.includes("dogalgaz") || lower.includes("ısınma")) {
    return <Flame className={className} />;
  }
  if (iconKey === "Wifi" || lower.includes("internet") || lower.includes("fiber")) {
    return <Wifi className={className} />;
  }
  if (iconKey === "ShoppingBag" || lower.includes("market") || lower.includes("atıştırmalık")) {
    return <ShoppingBag className={className} />;
  }
  if (iconKey === "Shirt" || lower.includes("çamaşır") || lower.includes("kurutma")) {
    return <Shirt className={className} />;
  }
  if (iconKey === "Tv" || lower.includes("abonelik") || lower.includes("netflix") || lower.includes("spotify")) {
    return <Tv className={className} />;
  }
  if (lower.includes("kahve") || lower.includes("çay")) {
    return <Coffee className={className} />;
  }
  if (lower.includes("yemek") || lower.includes("mutfak")) {
    return <Utensils className={className} />;
  }
  if (iconKey === "Sparkles") {
    return <Sparkles className={className} />;
  }
  return <Receipt className={className} />;
}

export function formatCurrencyTRY(amount: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
