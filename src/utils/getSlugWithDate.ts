import type { CollectionEntry } from "astro:content";

const getSlugWithDate = (post: CollectionEntry<"blog">): string => {
  // Add YYYY/MM/DD prefix
  const yyyy = post.data.pubDatetime.getFullYear();
  const mm = (post.data.pubDatetime.getMonth() + 1).toString().padStart(2, "0");
  const dd = post.data.pubDatetime.getDate().toString().padStart(2, "0");
  return `${yyyy}/${mm}/${dd}/${post.slug}`;
}

export default getSlugWithDate;
