---
pubDatetime: 2017-03-15T19:19:27+09:00
description: ""
title: "SQL実践入門 読んだ"
draft: false
slug: "sql-practice"
tags: [ "SQL", "Reading" ]
---


メモです．

# 3章 式の条件分岐
- SQLのパフォーマンスは，テーブルスキャンによる I/O を減らすことが重要．
- 手続き的な `WHERE`, `UNION` による条件分岐，テーブルフルスキャンが複数回行われる．**同テーブル内**では，`SELECT` 句で `CASE WHEN` で条件分岐させるとクエリの可読性，実行計画共に良くなることあるので，考えなしに `UNION` を使うのは危険．
- ただし，インデックスが使える場合は，「`UNION` による複数回のインデックススキャン」と「`OR` または `IN` による1回のフルスキャン」の勝負になり，`UNION` の方が速い場合もある．

<!--more-->

# 4章 集約とカット
`GROUP BY` には「集約」と「カット」の機能がある．「カット」とはパーティションをつくること．ウィンドウ関数の `PARTITION BY` はカットのための機能．

- 最近のオプティマイザは，`GROUP BY` による集約は，指定された列のハッシュ値によってグループ化している．古典的なソートより高速である．
- `GROUP BY` では，ハッシュかソートいずれの場合でも，メモリを多く使用するため，ワーキングメモリを使い切ってしまうこと（TEMP落ち）に注意．
- `SELECT` 句で指定するキーと，`GROUP BY` 句で指定するキーを同じくすることでカットできる．

# 5章 手続きSQL

SQL実行のオーバーヘッド：

1. SQL文のネットワーク伝送  
2. データベースへの接続  
3. _SQL文のパース_  
4. _SQL文の実行計画生成および評価_  
5. 結果セットのネットワーク伝送  

1と5は，同一ネットワーク上であればほぼ無視できる．2はコネクションプールで対応できる．このうち，3と4が支配的である．
ある処理を達成するために，逐次的な「軽いSQL」によるロジックと，一度の「重いSQL」によるロジックがある．

軽いSQLによる問題：

- DBのストレージは普通RAIDで構成され，I/O負荷を分散できるが，軽いSQLは，並列分散による恩恵が受けづらい  
- DBは，重いSQLを高速化するように進化する．軽いSQLは_そもそもチューニングポテンシャルがない_  

一方で軽いSQLの利点：

- 実行計画が安定し，処理時間が相対的に見積もりやすい  
- トランザクション粒度を調整できる

一撃でループ処理をするSQLの書き方：

- ウィンドウ関数と `CASE` 式を使う  
  - `CASE` 式の `WHEN` は短絡評価  
- 隣接リスト的なデータ構造に対しては，Recurvie Union による再帰クエリが有効   

# 6章 結合
結合は3種類：

- cross join：2つのテーブルの直積  
- inner join：cross join の部分集合  
- outer join：cross join に含まれない (NULL) 行を含む

オプティマイザが選択可能な結合アルゴリズムは3種類．ただし，**MySQL は Nested Loops しか使えない**．結合は実行計画が変動しやすいため，そもそも結合を回避することが1つの戦略である．

## Nested Loops
二重ループによる結合．外側のループに対応するものを **driving table (駆動表)** または **outer table (外部表)** と呼び，もう一方を **inner table (内部表)** と呼ぶ．

- 「小さな駆動表」＋「内部表のインデックススキャン」で高速  
- メモリ・ディスク使用量が少ない  
- 非等値結合可能  
- 大規模テーブル同士の結合には不向き  
  - Hash, Sort Merge のいずれかを使う  
  

## Hash
まず小さいテーブルの結合キーのハッシュテーブルをつくる．次に，大きなテーブルに対して結合キーのハッシュ値とハッシュテーブルのマッチングを行う．

- 等値結合不可能  
- メモリ消費量が大きい

## Sort Merge  
二つのテーブルを結合キーでソートし，マッチングを行う．

- 不等号結合可能  
- ソート済みでない限り効率的ではない

`A INNER JOIN B INNER JOIN C` のような「三角結合」の場合，オプティマイザによっては意図しないBとCのクロス結合が行われる場合がある．明示的に冗長なBとCの結合条件を加えることで，これを回避できる．

# 7章 サブクエリ

- サブクエリの位置  
  - テーブル：永続的，データを保持する  
  - ビュー：永続的，データは保持しない（アクセスの度に `SELECT` 文が発行）  
  - サブクエリ：非永続的，データは保持しない（SQL文の度に `SELECT` 文が発行），スコープ限定


- サブクエリは使いやすいが，計算コストが上乗せされ，最適化がされず性能面で問題がある．
- サブクエリと結合はウインドウ関数で代替する
- 結合と集約の操作が必要な場合は，先に集約することで行数を減らせる

# 8, 9, 10章
必要になったらまた読む






