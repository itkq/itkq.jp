---
title: 学生枠でISUCON5に参加してみたら運良く予選を突破した
pubDatetime: 2015-10-09T11:25:38+09:00
slug: isucon5-qualifier
draft: false
tags:
  - ISUCON
  - Contest
description: ""
---

もう結構前のことになりますが、ISUCON5 というコンテストに参加しました。  
書くことあんまりないからって書かないでいたらチームメイトから書くように煽られてしまったので書きます。

<!--more-->

## 準備
バイト先の先輩である shiki に誘われて、その友人の [@nemupm](https://twitter.com/nemupm) と僕 [@itkq](https://twitter.com/itkq) の
3人で参加することになった。
チーム名の「アジ・タコ・エンガワ！」は好きな寿司ネタを並べたものという設定で、僕はアジ（本当はタイが一番好きなんですが頭文字が被るのでやめました）。

コンテスト自体はなんとなく聞いたことある程度で、知識も経験もない僕は足手まといにならないか結構不安だった（先輩方は参加経験があった）。

担当は

* インフラ  
    @nemupm

* アプリ  
    shiki @itkq

に決まり、最初に話し合った時に、せっかくだから Golang でいってみようということになり、触ったことがなかった僕は [ Tour of a Go ](https://go-tour-jp.appspot.com/) と [build-web-application-with-golang](https://github.com/astaxie/build-web-application-with-golang) を1週間ちょっとやって、なんとなく読める程度にした。


## 予選
まず MySQL と nginx のログとって Golang 実装のコード読んでどこが重いとか調べて作戦を立ててたら14時ぐらいになってて、ちょっと焦りつつもそこからアプリのチューニングを始めた。unix domain socket を使うとか定番のやつがあまり効かなくて、relations テーブルをメモリに載せる結構大きめな作業にとりかかることにした。  
ダンプしたクエリを ruby で整形して`/initialize`で載せてアプリの SQL を取っ払ったら、スコアが5000ほど一気に伸びて一番盛り上がったし嬉しかった。  
もう少し作業の余地はあったけど、Git 周りでうまくいかなかったり突然 Mac が落ちたりで焦って思ったように動けなくて本当申し訳なかった。

提出スコアが6000台で、終わった後に微妙そうって話をしてたけど、結果は5位でギリギリ本戦に出場できることになった！


## 終わりに
運営のみなさん本当にお疲れさまでした。本戦のほうもよろしくお願いします。

チームの先輩方ありがとうございました。予選は本当だめだめだったので本戦はもっと頑張りたいです。  
あと @nemupm とは本戦で顔合わせなので楽しみです。

予選のリポジトリ: [nemupm/isucon5-qualifier](https://github.com/nemupm/isucon5-qualifier)

以下チームメイトのエントリ:

[ISUCON5予選 学生枠５位だけど突破できた]( http://shiki49.hatenablog.com/entry/2015/09/28/094140 )  
[ISUCON予選を学生枠でギリギリ通過する技術]( http://nemupm.hatenablog.com/entry/2015/09/29/035626 )



