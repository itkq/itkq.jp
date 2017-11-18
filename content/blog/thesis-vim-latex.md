+++
date = "2017-11-19T02:51:49+09:00"
description = ""
tags = ["Vim", "LaTeX"]
title = "Vim + LaTeX でいい感じに修論を書く"
slug = "thesis-vim-latex"
draft = false
+++

そろそろ修論を書く季節になった。もちろん Vim と LaTeX で書くつもりだが、ページ数が多くなるとコンパイルに時間がかかって不都合なので、章ごとに分割コンパイルしたいと考えた。
[分割した LaTeX ファイルを subfiles を使ってコンパイルする - Qiita](https://qiita.com/sankichi92/items/1e113fcf6cc045eb64f7) が見つかったが、これまで通り Skim で 1 つのファイルをライブプレビューしたかったので、一時的な .tex ファイルを生成してコンパイルする latexmk のラッパーを書いた。

次のようにセッティングしておく。
```
$ tree -a
.
├── .config
│   └── latexmk.yml
├── header.tex
├── introduction.tex
├── main.tex
└── related_work.tex

1 directory, 5 files

$ cat .config/latexmk.yml
output_file: output.tex
header: header.tex
include_files:
  - introduction.tex
  - related_work.tex

$ cat main.tex
\input{introduction}
\input{related_work}
```

header.tex には `\begin{document}` より上の設定を書く。実際のラッパースクリプトは以下。
.config/latexmk.yml がある場合は、いい感じに `\begin{document}` ... `\end{document}` を生成してコンパイルする。

```rb
#!/usr/bin/env ruby

require 'yaml'

CONFIG_PATH = './.config/latexmk.yml'
LATEXMK_PATH = '/Users/itkq/my_bin/latexmk'

def remove_tex_ext(filename)
  File.basename(filename, ".tex")
end

unless File.exist?(CONFIG_PATH)
  `#{LATEXMK_PATH} #{ARGV.join(" ")}`
  exit $?
end

yaml = YAML.load_file(CONFIG_PATH)
output_file = yaml["output_file"] || "./output.tex"
header = yaml["header"] || "./header.tex"
include_files = yaml["include_files"]

input_file = File.basename(ARGV[0])
exit 0 if input_file == header

includes = if include_files.include?(input_file)
             "\\input{#{remove_tex_ext(input_file)}}"
           else
             include_files.map{|f| "\\input{#{remove_tex_ext(f)}}"}.join("\n")
           end

body = <<EOF
\\begin{document}
#{includes}
\\end{document}
EOF

output = File.read(header) + body
File.write(output_file, output)

`#{LATEXMK_PATH} #{output_file} && #{LATEXMK_PATH} -c`

```

Vim の Quickrun の設定を次のように書く。
```vim
let g:quickrun_config['tex'] = {
\   'exec': '%c %s',
\   'command' : 'latexmk_wrapper',
\}

autocmd BufWritePost *.tex :QuickRun tex
```

Vim で分割された .tex ファイルを開いている場合に `:w` すると、そのファイルの情報だけが PDF 化される。
ファイル間をまたいだ参照は解決されないが、最後に全体を確認すればいいので大した問題にはならないと思う。
これで修論はできたも同然であろう。

<iframe src="https://player.vimeo.com/video/243456055" width="640" height="360" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>
<p><a href="https://vimeo.com/243456055">vim-latex</a> from <a href="https://vimeo.com/user74437848">itkq</a> on <a href="https://vimeo.com">Vimeo</a>.</p>
