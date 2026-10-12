import {
  ArrowLeftRight,
  Banknote,
  Car,
  CreditCard,
  Gamepad2,
  GraduationCap,
  HandCoins,
  Heart,
  House,
  Landmark,
  PiggyBank,
  ShoppingCart,
  Tag,
  Utensils,
  UtensilsCrossed,
  Wallet,
} from "@lucide/svelte";
import { toneForName, type IconChipTone } from "@finance/ui";
import type { Component } from "svelte";

export type CategoryIcon = Component<{ class?: string; "aria-hidden"?: boolean | "true" | "false" }>;

const ICONS: { match: RegExp; icon: CategoryIcon }[] = [
  { match: /vale|alimenta/i, icon: Utensils },
  { match: /mercado|supermercado/i, icon: ShoppingCart },
  { match: /restaurante|lanche|bar/i, icon: UtensilsCrossed },
  { match: /moradia|aluguel|condom|casa/i, icon: House },
  { match: /transporte|combust|uber|carro/i, icon: Car },
  { match: /sa[úu]de|farm/i, icon: Heart },
  { match: /educa|curso|escola/i, icon: GraduationCap },
  { match: /lazer|divers|jogo|cinema/i, icon: Gamepad2 },
  { match: /sal[áa]rio|renda|receita/i, icon: Banknote },
  { match: /rendimento|invest|poupan/i, icon: PiggyBank },
];

/** Ícone e cor de uma categoria: o ícone vem do nome; a cor é sempre a mesma para o mesmo nome. */
export function categoryStyle(name: string | null, type: "income" | "expense" | "transfer"): { icon: CategoryIcon; tone: IconChipTone } {
  if (type === "transfer" || name === null) return { icon: ArrowLeftRight, tone: "transfer" };
  const icon = ICONS.find((entry) => entry.match.test(name))?.icon ?? Tag;
  return { icon, tone: toneForName(name) };
}

const ACCOUNT_STYLES: Record<string, { icon: CategoryIcon; tone: IconChipTone }> = {
  checking: { icon: Landmark, tone: "cat-1" },
  savings: { icon: PiggyBank, tone: "cat-3" },
  cash: { icon: Banknote, tone: "cat-4" },
  wallet: { icon: Wallet, tone: "cat-6" },
  credit_card: { icon: CreditCard, tone: "cat-5" },
  loan: { icon: HandCoins, tone: "cat-2" },
  meal_voucher: { icon: Utensils, tone: "benefit" },
};

/** Ícone e cor de um tipo de conta; tipos próprios ganham cor estável pelo nome. */
export function accountTypeStyle(key: string, name: string): { icon: CategoryIcon; tone: IconChipTone } {
  return ACCOUNT_STYLES[key] ?? { icon: Wallet, tone: toneForName(name) };
}

/** Classes de barra por cor (escritas por extenso para o Tailwind enxergá-las). */
export const BAR_CLASS: Record<IconChipTone, string> = {
  "cat-1": "bg-cat-1",
  "cat-2": "bg-cat-2",
  "cat-3": "bg-cat-3",
  "cat-4": "bg-cat-4",
  "cat-5": "bg-cat-5",
  "cat-6": "bg-cat-6",
  "cat-7": "bg-cat-7",
  income: "bg-income",
  expense: "bg-expense",
  transfer: "bg-transfer",
  benefit: "bg-benefit",
  primary: "bg-primary",
  muted: "bg-muted-foreground",
};