#!/bin/bash

hugo
mkdir -p public/revision
git rev-parse HEAD > public/revision/index.html
git add public -f
LANG=C git commit -m "[ci skip] rebuild at $(date)"
git subtree split --branch gh-pages --prefix public
git push -f origin gh-pages:gh-pages
