---
date: '2016-05-10 00:00:00 -0500'
layout: blog_post
categories: blog


title: Drag VIS Publications
subtitle: Direct manipulation of ranking tables to explore IEEE VIS publications
thumb: /images/blog/2016_dragvispub-thumb.png
teaser: /images/blog/2016_dragvispub-teaser.png

description_short: Direct manipulation of the IEEE VIS publication dataset.

---

The <a href="http://www.vispubdata.org/site/vispubdata/">Visualization Publication Data Collection</a> provides the most complete dataset about IEEE VIS papers, authors, and citations. It is a nice dataset to showcase the technique we designed with Romain Vuillemot, to directly manipulate table cells for temporal exploration. Simply drag any cell along its trajectory over time to navigate into the rankings of the authors.

This work is based on two publications, co-authored with Romain Vuillemot at CHI 2014 and CHI 2015:




{% assign sorted_pub = site.categories['publications'] | sort: 'date' | reverse %}

{% assign _show_pub_id = false %}
{% assign _show_venue_name = true %}
{% assign _show_acceptance_rate = false %}
{% assign _show_award = false %}

<ul id="pub-ul">
	{% for pub in sorted_pub %}
	
	{% if pub.uid == '2014-04-01-atable' or pub.uid == '2015-04-01-dragtables' %}
		<li class="thumb-list {{currentyear}}">
			{% include publication-generator.html %}
			
		</li>
	{% endif %}
	{% endfor %}
</ul>
















