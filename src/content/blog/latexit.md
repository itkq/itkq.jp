---
pubDatetime: 2016-10-27T22:14:40+09:00
description: ""
draft: false
title: "LaTeXiTのCLIみたいなのを書いた"
tags: [ "LaTeX" ]
slug: "latexit-cli"
---

[ LaTeXiT ]( https://www.chachatelier.fr/latexit/ )というTeX形式の数式を入力するとTeX形式の画像を出力するツールを知った．  
研究発表のスライドを作る場合に，TeX形式の画像を貼り付けたいことがあり，早速インストールした．

<!--more-->

[最近のVim+LaTeX事情](http://blog.itkq.jp/post/vim-latex/) に書いたように，最近はTexLiveのDockerイメージでLaTeX文書をコンパイルしている．  
LaTeXiTのコンパイル設定をカスタマイズすれば対応できると思ったが，うまくいかなかった．
コンパイルスクリプトでは，作業ディレクトリをマウントしてDockerイメージのコンパイルバイナリを走らせている．LaTeXiTが実行するコンパイルコマンドは，一時的に作成した
/var/folders/.../.tex を絶対参照しており，その部分は書き換えようがなかった．

LaTeXiTの動作は，コンパイル後にBounding boxを計算してトリミングして各種画像に変換する感じで作れそうだったのでCLIとして作った．

<script src="https://gist.github.com/itkq/7d12990860ee2d8b9b32a437be278b6a.js"></script>

文字列をクリップボードにコピーする pbcopy は知っていたが，画像をコピーするものはないかと探したところ [impbcopy](https://gist.github.com/beng/806b8420cc16bcf8a07a) があった．
これを利用して，実行するとクリップボード中の文字列に対応するTeX形式の画像をクリップボードにコピーするので，サクッと使える感じになった．

<a href="/public/latexit-demo.gif"><img src="/public/latexit-demo.gif" width="70%"/></a>

本当はPopclipのExtensionとして作りたかったけどうまくいかなかった😇
