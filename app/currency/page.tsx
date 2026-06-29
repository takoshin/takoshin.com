import type { Metadata } from "next";
import { CurrencyConverter } from "@/components/CurrencyConverter";

export const metadata: Metadata = {
  title: "通貨換算",
  description: "日本円から米ドルなど、主要通貨をまとめて換算できます。"
};

export default function CurrencyPage() {
  return <CurrencyConverter />;
}
