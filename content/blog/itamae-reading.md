+++
draft = false
date = "2017-03-19T19:25:53+09:00"
title = "itamae コードリーディング"
slug = "itamae-reading"
tags = [ "Itamae", "Reading" ]

+++

元々は NeoVim を導入しようとしていた．その一環で，dotfiles を良い感じにしようとしていて，mitamae によるプロビジョニング設定の [k0kubun/dotfiles](https://github.com/k0kubun/dotfiles) から fork したものを整理していた．NeoBundle の NeoVim 対応版である dein.vim を導入する際，curl が必要だった．itamae の Resource ドキュメントを読むと，`http_request` というリソースがあった．これ使えば Docker の ADDコマンド的なことできるのかなと思ったけど詳細が書いてなくて，そういえば itamae 自体どうやって動いてるんだと気になったので読むことにした．

[itamae-kitchen/itamae/](https://github.com/itamae-kitchen/itamae/)

<!--more-->

# Code reading

## bin/itamae
`Itamae::CLI.start` を呼ぶ．

## lib/itamae/cli.rb
`Itamae::CLI` は CLI gem `Thor` を継承している．
実行環境 (backend_type) は3つあり，local, ssh, docker である．必要としていて，かつ他より単純そうな local を続けて読む．


```ruby
  def local(*recipe_files)
    if recipe_files.empty?
      raise "Please specify recipe files."
    end

    run(recipe_files, :local, options)
  end
```

```ruby
  def run(recipe_files, backend_type, options)
    runner = Runner.run(recipe_files, backend_type, options)
    if options[:detailed_exitcode] && runner.diff?
      exit 2
    end
  end
```

## lib/itamae/runner.rb (1)
抽象実行環境のクラス `Itamae::Backend` を new している．
```ruby
class Runner
  class << self
    def run(recipe_files, backend_type, options)
      Itamae.logger.info "Starting Itamae..."
      
      backend = Backend.create(backend_type, options)
      runner = self.new(backend, options)
      runner.load_recipes(recipe_files)
      runner.run

      runner
    end
  end
```

## lib/itamae/backend.rb
itamae は serverspec のための抽象フレームワークである [mizzy/specinfra](https://github.com/mizzy/specinfra) に依存している．local の場合，基本的には `/bin/sh` を起動して良い感じにコマンド実行して出力を
得る動作だと思う．
```ruby
  def create_specinfra_backend
    Specinfra::Backend::Exec.new(
      shell: @options[:shell],
    )
  end
```

## lib/itamae/runner.rb (2)
```ruby
  def initialize(backend, options)
    @backend = backend
    @options = options

    prepare_handler

    @node = create_node
    @tmpdir = "/tmp/itamae_tmp"
    @children = RecipeChildren.new
    @diff = false
    
    @backend.run_command(["mkdir", "-p", @tmpdir])
    @backend.run_command(["chmod", "777", @tmpdir])
  end
```
`/tmp/itamae_tmp` を `777` で作成する．その後レシピのロード．
`path` が名前空間なら gem, そうでなければ ファイルパスを `Itamae::Recipe.new` に渡す．

```ruby
  def load_recipes(paths)
    paths.each do |path|
      expanded_path = File.expand_path(path)
      if path.include?('::')
        gem_path = Recipe.find_recipe_in_gem(path)
        expanded_path = gem_path if gem_path
      end

      recipe = Recipe.new(self, expanded_path)
      children << recipe
      recipe.load
    end
  end
```

## lib/itamae/recipe.rb (1)
```ruby
 def initialize(runner, path)
    @runner = runner
    @path = path
    @delayed_notifications = []
    @children = RecipeChildren.new
  end
```

```ruby
  def load(vars = {})
    context = EvalContext.new(self, vars)
    context.instance_eval(File.read(path), path, 1)
  end
```
`EvalContext` が登場する．`BasicObject#instance_eval` は，Rubyコードの文字列と，レシーバのコンテキストを含むブロックを評価する．このメソッドにより，レシピファイルの内容を1行目から評価していく．

### EvalContext
`Basic#respond_to_missing?` は `BasicObject#method_missing` で反応するメソッドを定義．
```ruby
    class EvalContext
      def initialize(recipe, vars)
        @recipe = recipe

        vars.each do |k, v|
          define_singleton_method(k) { v }
        end
      end

      def respond_to_missing?(method, include_private = false)
        Resource.get_resource_class(method)
        true
      rescue NameError
        false
      end
```
`[resource] do ... end` のための `BasicObject#method_missing`．
```ruby
      def method_missing(*args, &block)
        super unless args.size == 2

        method, name = args
        begin
          klass = Resource.get_resource_class(method)
        rescue NameError
          super
        end

        resource = klass.new(@recipe, name, &block)
        @recipe.children << resource
      end
```
なんで `args.size == 2` なのかと思ったけどリファレンスによると
```ruby
  def method_missing(method_name [, *args [, &block]])
```
で method_name も含まれていたからだった．ちょっとわかりづらかった．
続いて `Itamae::Resource#get_resource_class` が呼ばれる．

## lib/itamae/resource.rb
```ruby
  module Resource
    class << self
      def to_camel_case(str)
        str.split('_').map {|part| part.capitalize}.join
      end

      def get_resource_class(method)
        begin
          self.const_get(to_camel_case(method.to_s))
        rescue NameError
          begin
            ::Itamae::Plugin::Resource.const_get(to_camel_case(method.to_s))
          rescue NameError
            autoload_plugin_resource(method)
          end
        end
      end
```
`Module#const_get` は定数の値を取り出す．メソッドを文字列化してCamelケースに変換してアクセスする．

## lib/itamae/recipe.rb (2)
取得した `Itamae::Resource::` 以下のクラスに，ブロックを渡して new する．
インスタンス変数 `@children` (`RecipeChildren`) に突っ込んでいく．
```ruby
        resource = klass.new(@recipe, name, &block)
        @recipe.children << resource
```

## lib/itamae/recipe_chilren.rb (1)
当然ながら `Array` を継承している．
```ruby
module Itamae
  class RecipeChildren < Array
```

## lib/itamae/runner.rb (3)
レシピをロードした．続いて実行．

```ruby
class Runner
  class << self
    def run(recipe_files, backend_type, options)
      ...
      runner.run

      runner
    end
  end
    
  def run
    if recipe_graph_file = options[:recipe_graph]
      save_dependency_graph(recipe_graph_file)
    end

    children.run
    @backend.finalize

    if profile = options[:profile]
      save_profile(profile)
    end
  end
```

## lib/itamae/recipe_chilren.rb (2)
各リソースについて実行．
```ruby
  class RecipeChildren
    def run
      self.each do |resource|
        resource.run
      end
    end
```

## lib/itamae/resource/base.rb
リソースは `Itamae::Resource::Base` を継承して実装されている．

```ruby
module Itamae
  module Resource
    class Base
      def initialize(recipe, resource_name, &block)
        clear_current_attributes
        @recipe = recipe
        @resource_name = resource_name
        @updated = false

        EvalContext.new(self).tap do |context|
          context.instance_eval(&block) if block
          @attributes = context.attributes
          @notifications = context.notifications
          @subscriptions = context.subscriptions
          @only_if_command = context.only_if_command
          @not_if_command = context.not_if_command
          @verify_commands = context.verify_commands
        end

        process_attributes
      end
```
ここでも `EvalContext` が登場する．`Object#tap` は，レシーバ自身を返すメソッド．良い感じに簡潔に書きたい場合に使うっぽい．
```ruby
      class EvalContext
        ...
        
        def initialize(resource)
          @resource = resource

          @attributes = Hashie::Mash.new
          @notifications = []
          @subscriptions = []
          @verify_commands = []
        end

        def respond_to_missing?(method, include_private = false)
          @resource.class.defined_attributes.has_key?(method) || super
        end

        def method_missing(method, *args, &block)
          if @resource.class.defined_attributes[method]
            if args.size == 1
              return @attributes[method] = args.first
            elsif args.size == 0 && block_given?
              return @attributes[method] = block
            elsif args.size == 0
              return @attributes[method]
            end
          end

          super
        end
```

`Itamae::Resource::Base#defined_attributes` によって，attribute を定義できる．サブクラスからは呼ぶと上書きではなく追加で定義される．

```ruby
      class << self
        attr_reader :defined_attributes

        def define_attribute(name, options)
          current = @defined_attributes[name.to_sym] || {}
          @defined_attributes[name.to_sym] = current.merge(options)
        end
      end
```



```ruby
      def run(specific_action = nil)
        runner.handler.event(:resource, resource_type: resource_type, resource_name: resource_name) do
          Itamae.logger.debug "#{resource_type}[#{resource_name}]"

          Itamae.logger.with_indent_if(Itamae.logger.debug?) do
            if do_not_run_because_of_only_if?
              Itamae.logger.debug "#{resource_type}[#{resource_name}] Execution skipped because of only_if attribute"
              return
            elsif do_not_run_because_of_not_if?
              Itamae.logger.debug "#{resource_type}[#{resource_name}] Execution skipped because of not_if attribute"
              return
            end

            [specific_action || attributes.action].flatten.each do |action|
              run_action(action)
            end

            verify unless runner.dry_run?
            if updated?
              runner.diff_found!
              notify
              runner.handler.event(:resource_updated)
            end
          end

          @updated = false
        end
      rescue Backend::CommandExecutionError
        Itamae.logger.error "#{resource_type}[#{resource_name}] Failed."
        exit 2
      end
```

`Itamae::Runner#handler` は `Itamae::HandlerProxy` のインスタンスである．
Proxy パターンであり，ロギングしているだけ．
実際の処理は `Itamae::Resource::Base#run_action` が行う．

```ruby
      def run_action(action)
        runner.handler.event(:action, action: action) do
          original_attributes = @attributes # preserve and restore later
          @current_action = action

          clear_current_attributes

          Itamae.logger.debug "#{resource_type}[#{resource_name}] action: #{action}"

          return if action == :nothing

          Itamae.logger.with_indent_if(Itamae.logger.debug?) do
            Itamae.logger.debug "(in pre_action)"
            pre_action

            Itamae.logger.debug "(in set_current_attributes)"
            set_current_attributes

            Itamae.logger.debug "(in show_differences)"
            show_differences

            method_name = "action_#{action}"
            if runner.dry_run?
              unless respond_to?(method_name)
                Itamae.logger.error "action #{action.inspect} is unavailable"
              end
            else
              args = [method_name]
              if method(method_name).arity == 1
                # for plugin compatibility
                args << runner.options
              end

              public_send(*args)
            end

            if different?
              updated!
              runner.handler.event(:attribute_changed, from: @current_attributes, to: @attributes)
            end
          end

          @current_action = nil
          @attributes = original_attributes
        end
      end
```      
`method_name = "action_#{action}"` というメソッドを実装してアクションを追加できる．`#pre_action`, `#set_current_attributes` などサブクラスで使えるフックが用意されている．
コマンドの発行は，サブクラスにて `#run_command` を使う．

# http_request リソース
上記を踏まえて，lib/resources/http_request.rb を読んだら，単純に HTTP request を送るもので，HTTP でファイルを取ってくる感じではなかった．`file` リソースにもそんな感じの機能はなかったので，`execute` リソースでやってくださいということだと理解した．


