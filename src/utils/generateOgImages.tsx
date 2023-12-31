import satori, { type SatoriOptions } from "satori";
import { Resvg } from "@resvg/resvg-js";
import { type CollectionEntry } from "astro:content";
import postOgImage from "./og-templates/post";
import siteOgImage from "./og-templates/site";
import fs from "fs";

const fetchFonts = async () => {
  // Read the font file
  const fontFileRegular = fs.readFileSync(
    "./public/fonts/NotoSansJP-Regular.ttf"
  );

  const fontRegular: Buffer = Buffer.from(fontFileRegular);

  // Bold Font
  const fontFileBold = fs.readFileSync(
    "./public/fonts/NotoSansJP-Bold.ttf"
  );
  const fontBold: Buffer = Buffer.from(fontFileBold);

  return { fontRegular, fontBold };
};

const { fontRegular, fontBold } = await fetchFonts();

const options: SatoriOptions = {
  width: 1200,
  height: 630,
  embedFont: true,
  fonts: [
    {
      name: "Noto Sans JP Regular",
      data: fontRegular,
      weight: 400,
      style: "normal",
    },
    {
      name: "Noto Sans JP Bold",
      data: fontBold,
      weight: 600,
      style: "normal",
    },
  ],
};

function svgBufferToPngBuffer(svg: string) {
  const resvg = new Resvg(svg);
  const pngData = resvg.render();
  return pngData.asPng();
}

export async function generateOgImageForPost(post: CollectionEntry<"blog">) {
  const svg = await satori(postOgImage(post), options);
  return svgBufferToPngBuffer(svg);
}

export async function generateOgImageForSite() {
  const svg = await satori(siteOgImage(), options);
  return svgBufferToPngBuffer(svg);
}
