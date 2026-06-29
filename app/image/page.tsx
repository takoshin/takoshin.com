import type { Metadata } from "next";
import { ImageConverter } from "@/components/ImageConverter";

export const metadata: Metadata = {
  title: "画像形式変換",
  description: "JPEG、PNG、WebPをブラウザ上で変換できます。"
};

export default function ImagePage() {
  return <ImageConverter />;
}
