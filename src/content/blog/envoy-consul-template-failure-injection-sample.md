---
title: "Envoy proxy と consul-template を使った Fault injection を試した"
slug: "envoy-consul-template-failure-injection-sample"
pubDatetime: 2018-09-12T23:49:16+09:00
description: ""
draft: false
tags: ["Envoy", "Chaos Engineering"]
---

## モチベーション
サービスメッシュのための Side-car proxy として有名な [Envoy proxy](https://www.envoyproxy.io/) (以下 Envoy) がある。Envoy は Observability や Resiliency など便利な機能の他に、Fault Injection 機能を持つ。この Fault injection は、システム全体の可用性を向上させるためのシステム間通信の障害のエミュレートに使われるものであり、これは一般に Chaos Engineering や Resiliency Testing と呼ばれる。

<!--more-->

最近 Chaos Engineering に興味があったため、Envoy を使った簡単な Fault Injection を試すことにした。Envoy で Fault Injection をするためには [Fault Injection filter](https://www.envoyproxy.io/docs/envoy/latest/api-v1/http_filters/fault_filter#config-http-filters-fault-injection-v1) を利用する。Fault Injection filter の設定を行えば、「ある upstream に対してリクエストするとき、ある確率で 503 を返す、または (同時に) ある確率でレスポンスを 1 秒遅らせる」といったことが可能である。Chaos Engineering の文脈で Fault Injection を行う場合は、どの程度・どの期間障害を起こすのか設定する必要があり、すなわち Fault Injection filter の設定を動的に変更する必要がある。Envoy には [Runtime configuration](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/runtime#arch-overview-runtime) という機能がある。あるファイルシステムツリーに設定値を書き、Envoy が watch する特定のシンボリックリンクをそのツリーに貼り直すと、Envoy が動的にその設定値を使うようになる、というものだ。Fault Injection filter で設定する値も Runtime configuration による設定が可能である。Runtime configuration 以外にも [Listener discovery service](https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/lds) (LDS) を使う手もありそうだったが、Listen している socket が変更される cons がありそうだったため今回は Runtime configuration だけ試した。

以上より、Fault Injection filter の設定値を put すると、Runtime configuration を使って動的に設定値を変更する API を用意すれば、目的の Fault Injection が達成できそうだ。ファイルシステムに書き込む必要があるため、今回は Consul KV Store と consul-template を使ってやってみる。

## 実装
[GitHub リポジトリ](https://github.com/itkq/envoy-consul-template-failure-injection-sample)に docker-compose で動くサンプルを用意した。サンプルでは front と backend の 2 つのサービスがあり、front は backend に依存している。front は Envoy 経由で backend に HTTP リクエストする。

consul-template が書き込むディレクトリを Envoy も見ている必要があるため、Docker volume の機能を使いホストのディレクトリを mount している。consul-template は watch している key tree が変更されると、値を所定のパスに書き込む動きをする。

## 実験
`APP_ID=front docker-compose up --build` で Consul Server, Consul Agent を含むコンテナ郡を起動する。この実験では Fault Injection の機能のうち、リクエストに対しサーバーエラーを返す abort を対象とする。以下のように Consul KV に設定値を書き込む。

```
$ export APP_ID=front
$ consul kv put "envoy_override/$APP_ID/fault/http/abort/abort_percent" 50
$ consul kv put "envoy_override/$APP_ID/fault/http/abort/http_status" 503
```

続いて、front に対してリクエストを投げ続ける。

```
$ while :; do curl -sLI localhost:3000/backend -o /dev/null -w '%{http_code}\n'; sleep 1; done
200
200
200
200
200
500
500
500
200
500
500
500
500
500
200
500
200
200
200
```

500 を返したときの front のログは以下のようになっている。front は backend から 503 が返ってきたため例外を起こし結果的に 500 を返しており、設定の通り Fault Injection できていることが分かる。

```
front_1                    | 2018-09-12 13:49:09 - Net::HTTPFatalError - 503 "Service Unavailable":
front_1                    |    /usr/lib/ruby/2.5.0/net/http/response.rb:122:in `error!'
front_1                    |    /usr/lib/ruby/2.5.0/net/http/response.rb:131:in `value'
(snip)
```

以下のように `abort_percent` を 0 にすると、以降全て 200 が返ってくることを確認した。

```
$ consul kv put "envoy_override/$APP_ID/fault/http/abort/abort_percent" 0
```

## まとめ
簡単なサンプルではあるが、Envoy と consul-template を連携させて Docker コンテナ間通信に対して動的に Fault Injection することができた。Envoy のドキュメントは充実しているが、Fault Injection に関しては公式以外の記事がほとんど見当たらなかったため、試してみた記事を書いた次第。
