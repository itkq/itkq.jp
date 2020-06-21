+++
date = "2016-09-04T14:29:25+09:00"
draft = false
title = "最近のVim+LaTeX事情"
slug = "vim-latex"
tags = [ "Vim", "LaTeX" ]
+++

メインで使っているのはMacBookPro Late 2013だが（そろそろ買い換えたい），
MacBookPro Early 2015をバイト先で支給されて自由に使えることになったので，
LaTeX環境を構築しようと思った．  
MacTexをインストールしようと思っていたけど，「それDockerでよくない？」と言われて確かに，となった．  
なぜ今まで気が付かなかったんだろう．

<!--more-->

"texlive docker" で適当に検索をかけると既存のイメージがヒットした．  
[harshjv/texlive-2015 public - Docker Hub](https://hub.docker.com/r/harshjv/texlive-2015/)

これをpullして手持ちの.texをコンパイルしてみると，includegraphicsで
エラーを吐かれて画像が全く出力されなかった．  
どうやらImageMagickあたりが足りていないようだったので，
必要なパッケージを追加インストールするだけのDockerfileを作ってビルドしたらコンパイル通った．  
[GitHub - itkq/docker-texlive2015](https://github.com/itkq/docker-texlive2015)

これまでVimでLaTeXのコンパイルは，Quickrunを使ってlatexmkを呼ぶように設定していた．
そのため，Docker上のlatexmkを呼ぶように設定を変更する．

パスの通った場所に次のスクリプトを作成して実行権限を与える．

~/bin/latexmk
```sh
. ~/bin/docker-latex.sh
init
docker run --rm -v $(pwd):/var/texlive $(get_image_name) latexmk
```
~/bin/docker-latex.sh
```sh
#!/usr/bin/env bash

function get_machine_name() {
  echo dev
}

function get_image_name() {
  echo texlive2015
}

function init() {
  local MACHINE=$(get_machine_name)
  if ! docker-machine ls | grep $MACHINE | grep -q "Running"; then
    docker-machine start $MACHINE
  fi
  docker ps > /dev/null 2>&1
  if [ $? -ne 0 ]; then
    eval $(docker-machine env $MACHINE)
  fi
}
```
.vimrc中のQuickrunの設定を次のように変更する．

```vim
" Quickrun
let g:quickrun_config = {
  \ "_" : {
  \     "runner" : "vimproc",
  \     "runner/vimproc/updatetime" : 40,
  \     'outputter' : 'error',
  \   }
  \ }
let g:quickrun_config["latexmk"] = {
  \ "command"   : "latexmk",
  \ "outputter/error/error" : "quickfix",
  \ "exec"      : "%c",
  \ }
autocmd BufWritePost *.tex :QuickRun latexmk
```
これでローカルの.texファイルを保存する度にDocker上でlatexmkが走るようになった．  
Skimで自動更新プレビューしておくとさらに便利．また，Vim-LaTeXを導入して次の設定をしておくと，\lvでSkimを立ち上げることができる．

```vim
let g:Tex_DefaultTargetFormat = 'pdf'
let g:Tex_ViewRule_pdf = 'open -ga /Applications/Skim.app'
```
