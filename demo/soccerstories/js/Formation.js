
Formation = function(_formation, _players){
    this.name = _formation.name;
    this.init(_formation, _players);
};

Formation.prototype.init = function(_formation, _players){
    var lines = _formation.lines;

    this.formationData = [];
    for(var p=0;p<_players.length;p++){
        var player = _players[p];
        this.formationData.push({
            pid: player.pid,
            jersey: player.jersey,
            pos_in_formation: player.pos_in_formation,
            first_name: player.first_name,
            last_name: player.last_name,
            position: player.position,
            display_name: player.last_name.split(" ")[0]
        });
    }

    //the goalKeeper position
    this.formationData[0].x = 0;
    this.formationData[0].y = 0.5;

    var nbLines = lines.length;
    for(var l=0;l<nbLines;l++){
        var line = lines[l];
        var xPlayer = l/(nbLines-1);
        var nbPlayers = line.length;
        for(var p=0;p<nbPlayers;p++){
            var yPlayer;
            switch(nbPlayers){
                case 1:
                    yPlayer = 0.5;
                    break;
                case 2:
                    switch(p){
                        case 0:
                            yPlayer = 0.7;
                            break;
                        case 1:
                            yPlayer = 0.3;
                            break;
                    }
                    break;
                case 3:
                    switch(p){
                        case 0:
                            yPlayer = 0.8;
                            break;
                        case 1:
                            yPlayer = 0.5;
                            break;
                        case 2:
                            yPlayer = 0.2;
                            break;
                    }
                    break;
                case 4:
                case 5:
                    yPlayer = 1-p/(nbPlayers-1);
                    break;
                default:
                    console.log("unknown number of players on a line: "+nbPlayers);
            }

            //get the corresponding player and give him its position
            for(var fd in this.formationData){
                var playerData = this.formationData[fd];
                if(playerData.pos_in_formation == line[p]){
                    playerData.x = xPlayer;
                    playerData.y = yPlayer;
                    break;
                }
            }
        }
    }

    //and the substitutes...
    var nbSubs = 0;
    for(var p=0;p<this.formationData.length;p++){
        if(this.formationData[p].x==null){
            nbSubs++;
        }
    }
    var subX=0;
    for(var p=0;p<this.formationData.length;p++){
        if(this.formationData[p].x==null){
            this.formationData[p].x = subX;
            this.formationData[p].y = -.3;
            subX += 1/nbSubs;
        }
    }

    //console.log("formationData = "+JSON.stringify(this.formationData));
};

Formation.prototype.getPlayerInfos = function(pid){
    for(var p in this.formationData){
        if(this.formationData[p].pid == pid) return this.formationData[p];
    }
    console.log("no information for player "+pid+" in ",this);
    return null;
};


