+++
title = "一見不可解な TLS 証明書失効"
date = "2020-06-20T16:30:52+09:00"
draft = false
slug = "x509-chain"

+++

この記事は、所属する会社の社内ブログに投稿した内容を一部改変したものです。

# 遭遇した事象
Prometheus と https://github.com/prometheus/blackbox_exporter を使って TLS サーバー証明書の有効性と有効期限を網羅的に監視しています。最近 blackbox_exporter が blog.cookpad.dk:443 の証明書の期限が切れている、と報告してきました。しかし同時に blackbox_exporter は TLS 接続には成功している、と報告していたのです。確認のため、Chrome で https://blog.cookpad.dk/ にアクセスしてみると、問題ありませんでした。Firefox でも同様でした。次に手元の MacBook Pro から cURL してみます。

```console
$ curl -v https://blog.cookpad.dk
*   Trying 52.4.145.119...
* TCP_NODELAY set
* Connected to blog.cookpad.dk (52.4.145.119) port 443 (#0)
* ALPN, offering h2
* ALPN, offering http/1.1
* successfully set certificate verify locations:
*   CAfile: /etc/ssl/cert.pem
  CApath: none
* TLSv1.2 (OUT), TLS handshake, Client hello (1):
* TLSv1.2 (IN), TLS handshake, Server hello (2):
* TLSv1.2 (IN), TLS handshake, Certificate (11):
* TLSv1.2 (OUT), TLS alert, certificate expired (557):
* SSL certificate problem: certificate has expired
* Closing connection 0
curl: (60) SSL certificate problem: certificate has expired
More details here: https://curl.haxx.se/docs/sslcerts.html

curl failed to verify the legitimacy of the server and therefore could not
establish a secure connection to it. To learn more about this situation and
how to fix it, please visit the web page mentioned above.
```

証明書失効エラーになりました。ブラウザでは確かに有効な証明書だとされているのに一体どういうことなのか、これを紐解いていく話です。

# TLS サーバー証明書のおさらい
TLS のハンドシェイクは単純化するとだいたい次のことが行われます [^1]。

1. お互い挨拶し、サポートするアルゴリズムを交換してネゴシエーションする
2. サーバーが自分の公開鍵証明書をクライアントに送る
3. クライアントはサーバーの公開鍵証明書を検証する
4. 1 で合意したアルゴリズムを利用して、実際の通信で利用する共通鍵を交換する。このときサーバーの公開鍵を認証する
5. 以降、共通鍵で通信内容を暗号化する

2 で登場する公開鍵証明書 が TLS サーバー証明書のことです。この公開鍵証明書は **X.509** (通常 RFC [^2] で定義された標準) に従っています。X.509 は **PKI** (公開鍵基盤, Public Key Infrastructure) を実現するためのものです。

# PKI
TLS の主な目的は「2 つの通信者間でプライバシーとデータの完全性を提供すること」とされています [^1]。前のセクションで触れた TLS ハンドシェイクでは、通信相手の**認証**・暗号アルゴリズムと鍵のネゴシエーションをします。もし適切に認証が行われなかったとすると、例えば 中間者攻撃と呼ばれる盗聴が成立してしまいます。具体例は [中間者攻撃 - Wikipedia](https://ja.wikipedia.org/wiki/%E4%B8%AD%E9%96%93%E8%80%85%E6%94%BB%E6%92%83#%E5%85%AC%E9%96%8B%E9%8D%B5%E6%9A%97%E5%8F%B7%E3%81%AB%E5%AF%BE%E3%81%97%E3%81%A6%E4%B8%AD%E9%96%93%E8%80%85%E6%94%BB%E6%92%83%E3%81%8C%E6%88%90%E5%8A%9F%E3%81%99%E3%82%8B%E4%BE%8B) が分かりやすいです。この問題を回避するためには、公開鍵とその持ち主の対応関係を保証する仕組みが必要であり、それが PKI です。PKI も [公開鍵基盤 - Wikipedia](https://ja.wikipedia.org/wiki/%E5%85%AC%E9%96%8B%E9%8D%B5%E5%9F%BA%E7%9B%A4) が分かりやすいので引用します。

> PKI は、公開鍵とその持ち主の対応関係を**認証局** (CA、Certification Authority) という第三者機関を用いる事で保証するための技術である。
>
> 各認証局 A は自身の公開鍵 `pk_A`を公開しており、この公開鍵 `pk_A` とそれに対応する秘密鍵を用いる事で、PKI の利用者や団体、他の認証局などの公開鍵 `pk_B` とその所有者名 B の組（とその他必要情報を合わせたもの）に対する署名文 `cert_B` を作成する。この署名文 `cert_B` を公開鍵 `pk_B` の所有者が B であることを保証する**公開鍵証明書** (public key certificate) という。PKI の各利用者 C は自身が最も信頼できると思われる認証局 Z の公開鍵を事前に何らかの方法で入手しておく（方法は後述）。この認証局 Z の公開鍵 `pk_Z` は、PKI における全ての信頼関係の起点となるので、認証局 Z の事を C の**トラストアンカー** (Trust Anchor、**信用点**とも)という。
>
> PKI の利用者 C が別の利用者（もしくは団体、認証局）D の公開鍵 `pk_D` が本当に D のものである事を確認するには、`pk_D` に対する公開鍵証明書 `cert_D` を入手する。次にこの公開鍵証明書 `cert_D` を発行した認証局 E の公開鍵 `pk_E` と `pk_E` に対する公開鍵証明書 `cert_E` とを入手する。以下同様に繰り返し、最後にトラストアンカーの認証局 Z にたどり着き、しかもそれまでに入手した公開鍵証明書が署名文として正当なものであれば公開鍵 `pk_D` を D の公開鍵として受理し、そうでなければ棄却する。

TLS ハンドシェイクでは、通信相手を認証するために X.509 証明書と PKI を利用しています。

# X.509 証明書
PKI はだいたい分かったところで、実際の X.509 証明書を見ていきます。X.509 証明書の中身は次のようになります (一部省略しています)。OpenSSL は X.509 も取り扱える便利なツールキットです。

```console
$ openssl s_client -connect blog.cookpad.dk:443 -showcerts </dev/null 2>/dev/null | openssl x509 -noout -text
Certificate:
    Data:
        Version: 3 (0x2)
        Serial Number:
            d9:f4:f5:4e:b0:e9:af:99:2b:ed:d7:14:fd:c7:d0:be
        Signature Algorithm: sha256WithRSAEncryption
        Issuer: C = GB, ST = Greater Manchester, L = Salford, O = Sectigo Limited, CN = Sectigo RSA Domain Validation Secure Server CA
        Validity
            Not Before: Sep 10 00:00:00 2019 GMT
            Not After : Sep  9 23:59:59 2020 GMT
        Subject: OU = Domain Control Validated, OU = PositiveSSL, CN = blog.cookpad.dk
        Subject Public Key Info:
            Public Key Algorithm: rsaEncryption
                RSA Public-Key: (2048 bit)
                Modulus:
                    00:d1:7d:f7:f4:46:f3:75:b9:fc:6b:f7:8c:67:48:
                    … 67:6b
                Exponent: 65537 (0x10001)
        X509v3 extensions:
            X509v3 Authority Key Identifier:
                keyid:8D:8C:5E:C4:54:AD:8A:E1:77:E9:9B:F9:9B:05:E1:B8:01:8D:61:E1

            X509v3 Subject Key Identifier:
                B1:06:3D:B1:93:7C:DA:11:55:5F:1E:48:8A:4E:3A:DF:CB:5B:A9:4A
            X509v3 Key Usage: critical
                Digital Signature, Key Encipherment
            X509v3 Basic Constraints: critical
                CA:FALSE
            X509v3 Extended Key Usage:
                TLS Web Server Authentication, TLS Web Client Authentication
            X509v3 Certificate Policies:
                Policy: 1.3.6.1.4.1.6449.1.2.2.7
                  CPS: https://sectigo.com/CPS
                Policy: 2.23.140.1.2.1

            Authority Information Access:
                CA Issuers - URI:http://crt.sectigo.com/SectigoRSADomainValidationSecureServerCA.crt
                OCSP - URI:http://ocsp.sectigo.com

            X509v3 Subject Alternative Name:
                DNS:blog.cookpad.dk, DNS:www.blog.cookpad.dk
            CT Precertificate SCTs:
                Signed Certificate Timestamp:
                    Version   : v1 (0x0)
                    Log ID    : B2:1E:05:CC:8B:A2:CD:8A:20:4E:87:66:F9:2B:B9:8A:
                                25:20:67:6B:DA:FA:70:E7:B2:49:53:2D:EF:8B:90:5E
                    Timestamp : Sep 10 15:47:57.313 2019 GMT
                    Extensions: none
                    Signature : ecdsa-with-SHA256
                                30:46:02:21:00:BA:F1:5D:15:F0:4C:80:4C:DC:EA:29:
                                ... A8:A5:55:C1:9C:E3:F0:A7
                Signed Certificate Timestamp:
                    Version   : v1 (0x0)
                    Log ID    : 5E:A7:73:F9:DF:56:C0:E7:B5:36:48:7D:D0:49:E0:32:
                                7A:91:9A:0C:84:A1:12:12:84:18:75:96:81:71:45:58
                    Timestamp : Sep 10 15:47:57.348 2019 GMT
                    Extensions: none
                    Signature : ecdsa-with-SHA256
                                30:44:02:20:11:EC:E0:2A:82:4F:A1:F4:DE:33:9B:80:
                                ... FD:70:4C:B3:EB:14
    Signature Algorithm: sha256WithRSAEncryption
         6e:25:53:ec:f9:6e:ee:18:1b:47:ed:7d:02:02:f3:8c:d9:f6:
         … 0d:17:09:81
```

様々なフィールドがありますが、特に重要なものを説明します。

- Subject: OU = Domain Control Validated, OU = PositiveSSL, CN = blog.cookpad.dk
	- 同梱された公開鍵を持つエンティティ
- Issuer: C = GB, ST = Greater Manchester, L = Salford, O = Sectigo Limited, CN = Sectigo RSA Domain Validation Secure Server CA
	- 署名をしてこの公開鍵証明書を発行したエンティティ
- Validity: Not Before: Sep 10 00:00:00 2019 GMT / Not After : Sep  9 23:59:59 2020 GMT
	- 有効期限
- Authority Key Identifier (AKI):  keyid:8D:8C:5E:C4:54:AD:8A:E1:77:E9:9B:F9:9B:05:E1:B8:01:8D:61:E1
	- 署名に使われた秘密鍵に対応する公開鍵の ID
- Subject Key Identifier (SKI): B1:06:3D:B1:93:7C:DA:11:55:5F:1E:48:8A:4E:3A:DF:CB:5B:A9:4A
	- 同梱された公開鍵の ID

エンティティというのは X.509 用語であり PKI の利用者または CA のことです。この X.509 証明書は、「CN (Common Name): Sectigo RSA Domain Validation Secure Server CA という CA が  CN: blog.cookpad.dk の所有者に対して署名し発行したもの」ということを表します。

# 証明書の階層構造の概要
PKI のセクションで触れた、証明書の検証についての引用部が暗に示しているように、証明書は運用上の理由から階層構造を成します。トラストアンカーの発行する証明書をルート証明書と呼び、これが階層構造 (木構造) のルートになります。ルート証明書は必ず信用できる前提を置くため、OS などのシステムに埋め込まれています (詳細は後述)。信頼されたルート証明書の保存先をトラストストアと呼び、システムは証明書の検証時トラストストアを参照します。したがって信頼されたルート証明書は検証時に手元にありますが、階層構造上のそれ以外の証明書は、検証するシステムに明示的に渡す必要があります。これらの証明書、つまりルート証明書へたどるために必要な証明書のリストを**証明書チェーン** (X.509 用語では Certificate path) といいます。

# blog.cookpad.dk:443 が送出する証明書チェーン
OpenSSL で確認すると、3 つの証明書から成る証明書チェーンであることが分かります。1 つ前のセクションで示した証明書は、このうちの 1 つでした。

```console
$ openssl s_client -connect blog.cookpad.dk:443 -servername blog.cookpad.dk </dev/null 2>/dev/null
CONNECTED(00000006)
---
Certificate chain
 0 s:OU = Domain Control Validated, OU = PositiveSSL, CN = blog.cookpad.dk
   i:C = GB, ST = Greater Manchester, L = Salford, O = Sectigo Limited, CN = Sectigo RSA Domain Validation Secure Server CA
 1 s:C = GB, ST = Greater Manchester, L = Salford, O = Sectigo Limited, CN = Sectigo RSA Domain Validation Secure Server CA
   i:C = US, ST = New Jersey, L = Jersey City, O = The USERTRUST Network, CN = USERTrust RSA Certification Authority
 2 s:C = US, ST = New Jersey, L = Jersey City, O = The USERTRUST Network, CN = USERTrust RSA Certification Authority
   i:C = SE, O = AddTrust AB, OU = AddTrust External TTP Network, CN = AddTrust External CA Root
---
(以降それぞれの証明書が並ぶ)
```

- レベル 0 (リーフ証明書と呼ばれる)
	- Subject: CN=blog.cookpad.dk
	- Issuer: CN=Sectigo RSA Domain Validation Secure Server CA
- レベル 1 (中間証明書と呼ばれる)
	- Subject: CN=Sectigo RSA Domain Validation Secure Server CA
	- Issuer: CN=USERTrust RSA Certification Authority
- レベル 2 (クロス証明書と呼ばれる)
	- Subject: CN=USERTrust RSA Certification Authority
	- Issuer: CN=AddTrust External CA Root

上に挙げた証明書のカテゴリ (と改めてルート証明書) を解説します。

## リーフ証明書
証明書チェーンの (階層構造の) 末端であるため、リーフ証明書と呼ばれます。リーフ証明書は CA 証明書 (認証局証明書)ではないため、別の証明書を署名できません [^3]。一般に Web ブラウジングする上ではサーバー証明書になっているリーフ証明書を利用する機会が多いので、サーバー証明書と言われることが多いです。

## 中間証明書
リーフ証明書を発行する中間 CA が持つ証明書です。公に信頼されるルート CA に基づく証明書チェーンは 3 階層以上になります。もし 2 階層の場合、すべてのリーフ証明書はルート CA が発行することになり、証明書発行を行うにあたり高頻度でルート CA の秘密鍵を使います。これは秘密鍵漏洩のリスクをいたずらに高めている状態です。したがって、ルート CA はオフラインにすることがセキュリティ上の基本要件とされており [^4]、中間 CA が必要になります。中間 CA を置き階層レベルを深くすることで、証明書失効オペレーションの観点でも都合が良くなります [^5]。

## ルート証明書
X.509 では Subject と Issuer が同値で自分自身を署名した証明書のことを自己署名証明書 (self-signed certificate) といいます。自分が自分を署名していることから、署名の検証は必ず成功します。また、俗にオレオレ証明書と呼ばれます。X.509 でトラストアンカーとなるルート CA は、ルート証明書と呼ばれる自己署名証明書を発行します。

Microsoft は、[Microsoft Trusted Root Program](https://docs.microsoft.com/en-us/security/trusted-root/program-requirements) に基づいて信頼するルート証明書を定め、Windows 上の信頼するルート証明書を更新します。同じように Apple には [Apple Root Certificate Program](https://www.apple.com/certificateauthority/ca_program.html) があります。Linux 自体には中央管理のルート証明書プログラムがありません [^6]。

Mozilla Firefox は、[Mozilla Network Security Services (NSS)](http://www.mozilla.org/projects/security/pki/nss/) ライブラリを利用して証明書の検証を行います。このライブラリには [Mozilla Root Store Policy](http://www.mozilla.org/projects/security/certs/policy/) に基づくルート証明書が含まれます。Google Chrome は基本的には OS のトラストストアを参照しますが、一般的な Linux ディストリビューションで動作する場合は Mozilla Root Store のルート証明書を利用します [^7] [^18] [^19]。ただし、これらのブラウザは、ベンダー独自の基準で一部の証明書を BAN することもあります。

これらのルート証明書プログラムは、[CA/B Forum Baseline Requirements](https://cabforum.org/baseline-requirements-documents/) を参照しています。CA/B Forum (The Certification Authority Browser Forum) は CA・ブラウザや OS ベンダーなどを構成メンバーとするボランティア団体で、Web PKI のガイドラインの策定を行っています。Microsoft, Apple, Mozilla, Google などのベンダーはこの団体のメンバーです。

## クロス証明書
ルート CA が別のルート CA に対して発行するものがクロス証明書 (cross-certificate) です。クロスルート証明書とも呼ばれます。クロス証明書が必要になる場面とは、古いクライアントを救いたい場面だと理解しています。トラストストアのアップデートが OS やブラウザに適用されていれば、新しいルート証明書を利用して検証が行われます。

しかし、アップデートを受け取っていないクライアントは新しいルート証明書を信頼していないため、検証に失敗します。そこで、既に広く信頼されている既存のルート証明書から署名してもらいクロス証明書を得ることで、古いクライアントはルート CA までチェーンできるようになります。この場合リーフ証明書 → 中間証明書 → クロス証明書 → ルート証明書 のように 4 階層のチェーンになります。


# blog.cookpad.dk:443 の証明書チェーンの検証
次に blog.cookpad.dk:443 が送ってきた証明書チェーンのそれぞれの SKI, AKI, Validity を見てみます。

- リーフ証明書
	- SKI: B1:06:3D:B1:93:7C:DA:11:55:5F:1E:48:8A:4E:3A:DF:CB:5B:A9:4A
	- AKI: keyid:8D:8C:5E:C4:54:AD:8A:E1:77:E9:9B:F9:9B:05:E1:B8:01:8D:61:E1
	- Validity
- notBefore=Sep 10 00:00:00 2019 GMT
	- notAfter=Sep  9 23:59:59 2020 GMT
- 中間証明書
	- SKI: 8D:8C:5E:C4:54:AD:8A:E1:77:E9:9B:F9:9B:05:E1:B8:01:8D:61:E1
	- AKI: keyid:53:79:BF:5A:AA:2B:4A:CF:54:80:E1:D8:9B:C0:9D:F2:B2:03:66:CB
	- Validity
- notBefore=Nov  2 00:00:00 2018 GMT
	- notAfter=Dec 31 23:59:59 2030 GMT
- クロス証明書
	- SKI: 53:79:BF:5A:AA:2B:4A:CF:54:80:E1:D8:9B:C0:9D:F2:B2:03:66:CB
	- AKI: keyid:AD:BD:98:7A:34:B4:26:F7:FA:C4:26:54:EF:03:BD:E0:24:CB:54:1A
	- Validity
	- notBefore=May 30 10:48:38 2000 GMT
	- **notAfter=May 30 10:48:38 2020 GMT**

クロス証明書が失効しています! ではなぜブラウザは検証に成功したのでしょうか。

証明書チェーンの検証は、基本的にその証明書が有効であるか・上位 CA の公開鍵で署名されているかを確認します。署名した上位証明書を識別するために、基本的に SKI と AKI が使われます。例を挙げると、リーフ証明書を署名した公開鍵の ID は AKI から keyid:8D:8C:5E…8D:61:E1 です。証明書チェーンには SKI が 8D:8C:5E…8D:61:E1 である証明書を見つけることができ、この証明書に同梱された公開鍵でリーフ証明書が署名された、つまり中間証明書であることが分かります。署名の検証に成功すれば、正しい中間証明書だということができます。

ここで重要なことですが、**証明書チェーンは複数構築できる場合があり、そしてそれは PKI の性質上自然なことです。** この文章を書いた時点では、USERTrust RSA Certification Authority の証明書 (SKI: 53:79:BF:5A:AA:2B:4A:CF:54:80:E1:D8:9B:C0:9D:F2:B2:03:66:CB) は 2 つ存在します。

1. 自己署名のルート証明書 (2010 年発行): https://crt.sh/?id=1199354
2. AddTrust External CA root が発行したクロス証明書 (2000 年発行): https://crt.sh/?id=4860286

証明書チェーンを構築するときは、サーバーから送出されたチェーンと、トラストストアのルート証明書を用います。したがって、1 のルート証明書がトラストストアに存在すれば、次の 2 つの証明書チェーンどちらも構築できます。

1. CN=blog.cookpad.dk (リーフ) → CN=Sectigo RSA Domain Validation Secure Server CA (中間) → CN=USERTrust RSA Certification Authority (クロス) → CN=AddTrust External CA root (ルート)
2. CN=blog.cookpad.dk (リーフ) → CN=Sectigo RSA Domain Validation Secure Server CA (中間) → CN=USERTrust RSA Certification Authority (ルート)

いつ 1 のルート証明書が各 OS やブラウザのトラストストアに入ったのかは詳しく追いませんが、NSS のトラストストアには 2014 年に追加されている [^8] [^20] ため、
少なくとも 2015 年以降のシステムのトラストストアには含まれていると言ってよいでしょう (Chrome については EV 証明書対象にするチケットしか見つかりませんでした [^9]。したがって、手元の macOS (Catalina) 上の Chrome や Firefox のブラウザ・cURL は 1 のルート証明書を参照できるはずです。

# cURL が証明書チェーンを検証できなかった理由
手元の macOS の cURL は OpenSSL フォークの LibreSSL を使っており、 LibreSSL v2.8.3 がバンドルされていました。

```console
$ curl -V
curl 7.64.1 (x86_64-apple-darwin19.0) libcurl/7.64.1 (SecureTransport) LibreSSL/2.8.3 zlib/1.2.11 nghttp2/1.39.2
Release-Date: 2019-03-27
Protocols: dict file ftp ftps gopher http https imap imaps ldap ldaps pop3 pop3s rtsp smb smbs smtp smtps telnet tftp
Features: AsynchDNS GSS-API HTTP2 HTTPS-proxy IPv6 Kerberos Largefile libz MultiSSL NTLM NTLM_WB SPNEGO SSL UnixSockets
```

このバージョンの LibreSSL は、有効な証明書チェーンが別に作れる可能性があっても、途中で失効している証明書があった場合は検証を即座に失敗させる実装になっており、証明書切れのエラーになったようです。なお v.3.2.0 では別の証明書チェーンも探す変更が入っており [^10]、たしかに最新の cURL で試してみるとエラーは起きませんでした。

```console
$ /opt/brew/opt/curl/bin/curl -V
curl 7.70.0 (x86_64-apple-darwin19.4.0) libcurl/7.70.0 SecureTransport zlib/1.2.11
Release-Date: 2020-04-29
Protocols: dict file ftp ftps gopher http https imap imaps ldap ldaps pop3 pop3s rtsp smb smbs smtp smtps telnet tftp
Features: AsynchDNS IPv6 Largefile libz NTLM NTLM_WB SSL UnixSockets

$ /opt/brew/opt/curl/bin/curl https://blog.cookpad.dk -v -I
*   Trying 52.1.119.170:443...
* Connected to blog.cookpad.dk (52.1.119.170) port 443 (#0)
* ALPN, offering http/1.1
* TLS 1.2 connection using TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
* Server certificate: blog.cookpad.dk
* Server certificate: Sectigo RSA Domain Validation Secure Server CA
* Server certificate: USERTrust RSA Certification Authority
> HEAD / HTTP/1.1
> Host: blog.cookpad.dk
> User-Agent: curl/7.70.0
> Accept: */*
>
* Mark bundle as not supporting multiuse
< HTTP/1.1 200 OK
HTTP/1.1 200 OK
(snip)
```

OpenSSL でも同様の変更が v1.1.1 で入っているようです [^11]。

# ブラウザが証明書チェーンを検証できた理由
Chrome は SSL/TLS ライブラリとして [BoringSSL](https://www.chromium.org/Home/chromium-security/boringssl) という OpenSSL フォークを使っていますが、調べてみると証明書の検証は Chromium の独自実装が行っているようでした [^12] [^13]。おそらく、後述する libpkix を参考にして実装しており、当初から今回の問題は回避できていたと思われます [^14]。

Firefox の SSL/TLS ライブラリ libpkix は、詳しくは追いませんが、少なくとも現時点での最新のバージョン v3.53.1 で複数の証明書チェーンを組み立てることを確認しました [^15]。

ゆえに Chrome, Firefox では有効な証明書チェーンを組むことができ、安全な Web サイトとして表示できたのです。


# blackbox_exporter が証明書期限切れを報告した理由
blackbox_exporter が報告するメトリクスのうち、証明書期限の監視に使っていた `probe_ssl_earliest_cert_expiry` は、**実際に証明書検証に利用したチェーンではなく、サーバーから送られた証明書チェーンのうち最も短い失効期限を返す**、という実装 [^16] だったため、期限切れを報告していたことが分かりました。

以上で、今回発生した事象の原理はすべて説明できました。

# 学びと対策
blog.cookpad.dk:443 については、期限が切れたクロス証明書をチェーンに含めるのをやめれば、現在の cURL on macOS でも証明書チェーンを検証できるはずです。しかし別のルート証明書から証明書チェーンを組み立てることは可能であり、それが PKI においては自然なことなので、blog.cookpad.dk をホストしている medium.com の落ち度はない…はずです。ただ古い OpenSSL/LibreSSL を使っているクライアントは期限切れと判断し TLS 接続に失敗することは確かです。

blackbox_exporter の `probe_ssl_earliest_cert_expiry` メトリクスは、サーバーから送出された証明書チェーンのみを見ています。blackbox_exporter のメンテナは、メトリクスのセマンティクスとしては正しく、実装を変える気はないと主張しました [^17]。しかし、証明書チェーンが複数構築できる場合でこのメトリクスを使う限り、「有効な証明書チェーンが見つからなくなるのはいつか == TLS 接続で実際いつ証明書期限エラーが起こるのか」の判断には使えません。別のメトリクスとして実装するのはいいんじゃない? という議論の流れになっていましたが、誰も手を付けていなかったので、自分が [PR](https://github.com/prometheus/blackbox_exporter/pull/636) を出し無事マージされました。この変更が入った v0.17.0 がリリースされ、新しいメトリクスを使うように監視を切り替えることができ、やりたかった証明書期限監視ができるようになりました。めでたしめでたし。

# 参考文献
- [Knowledge: Sectigo AddTrust External CA Root Expiring May 30, 2020](https://support.sectigo.com/articles/Knowledge/Sectigo-AddTrust-External-CA-Root-Expiring-May-30-2020)
- [May 30 SSL incident | Algolia Blog](https://blog.algolia.com/may-30-ssl-incident/)

# 謝辞
原因究明やこの文章をまとめるにあたり、同僚の [@sora_h](https://twitter.com/sora_h) にかなり色々助けてもらったので感謝。

---

[^1]: https://tools.ietf.org/html/rfc5246
[^2]: https://tools.ietf.org/html/rfc5280
[^3]: X.509 Basic Constraints の cA boolean の値 false がそれを表します https://tools.ietf.org/html/rfc5280#page-39
[^4]: https://cabforum.org/network-security-requirements/
[^5]: https://en.wikipedia.org/wiki/Offline_root_certificate_authority
[^6]: https://www.chromium.org/Home/chromium-security/root-ca-policy
[^7]: https://tracker.debian.org/pkg/ca-certificates
[^8]: https://bugzilla.mozilla.org/show_bug.cgi?id=1062589
[^9]: https://bugs.chromium.org/p/chromium/issues/detail?id=231900&can=1&q=USERTrust&sort=modified
[^10]: https://ftp.openbsd.org/pub/OpenBSD/LibreSSL/libressl-3.2.0-relnotes.txt
[^11]: https://github.com/openssl/openssl/commit/0930251df814f3993bf2c598761e0c7c6d0d62a2
[^12]: https://source.chromium.org/chromium/chromium/src/+/master:net/socket/ssl_client_socket_impl.cc;l=1146
[^13]: https://crbug.com/410574
[^14]: https://crrev.com/76f636098ccda9f283614545352b4964e7ec2b5c
[^15]: https://searchfox.org/mozilla-central/source/security/nss/lib/libpkix/pkix/top/pkix_build.c
[^16]: https://github.com/prometheus/blackbox_exporter/blob/93a48d8ed8e4f5578ebb39f14b7cc16e9b7cdbf8/prober/tls.go#L21
[^17]: https://github.com/prometheus/blackbox_exporter/issues/340
[^18]: https://docs.fedoraproject.org/en-US/quick-docs/using-shared-system-certificates/
[^19]: https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/8/html/security_hardening/using-shared-system-certificates_security-hardening
[^20]: https://bugzilla.mozilla.org/show_bug.cgi?id=1088147
