import {
  BookOpen,
  FileText,
  Footprints,
  Gift,
  Pill,
  Shirt,
  Smartphone,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

// Ported from mobile's src/screens/Home/index.js so the web dashboard reads
// like the same product: same categories, same tint palette, same illustrative
// "trending" content (that section is static/mock in the app too).
export const TINTS: { bg: string; fg: string }[] = [
  { bg: "#eeedfe", fg: "#3c3489" },
  { bg: "#e1f5ee", fg: "#085041" },
  { bg: "#faece7", fg: "#712b13" },
  { bg: "#fbeaf0", fg: "#72243e" },
  { bg: "#e6f1fb", fg: "#0c447c" },
  { bg: "#faeeda", fg: "#633806" },
  { bg: "#eaf3de", fg: "#27500a" },
];

export const CATEGORIES: { name: string; icon: LucideIcon }[] = [
  { name: "Gifts", icon: Gift },
  { name: "Medicines", icon: Pill },
  { name: "Food items", icon: UtensilsCrossed },
  { name: "Documents", icon: FileText },
  { name: "Footwear", icon: Footprints },
  { name: "Clothes", icon: Shirt },
  { name: "Electronics", icon: Smartphone },
  { name: "Books", icon: BookOpen },
];

export const ALL_CATEGORIES = [
  "Gifts",
  "Medicines",
  "Food items",
  "Documents",
  "Footwear",
  "Clothes",
  "Electronics",
  "Books & stationery",
  "Flowers",
  "Pet supplies",
  "Cosmetics & beauty",
  "Toys & games",
  "Groceries",
  "Jewelry",
  "Sports equipment",
  "Musical instruments",
  "Home decor",
  "Keys & small parcels",
  "Other",
];

export const POPULAR_ITEMS: { name: string; icon: LucideIcon; stat: string }[] = [
  { name: "Wedding invitations", icon: FileText, stat: "180 sent this week" },
  { name: "Diabetes medicines", icon: Pill, stat: "95 delivered today" },
  { name: "Homemade pickles & snacks", icon: UtensilsCrossed, stat: "260 this month" },
  { name: "Birthday gift hampers", icon: Gift, stat: "140 this week" },
  { name: "Sneakers & shoes", icon: Footprints, stat: "70 this week" },
  { name: "Laptop chargers & cables", icon: Smartphone, stat: "50 this week" },
];

export type NearbyPlan = {
  id: string;
  travelerName: string;
  rating: number;
  from: { address: string };
  to: { address: string };
  departureDate: string;
  arrivalDate: string;
  pricePerPackage: number;
};

// Mock illustrative content, same as mobile's MOCK_NEARBY_ARRIVALS — the app
// doesn't have a real "arrivals near me" search endpoint either.
export const MOCK_NEARBY_ARRIVALS: NearbyPlan[] = [
  { id: "mock-arrival-1", travelerName: "Vikram Rao", rating: 4.6, from: { address: "Mumbai" }, to: { address: "Pimpri" }, departureDate: "2026-09-12T08:00:00", arrivalDate: "2026-09-12T14:00:00", pricePerPackage: 150 },
  { id: "mock-arrival-2", travelerName: "Fatima Ansari", rating: 4.8, from: { address: "Nagpur" }, to: { address: "Pimpri" }, departureDate: "2026-09-13T05:00:00", arrivalDate: "2026-09-13T09:00:00", pricePerPackage: 170 },
  { id: "mock-arrival-3", travelerName: "Sameer Khan", rating: 4.9, from: { address: "Pune" }, to: { address: "Pimpri" }, departureDate: "2026-09-13T09:00:00", arrivalDate: "2026-09-13T11:00:00", pricePerPackage: 90 },
  { id: "mock-arrival-4", travelerName: "Divya Iyer", rating: 4.5, from: { address: "Nashik" }, to: { address: "Pimpri" }, departureDate: "2026-09-14T05:15:00", arrivalDate: "2026-09-14T08:15:00", pricePerPackage: 130 },
  { id: "mock-arrival-5", travelerName: "Arjun Nair", rating: 4.7, from: { address: "Mumbai" }, to: { address: "Pimpri" }, departureDate: "2026-09-15T07:30:00", arrivalDate: "2026-09-15T12:00:00", pricePerPackage: 160 },
];

export const initials = (name: string) =>
  name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();

export const avatarTint = (name: string) =>
  TINTS[(name.charCodeAt(0) + name.charCodeAt(name.length - 1)) % TINTS.length];

export const getDateOptions = () =>
  Array.from({ length: 10 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return {
      key: date.toISOString().slice(0, 10),
      dow: date.toLocaleDateString("en-US", { weekday: "short" }),
      day: date.getDate(),
      mon: date.toLocaleDateString("en-US", { month: "short" }),
    };
  });
