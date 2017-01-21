<p align="center"><a href="https://nodei.co/npm/discord-music-bot/"><img src="https://nodei.co/npm/discord-music-bot.png"></a></p>

A Node.JS Discord bot that takes song requests from videos on YouTube, queues them and plays the audio of said videos on a voice channel.

I made it totally *ad-hoc* for my personal server so it doesn't support multiple servers for a single instance or anything like that, but it can be customised very easily to make it work on any server you want.

# Available commands
- **!request <video/alias>** - Adds a YouTube video to the queue. You can provide the full URL, just the video ID or an alias.
- **!stop** - Stops the playback, the bot will not continue with the pending queue until !resume is issued.
- **!resume** - Allows the bot to play videos from the queue again after !stop was issued.
- **!np** - Displays the title of the video that is being played.
- **!setnp <on/off>** - Selects whether the bot will announce the title of the video it's about to play or not.
- **!commands** - Displays all available commands, pretty much like this.
- **!skip** - Skips the video that is being currently played.
- **!queue** - Displays the queue.
- **!clearqueue** - Sets the queue to an empty state, discarding all pending requests.
- **!setalias <alias> <video>**: Maps any word of your choice (*alias*) to a video URL or ID, so you can !request the alias instead.
- **!deletealias <alias>** - Removes an existing alias.
- **!aliases** - Displays the stored aliases.

# How to make it work?

Obviously, you must install [Node.JS](https://nodejs.org/es/) if you haven't already. Any version above 6.0.0 should do. It's highly recommended that you run the server on a Linux environment, because some dependencies will probably complain if you try to install them on Windows.

Then, install the bot itself. Just open up a console, type `npm install discord-music-bot` and you're done. It should be fairly quick and painless.

Next, register a new [Discord application](https://discordapp.com/developers/applications/me) for your own instance of the bot. Keep track of the **Client ID** and your **token**.

It's time to make the bot join your server: replace your Client ID on this URL and navigate to it `https://discordapp.com/oauth2/authorize?&client_id=YOUR_CLIENT_ID_HERE&scope=bot&permissions=0`. Select the server you want the bot to join and click Authorize. This step requires that you have manage permissions on the server, otherwise it will not appear in the server list you'll be prompted with. Your bot should now appear as *Offline* in your server.

Finally, let's bring it to life! It's as simple as executing this script:
```js
var bot = require("discord-music-bot");

var serverName = "Your server name here";
var textChannelName = "Your text channel name here (without #)";
var voiceChannelName = "Your voice channel name here";
var aliasesFile = "A file the bot will use to store your aliases";
var botToken = "Your bot token here";

bot.run(serverName, textChannelName, voiceChannelName, aliasesFile, botToken);
```
The aliases file parameter can be just a filename or a path to a file. If it does not exist, it will be generated. If you provide a filename, it will be generated in the same folder as the previous script. Any filename will do.

The bot will join the voice channel that you configured when it connects to the server, but obviously you can move it to other voice channels once it joins. The text channel is the one the bot will use to listen to commands and announce stuff. Keep in mind that all names are case-sensitive!

Save it with whatever name you want (for instance, "bot.js") and then execute it using Node.JS: `node bot.js`. Your bot should now be up and running in your server!
