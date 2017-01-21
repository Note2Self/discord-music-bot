				////////////////////////////////////////////////////////////////////////////////   
				//    This program is free software: you can redistribute it and/or modify    //   
				//    it under the terms of the GNU General Public License as published by    //   
				//    the Free Software Foundation, either version 3 of the License, or       //   
				//    (at your option) any later version.                                     //   
				//                                                                            //   
				//    This program is distributed in the hope that it will be useful,         //   
				//    but WITHOUT ANY WARRANTY; without even the implied warranty of          //   
				//    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the           //   
				//    GNU General Public License for more details.                            //   
				//                                                                            //   
				//    You should have received a copy of the GNU General Public License       //   
				//    along with this program.  If not, see <http://www.gnu.org/licenses/>.   //   
				////////////////////////////////////////////////////////////////////////////////

const Discord = require("discord.js");
const fs = require("fs");
const ytdl = require("ytdl-core");

const bot = new Discord.Client({autoReconnect: true, max_message_cache: 0});

const dm_text = "Hey there! Use !commands on a public chat room to see the command list.";
const mention_text = "Use !commands to see the command list.";
var aliases_file_path = "aliases.json";

var stopped = false;
var inform_np = true;

var now_playing_data = {};
var queue = [];
var aliases = {};

var voice_connection = null;
var voice_handler = null;
var text_channel = null;

///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////

var commands = [

	{
		command: "stop",
		description: "Stops playlist (will also skip current song!)",
		parameters: [],
		execute: function(message, params) {
			if(stopped) {
				message.reply("Playback is already stopped!");
			} else {
				stopped = true;
				if(voice_handler !== null) {
					voice_handler.end();
				}
				message.reply("Stopping!");
			}
		}
	},
	
	{
		command: "resume",
		description: "Resumes playlist",
		parameters: [],
		execute: function(message, params) {
			if(stopped) {
				stopped = false;
				if(!is_queue_empty()) {
					play_next_song();
				}
			} else {
				message.reply("Playback is already running");
			}
		}
	},

	{
		command: "request",
		description: "Adds the requested video to the playlist queue",
		parameters: ["video URL, ID or alias"],
		execute: function(message, params) {
			add_to_queue(params[1], message);
		}
	},

	{
		command: "np",
		description: "Displays the current song",
		parameters: [],
		execute: function(message, params) {

			var response = "Now playing: ";
			if(is_bot_playing()) {
				response += "\"" + now_playing_data["title"] + "\" (requested by " + now_playing_data["user"] + ")";
			} else {
				response += "nothing!";
			}

			message.reply(response);
		}
	},

	{
		command: "setnp",
		description: "Sets whether the bot will announce the current song or not",
		parameters: ["on/off"],
		execute: function(message, params) {

			if(params[1].toLowerCase() == "on") {
				var response = "Will announce song names in chat";
				inform_np = true;
			} else if(params[1].toLowerCase() == "off") {
				var response = "Will no longer announce song names in chat";
				inform_np = false;
			} else {
				var response = "Sorry?";
			}
			
			message.reply(response);
		}
	},

	{
		command: "commands",
		description: "Displays this message, duh!",
		parameters: [],
		execute: function(message, params) {
			var response = "Available commands:";
			
			for(var i = 0; i < commands.length; i++) {
				var c = commands[i];
				response += "\n!" + c.command;
				
				for(var j = 0; j < c.parameters.length; j++) {
					response += " <" + c.parameters[j] + ">";
				}
				
				response += ": " + c.description;
			}
			
			message.reply(response);
		}
	},

	{
		command: "skip",
		description: "Skips the current song",
		parameters: [],
		execute: function(message, params) {
			if(voice_handler !== null) {
				message.reply("Skipping...");
				voice_handler.end();
			} else {
				message.reply("There is nothing being played.");
			}
		}
	},

	{
		command: "queue",
		description: "Displays the queue",
		parameters: [],
		execute: function(message, params) {
			var response = "";
	
			if(is_queue_empty()) {
				response = "the queue is empty.";
			} else {
				for(var i = 0; i < queue.length; i++) {
					response += "\"" + queue[i]["title"] + "\" (requested by " + queue[i]["user"] + ")\n";
				}
			}
			
			message.reply(response);
		}
	},

	{
		command: "clearqueue",
		description: "Removes all songs from the queue",
		parameters: [],
		execute: function(message, params) {
			queue = [];
			message.reply("Queue has been clered!");
		}
	},
	
	{
		command: "aliases",
		description: "Displays the stored aliases",
		parameters: [],
		execute: function(message, params) {

			var response = "Current aliases:";
			
			for(var alias in aliases) {
				if(aliases.hasOwnProperty(alias)) {
					response += "\n" + alias + " -> " + aliases[alias];
				}
			}
			
			message.reply(response);
		}
	},
	
	{
		command: "setalias",
		description: "Sets an alias, overriding the previous one if it already exists",
		parameters: ["alias", "video URL or ID"],
		execute: function(message, params) {

			var alias = params[1].toLowerCase();
			var val = params[2];
			
			aliases[alias] = val;
			fs.writeFileSync(aliases_file_path, JSON.stringify(aliases));
			
			message.reply("Alias " + alias + " -> " + val + " set successfully.");
		}
	},
	
	{
		command: "deletealias",
		description: "Deletes an existing alias",
		parameters: ["alias"],
		execute: function(message, params) {

			var alias = params[1].toLowerCase();

			if(!aliases.hasOwnProperty(alias)) {
				message.reply("Alias " + alias + " does not exist");
			} else {
				delete aliases[alias];
				fs.writeFileSync(aliases_file_path, JSON.stringify(aliases));
				message.reply("Alias \"" + alias + "\" deleted successfully.");
			}
		}
	},
	
];

///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////

bot.on("disconnect", event => {
	console.log("Disconnected: " + event.reason + " (" + event.code + ")");
});

bot.on("message", message => {
	if(message.channel.type === "dm" && message.author.id !== bot.user.id) { //Message received by DM
		//Check that the DM was not send by the bot to prevent infinite looping
		message.channel.sendMessage(dm_text);
	} else if(message.channel.type === "text" && message.channel.name === text_channel.name) { //Message received on desired text channel
		if(message.isMentioned(bot.user)) {
			message.reply(mention_text);
		} else {
			var message_text = message.content;
			if(message_text[0] == '!') { //Command issued
				handle_command(message, message_text.substring(1));
			}
		}
	}
});

///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////

function add_to_queue(video, message) {

	if(aliases.hasOwnProperty(video.toLowerCase())) {
		video = aliases[video.toLowerCase()];
	}

	var video_id = get_video_id(video);

	ytdl.getInfo("https://www.youtube.com/watch?v=" + video_id, (error, info) => {
		if(error) {
			message.reply("The requested video could not be found.");
		} else {
			queue.push({title: info["title"], id: video_id, user: message.author.username});
			message.reply('"' + info["title"] + '" has been added to the queue.');
			if(!stopped && !is_bot_playing() && queue.length === 1) {
				play_next_song();
			}
		}
	});
}

function play_next_song() {
	if(is_queue_empty()) {
		text_channel.sendMessage("The queue is empty!");
	}

	var video_id = queue[0]["id"];
	var title = queue[0]["title"];
	var user = queue[0]["user"];

	now_playing_data["title"] = title;
	now_playing_data["user"] = user;

	if(inform_np) {
		text_channel.sendMessage('Now playing: "' + title + '" (requested by ' + user + ')');
	}

	var audio_stream = ytdl("https://www.youtube.com/watch?v=" + video_id);
	voice_handler = voice_connection.playStream(audio_stream);

	voice_handler.once("end", reason => {
		voice_handler = null;
		if(!stopped && !is_queue_empty()) {
			play_next_song();
		}
	});

	queue.splice(0,1);
}

function search_command(command_name) {
	for(var i = 0; i < commands.length; i++) {
		if(commands[i].command == command_name.toLowerCase()) {
			return commands[i];
		}
	}

	return false;
}

function handle_command(message, text) {
	var params = text.split(" ");
	var command = search_command(params[0]);

	if(command) {
		if(params.length - 1 < command.parameters.length) {
			message.reply("Insufficient parameters!");
		} else {
			command.execute(message, params);
		}
	}
}

function is_queue_empty() {
	return queue.length === 0;
}

function is_bot_playing() {
	return voice_handler !== null;
}

///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////

function get_video_id(string) {
	var searchToken = "?v=";
	var i = string.indexOf(searchToken);
	
	if(i == -1) {
		searchToken = "&v=";
		i = string.indexOf(searchToken);
	}
	
	if(i == -1) {
		searchToken = "youtu.be/";
		i = string.indexOf(searchToken);
	}
	
	if(i != -1) {
		var substr = string.substring(i + searchToken.length);
		var j = substr.indexOf("&");
		
		if(j == -1) {
			j = substr.indexOf("?");
		}
		
		if(j == -1) {
			return substr;
		} else {
			return substr.substring(0,j);
		}
	}
	
	return string;
}

///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////

exports.run = function(server_name, text_channel_name, voice_channel_name, aliases_path, token) {

	aliases_file_path = aliases_path;

	bot.on("ready", () => {
		var server = bot.guilds.find("name", server_name);
		var voice_channel = server.channels.find("name", voice_channel_name); //The voice channel the bot will connect to
		text_channel = server.channels.find("name", text_channel_name); //The text channel the bot will use to announce stuff
		voice_channel.join().then(connection => {voice_connection = connection;}).catch(console.error);

		fs.access(aliases_file_path, fs.F_OK, (err) => {
			if(err) {
				aliases = {};
			} else {
				try {
					aliases = JSON.parse(fs.readFileSync(aliases_file_path));
				} catch(err) {
					aliases = {};
				}
			}
		});

		console.log("Connected!");
	});

	bot.login(token);
}