import type { Site, SocialObjects } from "./types";

export const SITE: Site = {
  website: "https://itkq.jp/",
  author: "itkq",
  desc: "itkq's blog",
  title: "itkq.jp",
  ogImage: "astropaper-og.jpg",
  lightAndDarkMode: true,
  postPerPage: 10,
};

export const LOCALE = {
  lang: "ja", // html lang code. Set this empty and default will be "en"
  langTag: ["ja-JP"], // BCP 47 Language Tags. Set this empty [] to use the environment default
} as const;

export const LOGO_IMAGE = {
  enable: false,
  svg: true,
  width: 216,
  height: 46,
};

export const SOCIALS: SocialObjects = [
  {
    name: "Github",
    href: "https://github.com/itkq",
    linkTitle: ` ${SITE.title} on Github`,
    active: true,
  },
  {
    name: "Twitter",
    href: "https://twitter.com/itkq",
    linkTitle: `${SITE.title} on Twitter`,
    active: true,
  },
];
