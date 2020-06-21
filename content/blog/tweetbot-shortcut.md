+++
date = "2015-12-09T04:08:58+09:00"
draft = false
title = "Tweetbot for Mac のツイート投稿画面でアカウントを切り替えるショートカット"
slug = "tweetbot-shortcut"
tags = [ "Tweetbot" ]
+++

## 経緯
複数アカウントを使う僕にとって重宝している Twitter クライアント「Tweetbot for Mac」だが、1つだけ弱点がある。
それは、ツイート投稿画面 (⌘+N) でアカウントの切り替え方法がマウスによる操作しかないことだ。

<!--more-->

<a href="/img/2015-12-10_12.39.29.png"><img src="/img/2015-12-10_12.39.29.png" width="100%"/></a>

アイコンをクリック、screen\_name を選択クリックの2ステップ必要になる。
折角 Global New Tweet Key を備えていても、マウス操作が必要になってしまう。

ということをぼやいていたら次のような意見を頂いた。

<a href="/img/2015-12-10_12.44.39.png"><img src="/img/2015-12-10_12.44.39.png" width="100%"/></a>

なるほどやってみることにした。

1. Twitter アイコンクリック

2. screen\_name を選択して Enter

をショートカット1つで行う。

## JavaScript for Automation (JXA)
Apple Script という OS X 独自の自動化スクリプトがあるが、Yosemite (OS X 10.10) から JavaScript でも書けるようになったらしい。

[Macのキーボード入力、マウスクリックをJavaScriptで (JXA) - Qiita](http://qiita.com/zakuroishikuro/items/afab0e33ad2030ba2f92) を参考に、Tweetbot のツイート投稿画面の Twitter アイコンの UIElement をクリックしようとしたが、できなかった。
単純なボタンでの実装ではないからだろうか...


## cliclick
マウス操作のエミュレータである cliclick を使うことにした。Homebrew でインストール。
```sh
$ brew install cliclick
```
コマンドラインから、座標を与えることでマウス操作が行える。UIElement は position() で座標が取れるため、JXA と cliclick を組み合わせて自動化の見通しが立った。

## JXA + cliclick
tweetbot-switch-account.sh に実行権限を与えて適当な場所に置く。中身は以下。
```sh
#!/bin/sh
echo "
se = Application('System Events');
tb = se.processes.byName('Tweetbot');
app = Application.currentApplication();
app.includeStandardAdditions = true;
tb.frontmost = true;

[x, y] = tb.uiElements['New Tweet'].uiElements[4].uiElements[0].position().map(function(elem, idx, array){ return Number(elem)  });
x += 25;
y += 25;
now_pos = app.doShellScript('/usr/local/bin/cliclick p:.').split(': ')[1];
app.doShellScript('/usr/local/bin/cliclick c:' + x + ',' + y);
app.doShellScript('/usr/local/bin/cliclick m:' + now_pos);
for (i = 0; i < $1; i++){
  se.keyCode(125); // down arrow
}
se.keyCode(36);  // enter
" | osascript -l JavaScript -
```
アイコンをクリックした後、マウスポインタがアイコンの位置にあり邪魔に見えたため、最初にマウスポインタの位置を記憶しておき、移動させることをしている。引数によって何回下にカーソルを移動するか決めている。

ツイート投稿画面を開いておき、`/path/to/tweetbot-switch-account.sh 2` などと実行すると、他のアカウントが選択できるようになった。

### Karabiner
これをショートカット1つで行うために、Karabiner の private.xml の最後に以下を追加した。
```xml
<item>
    <name>Tweetbot</name>
    <appdef>
        <appname>TWEETBOT</appname>
        <equal>com.tapbots.TweetbotMac</equal>
    </appdef>
    <windownamedef>
        <name>NEW_TWEET</name>
        <regex>New Tweet</regex>
    </windownamedef>
    <vkopenurldef>
        <name>KeyCode::VK_OPEN_URL_SHELL_switch_1</name>
        <url type="shell">
          <![CDATA[ /path/to/tweetbot-switch-account.sh 1 ]]>
        </url>
    </vkopenurldef>
    <vkopenurldef>
        <name>KeyCode::VK_OPEN_URL_SHELL_switch_2</name>
        <url type="shell">
          <![CDATA[ /path/to/tweetbot-switch-account.sh 2 ]]>
        </url>
    </vkopenurldef>
    <vkopenurldef>
        <name>KeyCode::VK_OPEN_URL_SHELL_switch_3</name>
        <url type="shell">
          <![CDATA[ /path/to/tweetbot-switch-account.sh 3 ]]>
        </url>
    </vkopenurldef>

    <item>
        <name>Switch to 1st account</name>
        <identifier>remap.tweetbot_switch_account_1</identifier>
        <only>TWEETBOT</only>
        <windowname_only>NEW_TWEET</windowname_only>
        <autogen>
            __KeyToKey__
            KeyCode::KEY_1, ModifierFlag::COMMAND_L,
            KeyCode::VK_OPEN_URL_SHELL_switch_1
        </autogen>
    </item>
    <item>
        <name>Switch to 2nd account</name>
        <identifier>remap.tweetbot_switch_account_2</identifier>
        <only>TWEETBOT</only>
        <windowname_only>NEW_TWEET</windowname_only>
        <autogen>
            __KeyToKey__
            KeyCode::KEY_2, ModifierFlag::COMMAND_L,
            KeyCode::VK_OPEN_URL_SHELL_switch_2
        </autogen>
    </item>
    <item>
        <name>Switch to 3rd account</name>
        <identifier>remap.tweetbot_switch_account_3</identifier>
        <only>TWEETBOT</only>
        <windowname_only>NEW_TWEET</windowname_only>
        <autogen>
            __KeyToKey__
            KeyCode::KEY_3, ModifierFlag::COMMAND_L,
            KeyCode::VK_OPEN_URL_SHELL_switch_3
        </autogen>
    </item>
</item>
```
「Reload XML」の後、追加された Tweetbot の下の各項目をチェックすることで、
"⌘+[123]" でアカウントを選択できるようになった。

## 最後に
ショートカットつけてくれって Tapbots に要望出したら

> We'll consider this as a feature request :)

と一応返信があったので、いずれ実装されることを期待しておきます。

## 参考
[Macのキーボード入力、マウスクリックをJavaScriptで (JXA) - Qiita](http://qiita.com/zakuroishikuro/items/afab0e33ad2030ba2f92)  
[鳶嶋工房 / AppleScript / JavaScript for Automation (JXA)](http://tonbi.jp/AppleScript/JavaScript/)  
[Introduction to JavaScript for Automation Release Note](https://developer.apple.com/library/mac/releasenotes/InterapplicationCommunication/RN-JavaScriptForAutomation/Articles/Introduction.html)  
[Karabiner の private.xml 設定方法 - Qiita](http://qiita.com/altitude3190/items/bbef986ff8dd288b2641)  
[private.xml Reference Manual](https://pqrs.org/osx/karabiner/xml.html.ja)

