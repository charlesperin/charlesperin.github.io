---
title: Research Activities
subtitle: Subtitle
layout: default
permalink: "/research/"
banner: "banner-research.png"
---

<section id="activities-visual">
	<header class="major"><h2>Program Committees And Reviewing</h2></header>
	{% include activities-visual.html %}
</section>


<section>
	<header class="major"><h2>Organizing Committees</h2></header>
	{% assign _data = 'oc' %}
	{% assign _list_subtitle = nil %}
	{% assign _venue_type = nil %}
	{% assign _field_role = true %}
	
	{%include activities-list.html%}
</section>


<section>
	<header class="major"><h2>Workshop and tutorial organization</h2></header>
	{%include workshops-list.html%}
</section>

<section>
	<header class="major"><h2>Other events organization</h2></header>
	{%include events-list.html%}
</section>

<section>
	<header class="major"><h2>Volunteering at conferences</h2></header>
	{% assign _data = 'volunteering' %}
	{% assign _compact = true %}
	{% assign _list_subtitle = nil %}
	{% assign _venue_type = nil %}
	{% assign _field_role = true %}
	
	{%include activities-list.html%}
</section>

<section>
	<header class="major"><h2>Invited Talks</h2></header>
	{% assign activities = site.data["talks"] %}
	{%include simple_activities-list.html%}
</section>

<section>
	<header class="major"><h2>Misc</h2></header>
	{% assign activities = site.data["misc_activities"] %}
	{%include simple_activities-list.html%}
</section>

