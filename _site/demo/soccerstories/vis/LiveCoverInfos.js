LiveCoverInfos = function(data,x,y,w,h){
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.data = data;

    this.init();
};



LiveCoverInfos.prototype.init = function(){
    var $this = this;
    this.players = this.data.players.map(function(d){
        var player = $this.data.formation.getPlayerInfos(d.pid);

        for(var p in $this.data.players){
            if($this.data.players[p].pid == d.pid){
                player.stats = $this.data.players[p].stats;
                break;
            }
        }
        return player;
    });


    var span = d3.select("body")
        .append("span")
        .style("position","fixed")
        .style("left",this.x+"px")
        .style("top",this.y+"px")
        .attr("id","svg3-container");

    this.visSVG = span
        .append("svg")
        .attr("id","svg3")
        .attr("width",this.w)
        .attr("height",this.h);

    var formationDim = [0,0,this.w,this.w*1.3];
    var statsDim = [0,formationDim[3],this.w,this.h-formationDim[3]];

    this.createFormation(formationDim[0],formationDim[1],formationDim[2],formationDim[3]);
    this.createStats(statsDim[0],statsDim[1],statsDim[2],statsDim[3]);

    //show the stats for the team
    this.showStats();
};

LiveCoverInfos.prototype.createStats = function(x,y,w,h){
    var $this = this;

    var statsSVG = this.visSVG.append("g")
        .attr("class","stats")
        .attr("transform", "translate("+[x,y]+")")
        .attr("width",w)
        .attr("height",h);

    //create the team stats
    this.teamStats = [];
    var teamName = $this.data.matchInfos.home == 1 ? $this.data.matchInfos.home_name : $this.data.matchInfos.away_name;
    this.teamStats[0] = {event: teamName};

    var maxs = [];
    this.players.forEach(function(player){
        player.stats.forEach(function(stat,s){
            if(stat.nb != undefined){
                if($this.teamStats[s]){
                    maxs[s] = maxs[s]==undefined ? stat.nb : Math.max(maxs[s],stat.nb);
                    $this.teamStats[s].nb += stat.nb;
                }
                else{
                    $this.teamStats[s] = {
                        event: stat.event,
                        nb: stat.nb
                    };
                }
            }
        })
    });

    this.xStartBars = 100;
    this.x_scales = [];
    this.teamStats.forEach(function(stat,s){
        if(stat.nb != undefined) $this.x_scales[s] = d3.scale.linear().domain([0,maxs[s]]).range([0,w-$this.xStartBars]).clamp(true);
    });






    var yDomain = [];
    this.teamStats.forEach(function(stat,s){
        yDomain.push(s);
    });
    this.y_scale = d3.scale.ordinal().domain(yDomain).rangeBands([0, h]);



    var data = this.teamStats;
    //initialize the stats with team stat
    var statsSVG = this.visSVG.select(".stats")
        .selectAll(".stats-g")
        .data(data)
        .enter()
        .append("g")
        .attr("transform",function(d,i){
            return "translate("+[0,$this.y_scale(i)]+")";
        })
        .attr("class","stats-g");

    statsSVG.each(function(d,i){
        if(d.nb == undefined){//the name
            d3.select(this)
                .append("text")
                .attr("x",$this.w/2)
                .attr("y",15)
                .style("font-size","12")
                .attr("text-anchor","middle")
                .text(function(d){
                    return d.event;
                })

        }
        else{//the stats
            d3.select(this)
                .append("rect")
                .attr("class","bg")
                .attr("x",$this.xStartBars)
                .attr("rx",$this.y_scale.rangeBand() *.2)
                .attr("ry",$this.y_scale.rangeBand() *.2)
                .attr("width",function(d){
                    return $this.x_scales[i].range()[1];
                })
                .attr("height",$this.y_scale.rangeBand() *.7);

            d3.select(this)
                .append("rect")
                .attr("class","fg")
                .attr("rx",$this.y_scale.rangeBand() *.2)
                .attr("ry",$this.y_scale.rangeBand() *.2)
                .attr("x",$this.xStartBars)
                .attr("width",function(d){
                    return $this.x_scales[i](d.nb);
                })
                .attr("height",$this.y_scale.rangeBand() *.7);

            d3.select(this)
                .append("text")
                .attr("x", function(d){
                    return $this.xStartBars;
                })
                .attr("y", function(d) { $this.y_scale.rangeBand() / 2; })
                .attr("dx", +3) // padding-right
                .attr("dy", "1.2em") // vertical-align: middle
                .attr("text-anchor", "begin") // text-align: right
                .text(function(d){
                    return d.nb;
                });

            d3.select(this)
                .append("text")
                .attr("x", function(d){
                    return $this.xStartBars;
                })
                .attr("y", function(d) { $this.y_scale.rangeBand() / 2; })
                .attr("dx", -3) // padding-right
                .attr("dy", "1.2em") // vertical-align: middle
                .attr("text-anchor", "end") // text-align: right
                .text(function(d){
                    return d.event;
                });
        }
    });
};


LiveCoverInfos.prototype.showStats = function(pid){
    var $this = this;
    var duration = 500;

    var data = undefined;

    if(pid){//show player stats
        for(var p in this.players){
            if(this.players[p].pid == pid){
                data = this.players[p].stats;
            }
        }
    }
    else{//show team stats
        data = this.teamStats;
    }

    var statsSVG = this.visSVG.selectAll(".stats-g")
        .data(data);

    statsSVG.each(function(d,i){
        if(d.nb == undefined){//the name
            d3.select(this)
                .select("text")
                .transition()
                .duration(duration)
                .text(function(d){
                    return d.event;
                })

        }
        else{//the stats
            d3.select(this)
                .select(".fg")
                .transition()
                .duration(duration)
                .attr("width",function(d){
                    return $this.x_scales[i](d.nb);
                });

            d3.select(this)
                .select("text")
                .transition()
                .duration(duration)
                .text(function(d){
                    return d.nb;
                });
        }
    });
};


LiveCoverInfos.prototype.createFormation = function(x,y,w,h){
    var $this = this;

    var subWidth = 30;
    var playerRadius = 12;

    var formationSVG = this.visSVG.append("g")
        .attr("class","formation")
        .attr("transform", "translate("+[x,y]+")")
        .attr("width",w)
        .attr("height",h)
        .on("click", function(){
            catchEvent();
            if($this.data.selected_sequence){
                if($this.data.selected_sequence.selectedPlayerId != undefined){
                    $this.data.selected_sequence.clickNode($this.data.selected_sequence.selectedPlayerId);
                }
            }
            else {
                $this.clickPlayer();
            }
        });

    var fieldGroup = formationSVG.append("g")
        .attr("class","field")
        .attr("transform", "translate("+[subWidth,0]+")")
        .attr("width",w-subWidth)
        .attr("height",h);

    this.drawField(fieldGroup);


    var x_scale = d3.scale.linear().domain([0,1]).range([subWidth+playerRadius,w-playerRadius]),
        y_scale = d3.scale.linear().domain([0,1]).range([h-playerRadius,playerRadius+40]);

    var playersSVG = formationSVG.selectAll(".player-formation")
        .data($this.players)
        .enter()
        .append("g")
        .attr("class","player-formation")
        .attr("transform",function(d){
            if(d.position == "Substitute"){
                return "translate("+[x_scale(d.y)+subWidth/2,y_scale(d.x)]+")";
            }
            return "translate("+[x_scale(d.y),y_scale(d.x)]+")";
        });

    playersSVG.append("svg:title")
        .text(function(d){
            return $this.data.getPlayerNodeTitle(d);
        });

    playersSVG.append("circle")
        .attr("r",playerRadius)
        .style("fill","white");

    var jersey = playersSVG.append("svg:text")
        .attr("text-anchor", "middle")
        .attr("y", 4)
        .text(function(d){
            return d.jersey;
        });
    jersey.attr("pointer-events","none");

    playersSVG
        .on("mouseover", function(){
            d3.select(this).style("cursor", "pointer")
        })
        .on("click", function(d){
            catchEvent();
            if($this.data.selected_sequence){
                $this.data.selected_sequence.clickNode(d.pid);
            }
            else $this.clickPlayer(d.pid);
        });
};

LiveCoverInfos.prototype.clickPlayer = function(pid){
    this.visSVG.selectAll(".player-formation")
        .classed("selected",function(d){
            return d.pid == pid;
        });
    this.showStats(pid);
};

LiveCoverInfos.prototype.drawField = function(fieldGroup){
    var $this = this;

    var width = parseInt(fieldGroup.attr("width"));
    var height = parseInt(fieldGroup.attr("height"));

    //the field rect
    drawFieldRect(0, 0, 1, 1, true);
    //central circle
    drawFieldCircle(0.5, 0.5, 0.18);
    //central point
    drawFieldCircle(0.5, 0.5, 0.01, true);
    //central line
    drawFieldLine(0.5, 0, 0.5, 1);
    //right circle
    drawFieldCircle(0.9, 0.5, 0.14);
    //left circle
    drawFieldCircle(0.1, 0.5, 0.14);
    //right big rect
    drawFieldRect(0.848, 0.191, 0.15, 0.615, true);
    //left big rect
    drawFieldRect(0.002, 0.191, 0.15, 0.615, true);
    //right small rect
    drawFieldRect(0.95, 0.36, 0.05, 0.28);
    //left small rect
    drawFieldRect(0, 0.36, 0.05, 0.28);
    //right penalty point
    drawFieldCircle(0.9, 0.5, 0.004, true);
    //left penalty point
    drawFieldCircle(0.1, 0.5, 0.004, true);


    function drawFieldRect(x, y, width, height, isFilled){
        var c = isFilled ? "fieldRect" : "fieldLines";
        fieldGroup.append("rect")
            .style("opacity",$this.drawField ? 1 : 0)
            .attr("class", c+" context")
            .attr("x", distYOnField(y))
            .attr("y", distXOnField(x))
            .attr("width", distYOnField(height))
            .attr("height", distXOnField(width));
    }
    function drawFieldCircle(x, y, r, isFilled){
        var c = isFilled ? "fieldLines fieldPoints" : "fieldLines";
        fieldGroup.append("circle")
            .style("opacity",$this.drawField ? 1 : 0)
            .attr("class", c+" context")
            .attr("cx", distYOnField(y))
            .attr("cy", distXOnField(x))
            .attr("r", distYOnField(r));
    }
    function drawFieldLine(x1, y1, x2, y2){
        fieldGroup.append("line")
            .style("opacity",$this.drawField ? 1 : 0)
            .attr("class", "fieldLines context")
            .attr("x1", distYOnField(y1))
            .attr("y1", distXOnField(x1))
            .attr("x2", distYOnField(y2))
            .attr("y2", distXOnField(x2));
    }
    function distYOnField(y){
        return y*width;
    }
    function distXOnField(x){
        return x*height;
    }
}