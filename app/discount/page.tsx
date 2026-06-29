import type { Metadata } from "next";
import { DiscountCalculator } from "@/components/DiscountCalculator";

export const metadata: Metadata = {
  title: "割引計算",
  description: "税込、税抜、割引率、割引基準を選んで割引後の金額を計算できます。"
};

export default function DiscountPage() {
  return <DiscountCalculator />;
}
