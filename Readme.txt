Explanation of how site works is on site: thejor.com/about

All files/functions other than those explicitly labelled otherwise were written by me in 
a) static
b)  static/other_components

These constitute most of the application. 
The server-side code is comprised of largely: 

server.js
captchas.js
/utils
ipblock.js.

To run:  
node server.js file
then open 25 chrome tabs at: http://127.0.0.1:8000/


1) The captcha can be turned on by specifying production in server.js file
2) The one difference between this and production is that when the network starts this version does not connect the
queued users, just the new users is number 25 and beyond.

 This is to allow simple demonstration on a single machine 
without crashing it on a slow connection/computer. To change this add startNetwork(sockets[i]); inside this if block:  
"if (sockets[i]['queued'] === true) {" which is on around line 400 in server.js. This will then connect all of the queued sockets when the 25 client connects. 
			

		
