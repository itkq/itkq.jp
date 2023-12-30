---
title: "OS ほんのちょっとだけ分かるための JOS"
pubDatetime: 2018-04-08T18:27:42+09:00
description: ""
draft: false
tags: ["OS"]
slug: "jos"
---

修論を書き終えたあたりから、春休みに何をするか考えていた。4月からソフトウェアエンジニアとして働き、主にインフラの仕事をする予定だったので、まとまった時間が必要かつ将来役に立ちそうなことを考えた。

ちょうどその頃に turingcomplete.fm を聞いて、OS を学びたい気持ちになった。そうして始めたのが MIT の [6.828: Operating System Engineering](https://pdos.csail.mit.edu/6.828/2017/schedule.html) の授業である。JOS という xv6 ライクな小さい x86 OS のスケルトンが用意されており、必要な部分を実装していくことが課題である。シェルの動作までを完成させた後、最終課題としてパケット送受信かオリジナル機能を実装して終了ということになっている。

<!--more-->

## 選択した理由
30日OS本も検討していて図書館で借りた。書くべきコードはインターネットですべて入手可能だったため、本を眺めてなんとなく分かった気持ちになって終わる予想ができた。とにかく手を動かしたほうが絶対いいという確信があった。一方 JOS は、OS の動作原理を学ぶものなので、ハードウェアに近い部分の実装は与えられ、Operating Systems Engieering の文脈で重要だとされる部分に集中でき、かつ手を動かす必要がある。まさに自分の求めている題材だと感じた。課題にはテストケースが付属しており、実装が正しいかどうかはある程度確認できることも良い。OS を自作したいというより OS を学びたい気持ちが強かった。

## 目的
必要が生じた時に Linux のソースコードの該当部分を探して、その内容を理解できるように OS の知識を体系的に得ること

## 学べたこと
3/31 までに Lab 5 までを終えた時点で挙げた (粒度は雑)。[作業ログ](http://itkq.hatenablog.com/archive/category/JOS)

### x86 OS
#### Lab 1: Booting a PC
- 物理アドレス空間
- real-mode, protected-mode
- kernel 起動までの流れ
	- CPU が起動するとまず BIOS (0xffff0) に jump
	- BIOS は boot sector を (0x7c00 ~ 0x7cff) に読み込み、32-bit protected-mode にスイッチして 0x7c00 に jump して boot loader が起動
	- kernel を 1 page 分読み込み ELF header を検証し、program segment をそれぞれ読み込む
	- ELF header に埋め込まれた entry point をコールして kernel が起動

#### Lab 2: Memory Management
- 物理ページ
- MMU
  - Virtual address, Linear address, Physical address
	- Page Directory, Page Table
- Page Table 管理
	- ページと対応する構造体で参照を管理する
	- Page Directory Entry => Page Table Entry => PageInfo => 物理ページ
- カーネルアドレス空間 (レイアウトは与えられている)

#### Lab 3: User Environments
* User-mode environment, または “process“ の状態表現
* プロセスの仮想アドレス空間のセットアップ
* システムコールの割り込みハンドリング
	* Interrupt Descriptor Table (IDT)
	* セグメント毎の privilege level
	* trapframe の表現方法
* page fault ハンドリング
	* メモリ保護: アドレス範囲と PTE 属性

#### Lab 4: Preemptive Multitasking
* Symmetric Multiprocessing (SMP): 全プロセッサが等価にリソースを触れる
	* Bootstrap Processor (BSP) が他のプロセッサ (Application Processors; APs) を起こす
* それぞれのプロセッサが割り込みコントローラ (LAPIC) を持ち、LAPIC で各プロセッサを判断する
* APs は real-mode で起動するため初期化が必要
* CPU 毎の kernel stack 領域
* big kernel lock (spin lock)
	* spin lock の実体はアトミックに値を交換する命令 `xchg` 
* 素朴な Round-Robin Scheduling の実体 (プロセスの状態遷移)
* Unix-like fork() のためのシステムコール、fork の中身
	* ページマッピングのコピーと`COW`属性、User-level page fault handling による Copy-on-Write
* 再帰的に page fault できるような exception stack を使った仕組み
* Hardware clock interrupts を使った preemptive multitasking
* Inter-Process communication (IPC) のメッセージを送受信するシステムコールによる実装

#### Lab 5: File System, Spawn and Shell
* セクタとブロック
* メタ情報を格納する superblocks
* ファイルに対応するブロックの表現: 直接参照と間接参照によって大容量のファイルも扱うことができる
* JOS ではカーネルにディスクアクセス機能を実装していないので、ユーザーレベルの environment (プロセス) として実装する
	* ディスク割り込みではなくポーリングを使う Programmed I/O (PIO) ベースのアクセス
* 仮想アドレスへのファイルマッピングはデマンドページングによるブロックキャッシュ
* ビットマップでブロックの使用を表現
* サーバークライアントモデルのファイルシステムインターフェース
* “Exokernel” 的な spawn: open して elf を読み込み、fork する。child の trapframe (eip や privilege level ) を設定する
* file descriptor table のアドレス領域は、PTE を共有することで file descriptor を共有する
* シェルプロセスの実装
* I/O redirection, pipe の実装


### プログラミング技術
* C言語のポインタ: スタックやメモリを触った途端に理解できる
* インラインアセンブラ
- アセンブリレベルの calling convention

## 学ばなかった (知らなくても課題は解ける) こと
- ELF フォーマットの詳細
- 必要以外の x86 instructions
- QEMU
- CMOS RAM hardware

## 詳しく知りたくなったこと
- Linux のプロセスとスレッドの実装
- Linux プロセススケジューリングのアルゴリズム
- Linux のファイルシステム
	- パーティションの中身
- x86_64 との差分
- UNIX-style の exec


# 感想
実際に手を動かしていくと、コードとの対応も取れ理解が進むように思えた。学びたい気持ちはあるけど題材がない場合、このような教材を使って無理やり学ぶという選択肢もアリだなと思った。

特にメモリ管理が勉強になった。元々多少は知識があったが、取り組む前と後では理解度が全然違った気がする。
次は Linux のどこか、もしくは xv6 を読んでみようと思う。
