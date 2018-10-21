# charles.perin.github.io

Website available at http://charlesperin.net


## How To

### Compile
- Uncomment "demo" from the exclude list on \_config.yml to generate much faster

incremental
> bundle exec jekyll serve watch --future --incremental

with drafts
> bundle exec jekyll serve watch --future --incremental --drafts

Local server at: http://127.0.0.1:4000/



### Install missing gems
> bundle install

### Deploy website
- Comment the "demo" folder from the exclude list in \_config.yml
- compile with:
> bundle exec jekyll serve watch --future
- copy content of \_site/ repo to github local folder
- push \_site/ content to github repo

### Create redirection
look at demo/dragvispub/index.html

### Add a menu item:
- add label and page in \_data/menu.yml
- create page in "pages"









## Adding content

### Profile info
- edit \_data/aboutme.json

### Short bio
- edit \_includes/short-bio.html

### social links
- edit \_includes/social-links-horizontal.html

### Publication
- create post in \_posts/publications
- add thumbnail in images/publis (400x300)
- add teaser in images/publis
- authors are author aliases in the people.csv file

### Organized workshop
- create post in \_posts/workshops

### Blog post
- create post in \_posts/blog
- images go in images/blog

### Event
- create post in \_posts/events
- thumbnail: in images/events/[alias]/[alias]-thumbnail.png

### News
- create post in \_posts/news
- remove the --incremental option to see the changes happen

### Project with multiple publications
- create post in \_posts/projects
- images go in images/projects/...
- need a teaser image
- add field: project: PROJECT_NAME in publications
- create PROJECT_NAME.md in \_projects
- put the description in the project md file instead of the publication - keep description_short in publication

### Reviewing
- in \_data/reviewing.csv

### Co-authors
- add in \_data/people.csv
- add (square) JPG picture in images/people named [alias].jpg

### Make a publication or project highlighted on home page
- add to the publication or project the property _featured: true_
- Make sure it also has a "description_short: [short description]" property





## Credits
- Built using [Jekyll](https://jekyllrb.com/)
- Design partly based on [Dopetrope by html5up](https://html5up.net/dopetrope)
