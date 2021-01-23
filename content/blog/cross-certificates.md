---
title: "Cross-certificates の整理"
date: 2020-11-12T23:23:15+09:00
slug: "cross-certificates"
draft: false
tags: ["X509", "TLS"]
---

cross-certificates は [https://itkq.jp/blog/2020/06/20/x509-chain/#クロス証明書](https://itkq.jp/blog/2020/06/20/x509-chain/#%E3%82%AF%E3%83%AD%E3%82%B9%E8%A8%BC%E6%98%8E%E6%9B%B8) で触れたが、最近混乱したので整理する。RFC 5280 によれば cross-certificates の定義は次の通りで非常にシンプルである。

> Cross-certificates are CA certificates in which the issuer and subject are different entities. Cross-certificates describe a trust relationship between
the two CAs.

先の記事での署名関係は以下であった。この例では、USERTrust CA が「クロスルート証明書」で、USERTrust CA をトラストアストアに持っていない古いクライアントのために AddTrust CA root が USERTrust を署名し、トラストチェーンを構築できるようにするものだった。互換性を考慮してこうなっている。

<!--more-->

```
[ leaf ] <--- [ intermidiate ] <--- [ USERTrust CA ] <--- [ AddTrust CA root ]
```

一方で、最近 [https://letsencrypt.org/certificates/](https://letsencrypt.org/certificates/) を見たとき、署名は以下の関係であると理解した。

```
[ leaf ] <--- [ Let's Encrypt Authority X3 ] <--- [ DST Root CA X3 ]
                              ^
                              |------------------- [ ISRG Root X1 ]
```

この記事で、Lets' Encrypt Authority X3 は「cross-signed」であると書かれていた。なお、「cross-sign」という用語は RFC には載っていない。Let's Encrypt Authority X3 は 2 つの CA に署名されていることから、cross-certificates なのは間違いなさそうだ。この関係性は正しいのだが、「証明書」単位で書くと以下になる。

```
[ leaf ] <--- [ Let's Encrypt Authority X3 (1) ] <--- [ DST Root CA X3 ]
    ^
    |-------- [ Let's Encrypt Authority X3 (2) ] <--- [ ISRG Root X1 ]
```

**つまり中間証明書は 2 枚ある。**(1) が [https://crt.sh/?id=15706126](https://crt.sh/?id=15706126) で (2) が [https://crt.sh/?id=47997543](https://crt.sh/?id=47997543) である。この 2 つの証明書は同一の Subject Key Identifier を持つ、つまり証明書に同梱された公開鍵は同じことを意味する。中間証明書はトラストストアには入っていないため、サーバーはリーフ証明書と中間証明書の両方をクライアントに返してあげる必要がある。しかしそれぞれの中間証明書にはそれぞれのルート証明書が上位にあるため、USERTrust と AddTrust の例のように、サーバー側の操作なしでクライアントがつくるトラストチェーンが切り替わることはない。cross-certificates は互換性のためにあるものだと理解しているので、ここで混乱した。

---

Let's Encrypt の歴史を振り返って、初期の中間証明書にあたる Let's Encrypt Authority X1 を見てみる。2015-11-12 に DST Root CA X3 が署名した [https://crt.sh/?id=10235198](https://crt.sh/?id=10235198) が発行され、2016-02-08 に ISRG Root X1 が署名した [https://crt.sh/?id=9314792](https://crt.sh/?id=9314792) が発行されている。ISRG Root X1 が主要なルート証明書プログラムを通ったのは [https://letsencrypt.org/2018/08/06/trusted-by-all-major-root-programs.html](https://letsencrypt.org/2018/08/06/trusted-by-all-major-root-programs.html) によれば 2018-07 のことらしい。つまりそれまでは、 ISRG Root X1 が署名した中間証明書ではトラストチェーンが組めないことが普通にあったということである。したがって、ACME クライアントが取得する中間証明書は、これまでずっと DST Root CA X3 が署名したものだったと思われる。すると ISRG Root X1 が署名した中間証明書は、ずっと valid ではあるものの、ISRG Root X1 がトラストストアに入るまでは実質的には無意味だったと思うのだがどうだろう…そういうものなのだろうか。しかしそういうことで、非ルート証明書が cross-certificates となること・その意義も理解できた。[https://letsencrypt.org/2019/04/15/transitioning-to-isrg-root.html](https://letsencrypt.org/2019/04/15/transitioning-to-isrg-root.html) の通り、2020-01-11 からは ACME で得られる中間証明書が ISRG Root X1 由来のものになる。だが古い Android デバイスなどこのトラストチェーンを構築できなくなるクライアントも考慮して、DST Root CA X3 の expiresAt である 2020-09-30 までは、cross-signed な中間証明書を発行できるようにオプションが追加された: [https://github.com/letsencrypt/boulder/pull/4714](https://github.com/letsencrypt/boulder/pull/4714), [https://github.com/certbot/certbot/pull/8080](https://github.com/certbot/certbot/pull/8080) など。Android のことは詳しくないが、[https://letsencrypt.org/2020/11/06/own-two-feet.html](https://letsencrypt.org/2020/11/06/own-two-feet.html) によれば、manufacturer や mobile career はトラストストアのアップデートは自分たちにとって価値あることだと考えておらず、また ISRG としては別の cross-sign も検討したがリスクが大きく断念し、全体のトラフィックのうち 1-5% は最終的に証明書エラーになってもやむなし、とのこと。まあこれは単に仕方ないんじゃないか…と思う。ただし独自のトラストストアを持っていて ISRG Root X1 を信頼している Firefox を使えば証明書の検証に成功するだろう: [https://letsencrypt.org/2016/08/05/le-root-to-be-trusted-by-mozilla.html](https://letsencrypt.org/2016/08/05/le-root-to-be-trusted-by-mozilla.html)

翻って、USERTrust と AddTrust の例を見直してみると、USERTrust はルート証明書であり自己署名しているため、以下のように書き直せる。こうしてみると cross-signed であることがわかりやすい。そして、実際の証明書は、SKI が同一の [https://crt.sh/?id=1199354](https://crt.sh/?id=1199354) と [https://crt.sh/?id=4860286](https://crt.sh/?id=4860286) が存在する。ということで、この記事で取り上げた 2 つの cross-sign は別物ではなく同じである、と理解できた。

```
[ leaf ] <---- [ intermediate ] <--- [ USERTrust CA ]
                                         ^  ^      |
                                         |  |      |
                                         |  --------
                                         |
                                         |
                                     [ AddTrust CA root ]
```

[https://letsencrypt.org/certificates/](https://letsencrypt.org/certificates/) を見直してみると、ISRG Root X1 の後続にあたる ISRG Root X2 は ISRG Root X1 から cross-sign されている。この構図は、すぐ上の図と全く同じである。

# まとめ

- cross-certificates とは、2 つの CA が同じ鍵に対して署名した証明書のこと
- CA から署名された証明書があったとき、その証明書の鍵を別の CA が署名して新たな証明書を発行することを cross-sign と言ったりする
- cross-sign は互換性の問題を緩和する
