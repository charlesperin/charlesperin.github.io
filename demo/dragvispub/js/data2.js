/*
 Compute ranking data for ALL days and ALL teams

 Returns something like below

 data = [day0,day1,...]
 data[day_i] = [team0,team1,...]
 data[day_i][team_j] = [col0,col1,...]
 data[day_i][team_j][col_k] = value for the column k for team j at day i.

 rankings = [day0,day1,...]
 rankings[day_i] = [col0,col1,...]
 rankings[day_i][col_j] = [team0,team1,...]
 rankings[day_i][col_j][team_k] = rank for team k at day i and for column j

 missing_data = [day0,day1,...]
 missing_data[day_i] = [team0,team1,...]
 missing_data[day_i][team_j] = [col0,col1,...]
  with missing_data[day_i][team_j][coli] = true if missing data for column coli

 */

var DATA_FILES = [
  {type: "foot", name: "france-2009-2010", extension: "json"},
  {type: "foot", name: "france-2010-2011", extension: "json"},
  {type: "foot", name: "france-2011-2012", extension: "json"},
  {type: "foot", name: "france-2012-2013", extension: "json"},
  {type: "nations", name: "nations", extension: "json"},
  {type: "sort", nbElem: 10},
  {type: "citations", name: "IEEE VIS papers 1990-2015", extension: "csv"},
  {type: "economy", name: "country_rankings_hs", extension: "csv"},
  {type: "economy", name: "country_rankings_sitc", extension: "csv"},
  {type: "products", name: "product_rankings", extension: "csv"}
];

var RANK=0, TEAM_ID=1, POINTS_DAY=2;

//var DEFAULT_TABLE = 3;

var MIN_ARTICLES_FOR_CITATIONS = 3;

var COLUMN_LABELS = {
  citations: {
    names: ["Rank","Author","Papers","Citations","Cited","Co-Authors(sum)","Co-Authors(uniq)"/*,"best"*/],//col header names
    titles: ["Rank","Author","Papers","Citations","Cited","Co-Authors(sum)","Co-Authors(uniq)"/*,"best"*/],//col header titles
    //domain:[0,.05,.4,.48,.57,.63,.79,.95,1]//between 0 and 1, custom cell size //WITH BEST
    domain:[0,.05,.4,.48,.58,.65,.82,1]//between 0 and 1, custom cell size
  }
};



tables = {};

tables.init = function(tables_to_init, params, callback){
  this.params = {};
  this.params.data = params.data;
  this.tables = [];
  this.currentTable = undefined;
  var toCheck = Utils.getFalseArray(DATA_FILES);
  var $this = this;
  DATA_FILES.forEach(function(file,i){
    if(tables_to_init.indexOf(i) == -1){//skip tables that are not to init
      toCheck[i] = true;
      if(Utils.checkTrueArray(toCheck)) callback.call();
    }
    else{
      var curTable = {};
      $this.parseData(file, curTable, function(){
        $this.tables[i] = (curTable);
        toCheck[i] = true;
        if(Utils.checkTrueArray(toCheck)) callback.call();
      });
    }
  });
};

tables.setTable = function(tableIndex){
  if(table != undefined){//if table already exist, remove it

  }

  //console.log(this.tables)
  this.currentTable = this.tables[tableIndex];
  //console.log("curTable",this.currentTable);
  this.createWidgets(tableIndex);
  this.createTable(tableIndex);
  //createLineChart(res);
  //createSettings();
  this.initSettings();

  if(table.slider){
    table.slider.addListener(widgets);
    widgets.addWidget(table.slider);
  }
};

tables.initSettings = function(){//instead of createsettings
  table.setAnimation("change","duration",table_params.animations.change.duration);
  table.setAnimation("change","delay",table_params.animations.change.delay);
  table.setAnimation("sort","duration",table_params.animations.sort.duration);
  table.setAnimation("sort","delay",table_params.animations.sort.delay);
};

tables.createTable = function(tableIndex){
  //console.log("create")
  var ticks_step = null;
  switch(DATA_FILES[tableIndex].type){

    case "citations":
      table_params.width = TABLE_WIDTH;
      table_params.height = TABLE_HEIGHT;
      table_params.forceRowHeight = 20;

      var nbElems = this.tables[tableIndex].unique_teams.length;
      //the colors
      table_params.colorScale = d3.scale.linear()
          .domain([
            0,
            (nbElems-1)*0.143,
            (nbElems-1)*0.286,
            (nbElems-1)*0.429,
            (nbElems-1)*0.571,
            (nbElems-1)*0.714,
            (nbElems-1)*0.857,
            (nbElems-1)
          ])
          .range([
            "#deebf7",
            "#c6dbef",
            "#9ecae1",
            "#6baed6",
            "#4292c6",
            "#2171b5",
            "#08519c",
            "#08306b"
          ]);
      //the tick values step
      ticks_step = null;
      this.setSliderTickValues(tableIndex,ticks_step);

      break;

  }

  //at the end, create the tick values according to ticks_step=int or null


  table_params.type = DATA_FILES[tableIndex].type;

  //create the table
  table_params.data = {
    nbDays: this.tables[tableIndex].nbDays,
    data: this.tables[tableIndex].data,
    columnLabel: COLUMN_LABELS[DATA_FILES[tableIndex].type],
    current_day: this.tables[tableIndex].current_day,
    unique_days: this.tables[tableIndex].unique_days,
    unique_teams: this.tables[tableIndex].unique_teams,
    missing_data: this.tables[tableIndex].missing_data
  };
  if(table_params.type == "foot") table_params.data.gameResults = this.tables[tableIndex].gameResults;
  else if(table_params.type == "citations") table_params.data.citationResults = this.tables[tableIndex].citationResults;

  table = new Table(table_params);
};

/*
 Return the tick values corresponding to the range minDay, maxDay.
 If step == null, then all days are ticks
 Warning: needs an even step
 */
tables.setSliderTickValues = function(tableIndex, step){
  if(step){//stretch the ticks according to step
    if(step%2 != 0) console.warn("ticks bug with odd step, try with an even step");
    table_params.slider.tickValues = [];
    var days = this.tables[tableIndex].unique_days;
    for(var i = days[0];i<days[days.length-step/2];i+=step) table_params.slider.tickValues.push(i);
    table_params.slider.tickValues.push(days[days.length-1]);
  }
  else{//no computation needed
    table_params.slider.tickValues = this.tables[tableIndex].unique_days;
  }
};

tables.createWidgets = function(tableIndex){
  //create the widgets
  widgets_params.nb_days = this.tables[tableIndex].nbDays;
  widgets = new Widgets(widgets_params);
};

tables.parseData = function(file, curTable, callback){

  var $this = this;

  if(file.type == "sort"){
    callback.call(compute_sort_data(curTable, file.nbElem));
  }
  else{
    var _function = null;
    if(file.extension == "json") _function = d3.json;
    else if(file.extension == "csv") _function = d3.csv;
    else console.error("unknown file extension for file ",file);

    _function("data/"+file.name+"."+file.extension, function(error, json) {
      if(error)  return console.warn(error);
      var outcomes = json;
      if(file.type == "foot"){
        curTable.unique_teams = [];
        curTable.unique_days = [];
        curTable.rankings = [];
        curTable.current_day = 0;
        outcomes.forEach(function(d) {
          if(curTable.unique_teams.indexOf(d.teamHome) == -1) {
            curTable.unique_teams.push(d.teamHome);
          }
        });
        // Retrieve Unique Teams
        outcomes.map(function(d) {
          if(curTable.unique_days.indexOf(d.day) == -1) {
            curTable.unique_days.push(d.day);
          }
        });
        callback.call(compute_foot_data(curTable,outcomes));
      }
      else if(file.type == "nations"){
        callback.call(compute_nations_data(curTable,outcomes));
      }
      else if(file.type == "citations"){
        callback.call(compute_citations_data($this.params, curTable,outcomes));
      }
      else if(file.type == "economy" || file.type == "products"){
        callback.call(compute_economy_data(curTable,outcomes,file.type));
      }
      else console.error("unknown file type for file ",file);
    });

  }
};



var PAPERS = 2,CITE = 3, CITED = 4, COAUTHORSSUM = 5, COAUTHORSUNIQUE = 6, BEST = 7;

function compute_citations_data(params, curTable, raw_data){
  var unique_authors = [];


  var minDay = 9999,
      maxDay = 0;

  var data = [],
      rankings = [];

  var citationResults = [];


  var paperTypes = ["C","T"];

  var conferences;
  if(params.data == "all") conferences = ["SciVis", "Vis", "VAST", "InfoVis"];
  else {
    if(params.data == "SciVis") conferences = ["SciVis","Vis"];
    else conferences = [params.data];
  }


  if(params.data == "all"){
    MIN_ARTICLES_FOR_CITATIONS = 10;
  }
  else if(params.data == "InfoVis"){
    MIN_ARTICLES_FOR_CITATIONS = 3;
  }
  if(params.data == "VAST"){
    MIN_ARTICLES_FOR_CITATIONS = 2;
  }
  if(params.data == "SciVis"){
    MIN_ARTICLES_FOR_CITATIONS = 6;
  }



  //Format articles
  raw_data = raw_data.filter(function(article){
    return conferences.indexOf(article["Conference"]) != -1
          && paperTypes.indexOf(article["Paper type: C=conference paper, T = TVCG journal paper, M=miscellaneous (capstone, keynote, VAST challenge, panel, poster, ...)"]) != -1;
  }).map(function(article){
    var id = article["IEEE XPLORE Article Number"];
    if(id == "x") id = article["IEEE Xplore Number Guessed"];
    if(id == "" || id == "x") console.log("cannot find article id for",article);

    var citations = article["References"].split(";");
    citations = citations.map(function(d){return +d});

    var year = +article["Year"];
    if(year < minDay) minDay = year;
    if(year > maxDay) maxDay = year;

    return {
      authors: article["Deduped author names"].split(";"),
      id: +id,
      year: +article["Year"],
      title: article["Paper Title"],
      citations: citations,
      conference: article["Conference"]
    }
  });


  var days = d3.range(minDay,maxDay+1);

  /*
   Compute metadata on articles
   */
  var metaData = raw_data.map(function(article){
    var citedInInfovisByYear = [];

    days.forEach(function(day){
      citedInInfovisByYear[day] = 0;
    });

    raw_data.filter(function(article2){return article2.citations.indexOf(article.id)!=-1}).forEach(function(article3){
      citedInInfovisByYear[parseInt(article3.year)]++;
    });

    //compute summed citations
    for(var y=maxDay; y>=minDay;y--){
      citedInInfovisByYear[y] = citedInInfovisByYear[y] + d3.sum(citedInInfovisByYear.filter(function(d,i){return i<y}));
    }

    return {
      citedInInfovis: citedInInfovisByYear,
      citations: article.citations,
      authors: article.authors,
      best: article.best || false,
      year: parseInt(article.year),
      id: article.id,
      title: article.title
    }

  });

  //console.log("metaData",metaData)


  //get all authors
  var tmpAuthors = [];
  for(var n in metaData){
    var article = metaData[n];
    article.authors.forEach(function(author){
      if(tmpAuthors[author] == undefined) tmpAuthors[author] = 1;
      else tmpAuthors[author]++;
    });
  }

  for(var k in tmpAuthors){
    if(tmpAuthors[k] > MIN_ARTICLES_FOR_CITATIONS) unique_authors.push(k);
  }

  //console.log("authors",unique_authors.length)

  days.forEach(function(day){
    data[day] = unique_authors.map(function(){
      var d = [];
      d[PAPERS] = 0; d[CITE] = 0; d[CITED] = 0, d[COAUTHORSSUM] = 0, d[COAUTHORSUNIQUE] = []//, d[BEST] = 0;
      return d;
    });
    rankings[day] = [RANK,TEAM_ID,PAPERS,CITE,CITED,COAUTHORSSUM,COAUTHORSUNIQUE/*,BEST*/].map(function(d){
      return [];
    });
  });

  for(var n in metaData){
    var article = metaData[n];

    //update the authors indexes
    article.authorIndexes = article.authors.map(function(d){return unique_authors.indexOf(d)});

    if(citationResults[article.year] == undefined) citationResults[article.year] = [];
    article.authors.forEach(function(author){
      var authorIndex = unique_authors.indexOf(author);
      if(authorIndex == -1) return;

      data[article.year][authorIndex][TEAM_ID] = authorIndex;
      data[article.year][authorIndex][PAPERS]++;
      data[article.year][authorIndex][COAUTHORSSUM] += article.authors.length-1;
      data[article.year][authorIndex][CITE] += article.citations.length;
      //if(article.best) data[article.year][authorIndex][BEST]++;


      citationResults[article.year].push(article);

      article.citedInInfovis.forEach(function(cited,year){
        data[year][authorIndex][CITED] += article.citedInInfovis[year];
      });

      article.authors.forEach(function(coAuthor){
        if(coAuthor != author && data[article.year][authorIndex][COAUTHORSUNIQUE].indexOf(coAuthor) == -1) data[article.year][authorIndex][COAUTHORSUNIQUE].push(coAuthor);
      });
    });
  }

  //keep only new authors for COAUTHORSUNIQUE
  for(var y = minDay; y <= maxDay; y++){
    var yearData = data[y];
    for(var a in yearData){
      var authorData = yearData[a];
      var coAuthors = authorData[COAUTHORSUNIQUE];
      for(var y2 = y+1;y2<= maxDay; y2++){
        var newAuthors = [];
        data[y2][a][COAUTHORSUNIQUE].forEach(function(coAuthor2){
          if(coAuthors.indexOf(coAuthor2) == -1) newAuthors.push(coAuthor2);
        });
        data[y2][a][COAUTHORSUNIQUE] = newAuthors;
      }
    }
  }

  //finally, sum the data each year
  for(var y = minDay; y <= maxDay; y++){//for each year
    for(var a in data[y]){//for each author
      var yearDataforAuthor = data[y][a];
      if(!yearDataforAuthor[1]) yearDataforAuthor[1] = parseInt(a);
      yearDataforAuthor[COAUTHORSUNIQUE] = yearDataforAuthor[COAUTHORSUNIQUE].length;

      if(y==minDay) continue;

      var previousYearData = data[y-1][a];

      //var PAPERS = 2,CITE = 3, CITED = 4, COAUTHORSSUM = 5, COAUTHORSUNIQUE = 6, BEST = 7;
      yearDataforAuthor[PAPERS] += previousYearData[PAPERS];
      yearDataforAuthor[CITE] += previousYearData[CITE];
      yearDataforAuthor[COAUTHORSSUM] += previousYearData[COAUTHORSSUM];
      yearDataforAuthor[COAUTHORSUNIQUE] += previousYearData[COAUTHORSUNIQUE];
      //yearDataforAuthor[BEST] += previousYearData[BEST];
    }
  }

  console.log(data)

  /*
   Now, the rankings
   */
  days.forEach(function(day){
    [TEAM_ID].forEach(function(col_id){
      //create a temporary array to store the team values to be sorted
      var day_row_col = data[day].map(function(d, i) {
        return {tid:i, value:d[col_id]};
      });

      //sort the temporary array
      day_row_col = day_row_col.sort(function(a, b) {
        return (unique_authors[a.tid] < unique_authors[b.tid]) ? 1 : -1;
      });
      // Fill the ranking array, with team ids only
      day_row_col.forEach(function(d, i) {
        rankings[day][col_id][i] = d.tid;
      });
    });

    [PAPERS,CITE,CITED,COAUTHORSSUM,COAUTHORSUNIQUE/*,BEST*/].forEach(function(col_id){
      //create a temporary array to store the team values and to be sorted
      var day_row_col = data[day].map(function(d, i) {
        return {tid:i, value:d[col_id]};
      });

      //sort the temporary array
      day_row_col = day_row_col.sort(function(a, b) {
        if(a.value < b.value) return -1;
        else if(a.value > b.value) return 1;
        else{//according to first time they are different
          for(var day2 = day+1; day2 <= maxDay; day2++){
            //console.log(data[day2].filter(function(d, i){return i == a.tid})[0],data[day2].filter(function(d, i){return i == b.tid})[0]);
            var aNext = data[day2].filter(function(d, i){return i == a.tid})[0][col_id];
            var bNext = data[day2].filter(function(d, i){return i == b.tid})[0][col_id];
            if(aNext != bNext){
              if(aNext < bNext) return -1;
              else if(aNext > bNext) return 1;
            }
          }
        }
        //else, sort alphabetically
        return (unique_authors[a.tid] < unique_authors[b.tid]) ? 1 : -1;
      });
      // Fill the ranking array, with team ids only
      day_row_col.forEach(function(d, i) {
        rankings[day][col_id][i] = d.tid;
      });
    });

    //the rank column is the same as the income rank column
    rankings[day][RANK] = rankings[day][PAPERS];
  });

  data.forEach(function(dayData){
    dayData.forEach(function(elemData){
      elemData[RANK] = elemData[TEAM_ID+1];
    });
  });

  curTable.rankings = rankings;
  curTable.unique_teams = unique_authors;
  curTable.data = data;
  curTable.nbDays = days[days.length-1]-days[0]+1;//TODO +1 ?
  curTable.unique_days = days;
  curTable.current_day = days[0];
  curTable.citationResults = citationResults;
  //console.log(curTable.citationResults)
}

