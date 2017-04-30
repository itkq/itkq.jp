#!/bin/bash

hugo -t sustain
git add public
git rev-parse HEAD > public/revision/index.html
LANG=C git commit -m "[ci skip] rebuild at $(date)"
git subtree split --branch gh-pages --prefix public
git push -f origin gh-pages:gh-pages
