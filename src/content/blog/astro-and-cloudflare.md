---
title: サイトをAstro + Cloudflare Pagesに移行した
pubDatetime: 2023-12-30T20:36:14+09:00
slug: astro-and-cloudflare
draft: false
description: ""
---

このサイトをHugoからAstroに移行して、ホスティングもFirebase HostingからCloudflare Pagesに移行した。

## Astro

近年これでいいじゃんとなっているイメージがある[Astro](https://astro.build/)。[Tutorial](https://docs.astro.build/en/tutorial/0-introduction/)を触りつつ、`npm create astro@latest` して `npm run dev` すると一発でいい感じのサイトができてすごい。デフォルトのblogテーマだとTag機能がなかったりカバー画像が前提になっていていじりにくかったので、適当にテーマを見繕って[AstroPaper](https://astro.build/themes/details/astro-paper/)を使うことにした。このテーマでほとんど十分だったので、簡単にいじれそうな部分を多少いじりつつ、URLを壊さないようにslugに日付を入れるぐらいの変更をした。また、既存のMarkdownのメタデータを微妙に変更する必要があった。コミットログによれば作業を始めてから3時間ぐらいで移行が完了している。コスパがすごい。サイトはたしかに高速に動くが、ビルドは思ったより（というかHugoより）遅いという感想があった。

HugoをやめてAstroに移行しようという気持ちは2年前ぐらいからあって、今回ようやく移行の時間を作れた。別にHugoで何も困っていないのだが、若者に「Hugoとかおじさんしか使ってない」と言われたことと、ナウいフレームワークを触れるのがこのサイトぐらいしかないということで重い腰を上げた次第。

### MDX

Astroをいじっている過程で、Markdownを拡張して、JSXを書けるようにした[MDX](https://mdxjs.com/)があることを知った。移行に際して、JSXを使いたい場面がなかったので実際には使っていない。

## Cloudflare Pages

このサイトはホスティングの実験場になっていて、これまでに確かAmazon CloudFront → GitHub Pages → Firebase Hostingと遷移している。Astroへの移行ついでに、近年これでいいじゃんとなっているイメージがある2の[Cloudflare Pages](https://pages.cloudflare.com/)に移行することにした。もともとCloudflareのアカウントは持っていて、コンソールをポチポチやってGitHubと連携しただけでデプロイできてしまった。デプロイ体験が良すぎる。このサイトは不便なことにZone Apexで運用しているため、Cloudflare PagesのCustom Domainを使うには少なくともネームサーバーをCloudflareに切り替える必要があった[^1]。とはいえ別に苦労するものではなかった。既存のレコードを自動で引っこ抜いてくれるので、AWS側でNSを書き換えるだけ。ものの10分ぐらいだった。

mainブランチをproductionとしてデプロイするだけでなく、他のブランチをpreviewとしてデプロイすることもできる。Pull requestに対するプレビュー環境として便利そうなので設定した。[Cloudflare Access](https://www.cloudflare.com/zero-trust/products/access/)のZero Trust Network Accessという機能があり、これを使うと様々なインテグレーションで認証して認可ポリシーを使えるようになる。無料枠があったので使ってみることにした。正直コンソール上は難しかったが、結局15分ぐらいでGoogle workspaceの認証とメールアドレス一致のポリシーをpreviewに設定することができた。このサイトはgithub.comのPublic repositoryでホストしているので、認証する意味がなく、ただの自己満足である。

## パフォーマンス

とくに気持ちがなかったので移行前の状態を保存しておくのを忘れた。移行後のLighthouseの数値は良好（フォントのダウンロードで減点されている）。

![](/images/lighthouse-after.png)

ただ体感としては移行前よりサクサクになったのでヨシ!

[^1]: https://developers.cloudflare.com/pages/configuration/custom-domains/#add-a-custom-apex-domain
