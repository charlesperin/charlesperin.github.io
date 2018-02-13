# charles.perin.github.io

Website available at http://charlesperin.net

## Getting started

To install missing gems, run:
> bundle install

To generate deployment version with the demos, in \_config.yml, uncomment folders from the exclude list:
 - demo

Local server at: http://127.0.0.1:4000/

incremental
> bundle exec jekyll serve watch --future --incremental

with drafts
> bundle exec jekyll serve watch --future --incremental --drafts

## to create a project with multiple publications
- add field: project: PROJECT_NAME in publications
- create PROJECT_NAME.md in \_projects
- put the description in the project md file instead of the publication - keep description_short in publication

## redirections
look at demo/dragvispub/index.html

## to add a menu item:
- add label and page in menu.yml
- create page in "pages"

## to deploy
- uncomment the "demo" folder from the exclude list in \_config.yml
- push \_site/ content to github repo

## Credits

- Built using [Jekyll](https://jekyllrb.com/)
- Design partly based on [Dopetrope by html5up](https://html5up.net/dopetrope)
