try
{
        console.log('server start');

        var users={};
        var userId=0;

        var net = require('net');

        var server = net.createServer(function(c)
        {
                c.setNoDelay(true);
                c.on('error', function(e)
                {
                        console.log('ERROR SOCKET');
                        console.log(e);
                        console.log("\r\n");
                });
                c.setEncoding('utf8');
                c.my={message: ''};
                c.my.policyFileRequest=true;

                c.on('data', function(data)
                {
                        try
                        {
                                this.my.message += data;

                                if(this.my.policyFileRequest)
                                {
                                        if(this.my.message[0]=='<')
                                        {
                                                if(this.my.message.length<22) return;

                                                if(this.my.message.length>=22)
                                                {
                                                        if(this.my.message.substr(0,22)=='<policy-file-request/>')
                                                        {
                                                                var _this=this;
                                                                this.write('<cross-domain-policy>\r\n<allow-access-from domain="tennis.thelv.ru" to-ports="8080" />\r\n</cross-domain-policy>\r\n\r\n');
                                                        }
                                                }
                                                this.end();
                                        }
                                        else
                                        {
                                                this.my.policyFileRequest=false;
                                                arguments.callee.call(this, '');
                                        }
                                }
                                else
                                {
                                        while(true)
                                        {
                                                var i = -1;
                                                if ((i = this.my.message.indexOf("\n")) != -1)
                                                {
                                                        try
                                                        {
                                                                var message=JSON.parse(this.my.message.substr(0, i));

                                                                if(! this.my.user)
                                                                {
                                                                        if(message.mt=='session_create')
                                                                        {
                                                                                this.my.i=0;
                                                                                this.my.user=users[++userId]=
                                                                                {
                                                                                        id: userId,
                                                                                        connections: [this],
                                                                                        inviteWho: {},
                                                                                        invitedBy: {},
                                                                                        playWith: null
                                                                                }

                                                                                this.write(JSON.stringify({mt: "session_create", session_id: ''+userId})+"\n");
                                                                        }
                                                                        else
                                                                        {
                                                                                this.my.i=message.connection_number;
                                                                                (this.my.user=users[message.session_id]).connections[message.connection_number]=this;

                                                                                this.write(JSON.stringify({mt: "session_enjoy"})+"\n");
                                                                        }
                                                                }
                                                                else
                                                                {
                                                                        var user=this.my.user;

                                                                        if(message.mt=='accaunt')
                                                                        {
                                                                                user.accaunt=message.accaunt;
                                                                        }
                                                                        else if(message.mt=='invite_player')
                                                                        {
                                                                                if(message.action=='uninvite')
                                                                                {
                                                                                        delete user.inviteWho[message.user];
                                                                                }

                                                                                if(users[message.user])
                                                                                {
                                                                                        if(message.action=='uninvite')
                                                                                        {
                                                                                                delete users[message.user].invitedBy[user.id];
                                                                                        }
                                                                                        else
                                                                                        {
                                                                                                if(user.invitedBy[message.user])
                                                                                                {
                                                                                                        user.inviteWho={};
                                                                                                        user.invitedBy={};
                                                                                                        users[message.user].inviteWho={};
                                                                                                        users[message.user].invitedBy={};
                                                                                                        user.playWith=users[message.user];
                                                                                                        users[message.user].playWith=user;

                                                                                                        this.write(JSON.stringify({mt: "enter_in_game", result: "accepted", first_serve: true})+"\n");
                                                                                                        users[message.user].connections[0].write(JSON.stringify({mt: "enter_in_game", result: "accepted", first_serve: false})+"\n");
                                                                                                }
                                                                                                else
                                                                                                {
                                                                                                        user.inviteWho[message.user]=true;
                                                                                                        users[message.user].invitedBy[user.id]=true;
                                                                                                }
                                                                                        }
                                                                                        sendPlayersLists(users[message.user].connections[0]);
                                                                                }
                                                                                sendPlayersLists(this);
                                                                        }
                                                                        else if(message.mt=='players_lists')
                                                                        {
                                                                                sendPlayersLists(this, message);
                                                                        }
                                                                        else
                                                                        {
                                                                                if(message.g && user.playWith)
                                                                                {
                                                                                        user.playWith.connections[this.my.i].write(JSON.stringify(message)+"\n");
                                                                                }
                                                                        }
                                                                }
                                                        }
                                                        catch(e)
                                                        {
                                                                console.log('MESSAGE PARSE OR HANDLE ERROR');
                                                                console.log(e);
                                                                console.log("\r\n");
                                                        }

                                                        this.my.message = this.my.message.substr(i + 1);

                                                        if (this.my.message == '') break;
                                                }
                                                else
                                                {
                                                        break;
                                                }
                                        }
                                }
                        }
                        catch(e)
                        {
                                console.log('ERROR DATA');
                                console.log(e);
                                console.log("\r\n");
                        }
                });

                c.on('close', function()
                {
                        try
                        {
                                user=this.my.user;
                                if(user)
                                {
                                        for(var i in user.inviteWho)
                                        {
                                                delete users[i].invitedBy[user.id];
                                        }

                                        for(var i in user.invitedBy)
                                        {
                                                delete users[i].inviteWho[user.id];
                                        }

                                        if(user.playWith)
                                        {
                                                user.playWith.playWith=null;
                                                user.playWith=null;
                                        }

                                        delete users[user.id];

                                        for(var i in user.connections)
                                        {
                                                delete user.connections[i].my.user;
                                        }
                                }
                        }
                        catch(e)
                        {
                                console.log('ERROR CLOSE');
                                console.log(e);
                                console.log("\r\n");
                        }
                });
        });

        server.listen(8080);

        sendPlayersLists=function(connection)
        {
                var user=connection.my.user;
                var allPlayersList=[];
                for(var i in users)
                {
                        if(! users[i].playWith && user.id!=i)
                        {
                                allPlayersList.push({accaunt: users[i].accaunt, user: users[i].id});
                        }
                }

                var inviteWhoPlayersList=[];
                for(var i in user.inviteWho)
                {
                        inviteWhoPlayersList.push({accaunt: users[i].accaunt, user: users[i].id});
                }

                var invitedByPlayersList=[];
                for(var i in user.invitedBy)
                {
                        invitedByPlayersList.push({accaunt: users[i].accaunt, user: users[i].id});
                }

                connection.write(JSON.stringify(
                {
                        mt: 'players_lists',
                        all_players_list: allPlayersList,
                        invite_who_players_list: inviteWhoPlayersList,
                        invited_by_players_list: invitedByPlayersList
                })+"\n");
        }
}
catch(e)
{
        console.log('ERROR WIDE');
        console.log(e);
        console.log('end or not?')
        console.log("\r\n");
}
