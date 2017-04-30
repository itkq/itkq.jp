+++
date = "2016-04-04T02:20:25+09:00"
draft = false
title = "実用Git 読んだ"
author = "itkq"
tags = [ "Reading", "Git" ]
+++


[実用Git](http://www.amazon.co.jp/%E5%AE%9F%E7%94%A8Git-Jon-Loeliger/dp/4873114403)

最近自分の Git に対する知識の無さを感じてきたので本を読もうと思っていたら、ちょうど借りる機会があったのでまとめた。Git コマンドの操作をより自信を持って行えるようになった気がする。

***

# Git の基本的な概念
Git リポジトリは、作業ディレクトリと `.git` ディレクトリから成る。

`git init` により生成される **Git リポジトリ** (`.git` ディレクトリ) には、リビジョンと履歴の情報がすべて詰まっている。Git リポジトリが保持するデータ構造は、**オブジェクト格納領域**と**インデックス**の2つ。

## Git オブジェクト
Git オブジェクト格納領域は、オブジェクトの内容に SHA1 を適用して得られたハッシュ値から生成されるユニークな **オブジェクト ID** (名前) をもつ。
オブジェクト格納領域 (`.git/objects`) に配置される Git オブジェクトは、次の4種類である。

- **blob**  
  ファイルの各バージョンは blob (_binary large object_) で表される。blob にはファイルのデータのみが含まれており、メタデータやファイル名は含まれていない。
Git はファイル名を気にしないため、同じ内容のファイルが複数あっても、それは1つの blob で表される。

- **tree**  
  tree オブジェクトは、1階層分のディレクトリ情報を表現する。
  tree は blob のオブジェクトID とパス名を持っている。
コミットが指す tree オブジェクトの ID さえ分かれば、再帰的に子の tree  を辿ることで、そのコミットの状態のファイルをすべて取り出せる。

- **commit**  
コミットオブジェクトは、リポジトリに加えられた変更のメタデータを持つ。
  - tree の名前
  - 新しいバージョンの作成者 (_author_)
  - 作成された時間
  - 新しいバージョンをリポジトリに置いた人 (_comitter_)
  - リビジョンを作った理由の説明 (_commit message_)
  
  ルートコミット（最初のコミット）以外は1つ以上の親コミットIDをもつ。

  
- **tag**  
特定のオブジェクトに対して、名前をつけるためのオブジェクト。
タグには**軽量タグ** (_lightweight tag_) と **注釈付きタグ** (_annotated tag_) の2種類がある。
軽量タグは、単にコミットオブジェクトを指すもので、永続的なオブジェクトは生成しない。対して注釈付きタグはオブジェクトを生成する。タグの正体は、後述するシンボリック参照である。

`.git/objects/` にオブジェクトを格納する際、オブジェクトID の先頭2文字のディレクトリを作成し、その下にそれ以降のIDを名前とした実際のオブジェクトを配置する（ファイルシステムの効率化）。
オブジェクト格納領域が大きくなると、Git はオブジェクトを圧縮して**パックファイル**を作成し `.git/objects/pack/` 以下に置く。

次のような操作をしたとする。

```sh
$ mkdir hoge && cd hoge
$ git init
$ echo 'Hello, World!' > hello.txt
$ git commit -am 'first hello'
$ git tag -a v1.0 -m 'version 1.0' master # masterブランチの先頭を指す注釈付きタグ
```

オブジェクトの詳細を調べる。
```sh
$ git rev-parse master # master (branch) が指すコミットの名前
cca3c27176c5539148cb0662a61e475d90a3bc78  

$ git cat-file -p cca3c27176c5539148cb0662a61e475d90a3bc78 # commit の内容
tree bc225ea23f53f06c0c5bd3ba2be85c2120d68417
author itkq <kuogsi@gmail.com> 1458492347 +0900
committer itkq <kuogsi@gmail.com> 1458492347 +0900

first hello

$ git cat-file -p bc225ea23f53f06c0c5bd3ba2be85c2120d68417 # tree の内容
100644 blob 8ab686eafeb1f44702738c8b0f24f2567c36da6d    hello.txt

$ git cat-file -p 8ab686eafeb1f44702738c8b0f24f2567c36da6d # blob の内容
Hello, World!

$ git rev-parse v1.0 # v1.0 (tag) が指すコミットの名前
0aba706179c7e6cf682be3378460ca824c11f775

$ git cat-file -p 0aba706179c7e6cf682be3378460ca824c11f775 # tag の内容
object cca3c27176c5539148cb0662a61e475d90a3bc78
type commit
tag v1.0
tagger itkq <kuogsi@gmail.com> 1458492759 +0900

version 1.0

$ find .git/objects
.git/objects
.git/objects/0a
.git/objects/0a/ba706179c7e6cf682be3378460ca824c11f775
.git/objects/8a
.git/objects/8a/b686eafeb1f44702738c8b0f24f2567c36da6d
.git/objects/bc
.git/objects/bc/225ea23f53f06c0c5bd3ba2be85c2120d68417
.git/objects/cc
.git/objects/cc/a3c27176c5539148cb0662a61e475d90a3bc78
.git/objects/info
.git/objects/pack


```

## インデックス

インデックスは、リポジトリ全体のディレクトリ構造が記述されたバイナリファイルであり、段階的開発とコミットの分離をするための機能である。
インデックスの導入により、ファイルは3種類に分けられる。

- **追跡** (_tracked_)  
  すでにリポジトリに入っているか、インデックスに登録されているファイル

- **無視** (_ignored_)  
  `.gitignore` によって明示的に宣言した Git で扱わないファイル

- **未追跡** (_untracked_)  
  追跡でも無視でもないファイル

無視でないファイルは、`git add` コマンドによってオブジェクト格納領域にコピーされ、格納により生じる SHA1 名によってインデックスが作成される。この操作を**ステージする** (_stage_) という。 
インデックスは仮想的な tree オブジェクトである。

```sh
$ touch data
$ git status
On branch master

Initial commit

Untracked files:
  (use "git add <file>..." to include in what will be committed)

        data

nothing added to commit but untracked files present (use "git add" to track)

$ git add data
$ git status
On branch master

Initial commit

Changes to be committed:
  (use "git rm --cached <file>..." to unstage)

        new file:   data


$ git ls-files --stage # インデックスの内容
100644 e69de29bb2d1d6434b8b29ae775ad8c2e48c5391 0       data
```

ステージされたファイルは、`git commit` コマンドで commit オブジェクトと tree オブジェクトの作成により Git に記録される。

ファイルを削除する操作は3つある。インデックスからファイルを削除する操作をアンステージという。
- `git rm` : インデックスと作業ディレクトリから削除（ `rm` + `git add` )
- `git rm --cached` : インデックスからのみ削除
- `rm` : 作業ディレクトリからのみ削除


# ブランチ

ブランチは、ソフトウェア開発において別の開発ラインを立ち上げるための基本的な方法である。
Git では、1つのリポジトリの内部に複数のブランチを作ることができる。

## 参照
**参照** (_ref_) とは、Git のオブジェクト格納領域内でオブジェクトを参照する SHA1 ハッシュ値であり、**シンボリック参照** (_symref_) は、Git オブジェクトを間接的に指す名前である。
シンボリック参照は、`refs/` で始まる名前で、 `refs/head/[ref]/` (ローカルブランチ)、`refs/remotes/[ref]/` (リモート追跡ブランチ)、`refs/tags/[ref]` (タグ) の3種類がある。

Git が管理する特殊なシンボリック参照

- `HEAD`  
  カレントブランチの最新のコミットを指す

- `ORIG_HEAD`  
  マージやリセットの操作で `HEAD` が更新される前のバックアップ

- `MERGE_HEAD`  
  マージにおいてマージ元のブランチの先頭を指す

- `FETCH_HEAD`  
  `git fetch` コマンドでフェッチしたブランチの先頭が記録されている

ブランチの正体は、commit オブジェクトへのシンボリック参照である。ローカルブランチ `master` は、`refs/heads/master` の短縮形である。

```sh
$ git rev-parse master
cca3c27176c5539148cb0662a61e475d90a3bc78

$ git rev-parse refs/heads/master
cca3c27176c5539148cb0662a61e475d90a3bc78

$ git cat-file -p cca3c27176c5539148cb0662a61e475d90a3bc78
tree bc225ea23f53f06c0c5bd3ba2be85c2120d68417
author itkq <kuogsi@gmail.com> 1458492347 +0900
committer itkq <kuogsi@gmail.com> 1458492347 +0900

first hello
```

## ブランチの作成
リポジトリ内に作成するブランチを、**トピックブランチ**や**開発ブランチ**と呼ぶ。
`git branch [name] [starting-commit]` コマンドで、カレントブランチの `starting-commit` から分岐するブランチを作成できる。`starting-commit` が指定されない場合は `HEAD` を使用する。



## チェックアウト
他のブランチの状態をリポジトリに反映する操作を**チェックアウト**という。
`git checkout [branch]` によって、対象のブランチの tree と同じ状態になるようにオブジェクト格納領域のオブジェクトを作業ディレクトリに反映する。
ブランチの先頭にチェックアウトすることが普通であるが、チェックアウトは任意のコミットに対して実行できる。その場合、Git は切り離されたブランチ (_detached branch_) という無名のブランチを作成する。

# コミット

Git では、リポジトリの変更を記録するためにコミットを使う。

## `git commit`
次のように動作する。

1. インデックスを本物のツリーオブジェクトに変換し、対応する SHA1 名でオブジェクト格納領域に配置する。
2. コミットオブジェクトを作成する。配置したツリーオブジェクトと直前のコミットを親として指す。
3. ブランチの参照が新規のコミットオブジェクトに移り、`HEAD` となる。

## コミットの参照
あるコミット `C` に対して `C^n` は第nの親を、`C~n` はn番目の祖先を意味する。
チルダによる参照は、親が複数あるときは常に第一の親を辿る。

## コミット関連のコマンド

### `git reset`
`git reset` コマンドは、リポジトリと作業ディレクトリを既知の状態に変更する。厳密には、`HEAD` の参照を指定されたコミットに変更する。3つの段階的なオプションがある。
`--hard` オプションは唯一作業ディレクトリの変更を破棄する。

- `git reset --soft [commit]`  
  `HEAD` の参照を指定されたコミットに変更する

- `git reset --mixed [commit]`  
  `HEAD` の変更に加え、インデックスもコミットのツリーの内容に変更する

- `git reset --hard [commit]`  
  `HEAD` とインデックスの変更に加え、作業ディレクトリもコミットのツリーの内容に変更する

`git reflog` コマンドでリポジトリ内の変更履歴を表示できる。

```sh
$ git reflog
794eec4 HEAD@{0}: commit (merge): Merge branch 'alternate'
a43a771 HEAD@{1}: checkout: moving from alternate to master
a861233 HEAD@{2}: commit: Add alternate line 5 and 6
ea825d6 HEAD@{3}: checkout: moving from master to alternate
a43a771 HEAD@{4}: commit: Add line 5 and 6
6bb76eb HEAD@{5}: checkout: moving from master to master
6bb76eb HEAD@{6}: merge alternate: Merge made by the 'recursive' strategy.
f554bac HEAD@{7}: checkout: moving from alternate to master
ea825d6 HEAD@{8}: commit: Add alternate line 4
cc92869 HEAD@{9}: checkout: moving from master to alternate
f554bac HEAD@{10}: commit: Another file
cc92869 HEAD@{11}: commit (initial): Initial 3 line file
```

`git checkout` が ブランチを切り替えて `HEAD` を変更するのに対し、`git reset` は ブランチを変更せずに `HEAD` を変更する。

### `git cherry-pick`
`git cherry-pick [commit]` コマンドは、指定したコミットが持ち込んだ変更をカレントブランチに適用する。その際、新しくコミットを作る。


### `git revert`
`git revert [commit]` コマンドは、指定したコミットの逆を適用するコミットを作成する。

### `git commit --amend`
カレントブランチの最新のコミットを修正するためのコマンドであるが、実質的には
```sh
$ git reset --soft HEAD^
$ git commit
```
と同じである。

# マージ
マージ (_merge_) は、2つ以上のブランチを統合する。

## 通常 (recursive) マージの例
```sh
$ git init
Initialized empty Git repository in /Users/itkq/tmp/fuga/.git/

$ cat > file
Line 1 stuff
Line 2 stuff
Line 3 stuff
^D

$ git add file && git commit -m "Initial 3 line file"
[master (root-commit) cc92869] Initial 3 line file
 1 file changed, 3 insertions(+)
 create mode 100644 file

$ cat > other_file
Here is stuff on another file!
^D

$ git add other_file && git commit -m "Another file"
[master f554bac] Another file
 1 file changed, 1 insertion(+)
 create mode 100644 other_file

$ git checkout -b alternate master^
Switched to a new branch 'alternate'

$ git show-branch
* [alternate] Initial 3 line file
 ! [master] Another file
--
 + [master] Another file
*+ [alternate] Initial 3 line file

$ cat >> file
Line 4 alternate stuff
^D

$ git commit -am "Add alternate line 4"
[alternate ea825d6] Add alternate line 4
 1 file changed, 1 insertion(+)

$ git checkout master
Switched to branch 'master'

$ git merge alternate
Merge made by the 'recursive' strategy.
 file | 1 +
 1 file changed, 1 insertion(+)

$ git log --graph --pretty=oneline --abbrev-commit
*   6bb76eb Merge branch 'alternate'
|\
| * ea825d6 Add alternate line 4
* | f554bac Another file
|/
* cc92869 Initial 3 line file
```

## 競合を伴うマージの例
```sh
$ git checkout master
Already on 'master'

$ cat >> file
Line 5 stuff
Line 6 stuff
^D

$ git commit -am "Add line 5 and 6"
[master a43a771] Add line 5 and 6
 1 file changed, 2 insertions(+)

$ git checkout alternate
Switched to branch 'alternate'

$ git show-branch
* [alternate] Add alternate line 4
 ! [master] Add line 5 and 6
--
 + [master] Add line 5 and 6
*+ [alternate] Add alternate line 4

$ cat >> file                                        
Line 5 alternate stuff
Line 6 alternate stuff

$ cat file
Line 1 stuff
Line 2 stuff
Line 3 stuff
Line 4 alternate stuff
Line 5 alternate stuff
Line 6 alternate stuff

$ git commit -am "Add alternate line 5 and 6"
[alternate a861233] Add alternate line 5 and 6
 1 file changed, 2 insertions(+)
 
$ git show-branch
* [alternate] Add alternate line 5 and 6
 ! [master] Add line 5 and 6
--
*  [alternate] Add alternate line 5 and 6
 + [master] Add line 5 and 6
*+ [alternate^] Add alternate line 4

$ git checkout master
Switched to branch 'master'

$ git merge alternate # conflict!
Auto-merging file
CONFLICT (content): Merge conflict in file
Automatic merge failed; fix conflicts and then commit the result.

$ git diff
diff --cc file
index 4d77dd1,802acf8..0000000
--- a/file
+++ b/file
@@@ -2,5 -2,5 +2,10 @@@ Line 1 stuf
  Line 2 stuff
  Line 3 stuff
  Line 4 alternate stuff
++<<<<<<< HEAD
 +Line 5 stuff
 +Line 6 stuff
++=======
+ Line 5 alternate stuff
+ Line 6 alternate stuff
++>>>>>>> alternate

$ git log --merge --left-right -p
commit > a8612335753608ea80a9a2bfc179706628426616
Author: itkq <kuogsi@gmail.com>
Date:   Mon Mar 21 18:26:13 2016 +0900

    Add alternate line 5 and 6

diff --git a/file b/file
index a29c52b..802acf8 100644
--- a/file
+++ b/file
@@ -2,3 +2,5 @@ Line 1 stuff
 Line 2 stuff
 Line 3 stuff
 Line 4 alternate stuff
+Line 5 alternate stuff
+Line 6 alternate stuff

commit < a43a7710935a7de4219e26183237dc842cbb1b3e
Author: itkq <kuogsi@gmail.com>
Date:   Mon Mar 21 18:25:12 2016 +0900

    Add line 5 and 6

diff --git a/file b/file
index a29c52b..4d77dd1 100644
--- a/file
+++ b/file
@@ -2,3 +2,5 @@ Line 1 stuff
 Line 2 stuff
 Line 3 stuff
 Line 4 alternate stuff
+Line 5 stuff
+Line 6 stuff
```
マージで競合 (_conflict_) が起こった場合、
Git のインデックスは、個々の競合ファイルのコピーを3つ保持している。
マージ基点、our バージョン、their バージョンであり、それぞれステージ番号として 1, 2, 3 が割り振られる。
```sh
$ git ls-files -s
100644 a29c52b5dcff9d445bc1e5ebeedac28e88ce6327 1       file # base of merge
100644 4d77dd1638c289baa16fdcb24c8aa7386ab464ab 2       file # our
100644 802acf861df14fb91823a7ca1cfaf5d8a8100279 3       file # their
100644 eaeeeba5973e46152dc758215c7e76dcecfd5f9b 0       other_file

$ git diff :1:file :3:file # マージ基点とtheirの比較
diff --git a/:1:file b/:3:file
index a29c52b..802acf8 100644
--- a/:1:file
+++ b/:3:file
@@ -2,3 +2,5 @@ Line 1 stuff
 Line 2 stuff
 Line 3 stuff
 Line 4 alternate stuff
+Line 5 alternate stuff
+Line 6 alternate stuff
```

`git checkout` の引数として `--ours` と `--theirs` を使うことで、競合マージのどちらかからファイルをチェックアウトできる。

```sh
$ git checkout --theirs file

$ git diff --ours
* Unmerged path file
diff --git a/file b/file
index 4d77dd1..802acf8 100644
--- a/file
+++ b/file
@@ -2,5 +2,5 @@ Line 1 stuff
 Line 2 stuff
 Line 3 stuff
 Line 4 alternate stuff
-Line 5 stuff
-Line 6 stuff
+Line 5 alternate stuff
+Line 6 alternate stuff
```

競合を解決したら、ファイルをステージし、マージコミットを作成する。

```sh
$ git add file
$ git commit

#### launch editor
Merge branch 'alternate'

# Conflicts:
#	file
#
# It looks like you may be committing a merge.
# If this is not correct, please remove the file
#	.git/MERGE_HEAD
# and try again.


# Please enter the commit message for your changes. Lines starting
# with '#' will be ignored, and an empty message aborts the commit.
# On branch master
# All conflicts fixed but you are still merging.
#
# Changes to be committed:
#	modified:   file
#

#### editor

[master 794eec4] Merge branch 'alternate'

$ git show-branch
! [alternate] Add alternate line 5 and 6
 * [master] Merge branch 'alternate'
--
 - [master] Merge branch 'alternate'
+* [alternate] Add alternate line 5 and 6
```

マージ操作を開始したものの、マージをやめたくなった場合は
```sh
$ git reset --hard HEAD
```
で作業ツリーとインデックスをマージ前の状態に戻せる。
マージの完了後にマージを破棄したい場合は
```sh
$ git reset --hard ORIG_HEAD
```
とする。

## マージ戦略
Git の開発者は、マージを一般化し、様々なシナリオを扱える、**マージ戦略**を導入した。

### 縮退マージ
2つのシナリオがある。どちらのシナリオも、実際には新しいマージコミットを作らない。

- _already up-to-date_  
  他のブランチ (の `HEAD` ) からのコミットがすべて対象ブランチに含まれている場合。操作は何も行わない。

- _fast-forward_  
  対象ブランチの `HEAD` がすでに他のブランチ上にすべて存在している場合。単に `HEAD` に他のコミットを付け足し、`HEAD` を最新のコミットに移動させるだけである。

### 通常マージ
マージの結果としてコミットを作り出し、カレントブランチに追加する。
マージ基点が複数ある場合、そのマージは**交差マージ** (_criss-cross merge_) という。

- _resolve_  
  2つのブランチのみを扱う。共通の祖先をマージ基点とし、マージ基点から他のブランチの先端までの変更をカレントブランチに適用することで、直接 3way マージを実行する直感的な戦略。
- _recursive_  
  _resolve_ 同様に、2つのブランチのみ扱う。2つのマージ基点から一時的なマージ基点を生成し、それをマージに用いる。この方法は再帰的に適用できる。`git merge` コマンドのデフォルトは _recursive_ 戦略を用いる。

- _octopus_  
  2つ以上のブランチを同時にマージする戦略。内部的には _recursive_ 戦略を複数回呼び出している。

# リベース
`git rebase` コマンドは、一連のコミットの基点を変更する際に使う。
一般的な用途は、ローカルの一連のコミットを、追跡ブランチの最新の状態に合わせるというものである。
一連のコミットをブランチの先頭へリベースすることは、2つのブランチのマージに似ているが、リベースでは、Git は完全に新しいコミットを作成する。また、リベースによって元ブランチの開発履歴が線形化されるため、リベースしたいブランチ上のコミットをすでに公開している場合は、リベースは適さない。

# リポジトリ

## Git リポジトリの概念
Git のリポジトリは2種類ある。
  
- **ベア** (_bare_) リポジトリ  
  作業ディレクトリを持たず、通常の開発には使用されない。チェックアウトされたブランチの概念もない。

- **開発**リポジトリ  
  ベアでない (_non-bare_) リポジトリで、通常の開発に使用される。カレントブランチの概念を持ち、作業ディレクトリ内における、現在のブランチのチェックアウトされたコピーを提供する。

## リモート
現在作業中のリポジトリを**ローカルリポジトリ**、ファイルを交換する相手のリポジトリを**リモートリポジトリ**という。

### refspec
refspec は、リモートリポジトリ中のブランチ名を、ローカルリポジトリ中のブランチ名に対応付ける。refspec は、ローカルリポジトリ、リモートリポジトリのブランチを同時に指定することが必要なので、完全なブランチ名を使用する。

refspec の構文は次の通りである。
```sh
[+]source:destination
```

オプションとして、先頭に `+` をつけると転送中に fast-forward による安全チェックが実行されない。

### クローン
`git clone` によるクローンでは、元リポジトリの `refs/heads/` の格納されているローカルブランチは、新しいクローンの `refs/remotes/` 以下のリモート追跡ブランチとなる。
Git はまた、デフォルトの fetch refspec を使って `origin` リモートを設定する。
```sh
fetch = +refs/heads/*:refs/remotes/origin/*
```

### リモートリポジトリを参照するコマンド
- `git fetch`  
  リモートリポジトリからオブジェクトとそれに関連したメタデータを取得

- `git pull`  
  `git fetch` に加えて対応するブランチに変更をマージする

- `git push`  
  オブジェクトとそれに関連したメタデータをリモートリポジトリに転送

- `git ls-remote`  
  リモート内の参照を表示


# その他

## `git diff`
- `git diff`  
  作業ディレクトリとインデックスの差異

- `git diff [commit]`  
  作業ディレクトリと commit の差異

- `git diff --cached [commit]`  
  インデックスにステージされた変更と commit の差異

- `git diff [commit1] [commit2]`  
  2つの commit の差異

## `git bisect`
2分探索によってコミットを特定するコマンド。


