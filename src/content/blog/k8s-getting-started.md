---
title: "Kubernetes を始めた"
pubDatetime: 2020-07-29T23:09:04+09:00
description: ""
draft: false
slug: k8s-getting-started
tags: ["Kubernetes"]
---

## 動機

最近趣味でつくる Web サービスは、AWS 上のサーバレス構成 (典型的には CloudFront + API Gateway + Lambda + DynamoDB) にしていて、コスパがめちゃめちゃ良く不満はない。が、Web 以外のワークロードも雑に動かしたいときがあり、できればなるべく安く済ませたい。ランタイムとしてはやはり Docker コンテナになるんだろうけど、ECS Fargate は安くなったものの個人的にはまだ高くて使いたくない。結局ランニングコストを避けられないのなら、コストを抑えつつ、勉強も兼ねて Kubernetes ってやつを触ってみたくなった。仕事ではまったく使わないものの、Kubernetes 自体は学生時代に少し学んだり触ったことがあった (後輩が研究室のインフラを K8s にして運用してた) ので、概念とかは知っているつもりだった一方、自分で運用したことはなかった。

<!--more-->

## プロバイダ選定

K8s のプロバイダを検討するにあたって、[https://github.com/hobby-kube/guide](https://github.com/hobby-kube/guide) が良かった。結局、1. マスターがマネージド、2.安い (最小かつ 2 つのワーカーノードで $20/mon)、3. 日本から近いシンガポールリージョンがある の理由で Digital Ocean をプロバイダに選んだ。[https://www.digitalocean.com/products/kubernetes/](https://www.digitalocean.com/products/kubernetes/)

DO の Managed Kubernetes は、数クリックでクラスタの作成とワーカーノードのプロビジョニングが行われ、それが終わるとすぐに kubectl でアクセスできるようになる。プロビジョニングが完了すると、Marketplace から getting started としておすすめのアプリケーションがいくつか表示される。自分はそこで Kubernetes Monitoring Stack という Prometheus Operator, Prometheus Node Exporter, Grafana などがまとまっているアプリケーションを選んでみた。1 クリックでそれらがデプロイされ、すぐ使えるようになるのは結構魔法っぽい体験だった。

## デーモンを動かす

それからなんらかを K8s で動かしたくなって、[https://github.com/kenfdev/remo-exporter](https://github.com/kenfdev/remo-exporter) をデプロイして自宅の Nature Remo がとっているメトリクスを Prometheus に入れてみることにした。リポジトリに manifest が同梱されていて、Secrets と Deployment を kubectl apply するだけで簡単に動かすことができた。Prometheus operator には ServiceMonitor というカスタムリソースがあって、ディスカバリの設定を書いてこれをデプロイすることで、Prometheus の Target 追加と Prometheus のリロードまでやってくれる。これはあまりに便利だった。

## インターネット経由で認証付き HTTPS アクセスする

続いて、Prometheus の Web UI にアクセスしたくなった。動作確認程度であれば port-forward で十分ではあるが、普通にインターネットアクセスするのであれば何らかの方法で Service の expose が必要になる。なんらかの認証をかけたかったが、一旦 DO の Firewall をいじって自宅 IP からのアクセスだけを許可して、認証は後回しにした。

まずサーバ証明書をなんとかすることにした。[https://github.com/jetstack/cert-manager](https://github.com/jetstack/cert-manager) というデファクトっぽいものがあって、ACME で Let's Encrypt の証明書の発行・自動更新ができるようだった。DNS provider を設定すると DNS Challenge も勝手にやってくれるらしい。DO にも Domain API があり、Route53 で管理しているドメインのサブドメインを DO に移譲して、DO provider を使うことにした。それから特にハマることもなく、ワイルドカード証明書を発行し、それが Secrets に保存された。本当に簡単。

続いてインターネットからアクセスを受ける方法を調べた。Service の Type:NodePort を使う方法、LoadBalancer を使う方法、Ingress を使う方法などいくつかやり方があった。Production-use であれば迷わず LoadBalancer を使って外部リソースとして LB をつくるのが良さそうだが、LB をつくると DO であれば固定費 $10/mon がかかってしまうので断念した。NodePort は直感的ですぐ理解できたが、Ingress の理解に少し時間がかかった。結局 [https://github.com/kubernetes/ingress-nginx](https://github.com/kubernetes/ingress-nginx) を使い、NodePort で expose したポートでアクセスを受け、発行した LE の証明書を刺した Ingress でルーティングする構成にした。これだと :443 ではアクセスできずポート番号を明示しなければならず少しダサいが、一旦妥協することにした。 *.example.com → ワーカーノードの IP という A レコードを作っておき、対応する Ingress をデプロイすることで、https://prometheus.example.com:port で Prometheus UI にアクセスできるようになった。少しハマったのが Ingress で cross-namespace する方法で、ExternalName を使う必要があった。

最後に、後回しにしていた認証をする。少し調べると [https://github.com/vouch/vouch-proxy](https://github.com/vouch/vouch-proxy) が NGINX の auth_request を使った OAuth などの認証プロキシとして使えそうだった。ガチャガチャ試してみたら *.example.com について共通の認証 (Google) が達成できた。これまで helm は多少試していたが、このときはじめて helmfile というやつを使ってデプロイした。helm は manifest のパッケージングで、helmfile は helm を利用しつつバージョニングやモジュール化をいい感じにしてデプロイパイプラインで利用しやすくするもの、という雑な理解をした。

## 感想

まず Kubernetes エコシステムはドキュメントがかなりしっかりしているなという印象。それ自体 (公式ドキュメント)はもちろん、今回自分が触れたものたちについても同様だった。適当に動かすぐらいであればドキュメントを読むだけでだいたいは十分で、なにかハマったときもだいたい GitHub の Issue でなんとかなった。実際に手を動かしてみて、コンテナを動かす・連携させる基盤として K8s があると便利だなと素直に思った。K8s 上のエンティティはすべて Object であり、kubectl apply など Object に対する操作が統一されているところが Unix 哲学を想起させる良い点だと感じた。

普段仕事で AWS の ECS を使っている身としては、ECS だけでできることは少ないので他のサービスと組み合わせることが普通な一方、K8s 上では K8s だけで完結できることが多く、慣れていけば K8s 上でシステムを構築するのがもっと便利になるのだろうと感じた。趣味レベルだとワーカーノードは 2 台で十分だし、ワーカーノードのスケールアウトも必要になったら考えれば十分だし、… と色々雑にやって構わないが、真面目にクラスタを運用するとなると、ワークロードを適切に処理しないと容易に破滅しそうだなあ、とか想像レベルだけど大変そうだと思った。

あと公式ドキュメントにも書いてあるけど Namespace は必要になるまで切らないほうがいい。DO の Marketplace で最初にインストールしたやつが Namespace を細かく切っていたのでとりあえずそれに従ってみたけど、kubectl を叩くときいちいち面倒だし、Namespace を分けている恩恵はいまのところメトリクスが見やすいぐらいしかない。

$20/mon でこれぐらい遊べるなら、この調子で続けてみよう、といまのところ思っている。現世にあふれる K8s 関連の情報に興味を持てるようになったのは良かった気がする。カスタムコントローラを自分で書くぐらいまですれば、初心者を名乗れるだろうか…。
