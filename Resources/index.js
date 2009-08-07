//Create a new array to hold all items
var itemList = new Array();

//Function to add a new item to the itemList array
createItem = function(id, name, description, deadline, completed){
	itemList[id] = new Array(name,description,deadline,completed);
}

//Function to display an item
display = function(id){
	//Get the item's data from the itemList array
	name = itemList[id][0];
	description = itemList[id][1];
	deadline = itemList[id][2];
	completed = itemList[id][3];
	//Work with date objects to calculate time left until the deadline
	temp = deadline.split('-');
	today  = new Date(); todayEpoch  = today.getTime();
	target = new Date();
	target.setFullYear(temp[0],temp[1]-1,temp[2])
    target.setHours(temp[3]);
    target.setMinutes(temp[4]);
	targetEpoch = target.getTime();
	span = (targetEpoch-todayEpoch)/1000;
	var days=Math.floor(span / 86400);
	var hours = Math.floor((span - (days * 86400 ))/3600)
	var minutes = Math.floor((span - (days * 86400 ) - (hours *3600 ))/60)
	var secs = Math.floor((span - (days * 86400 ) - (hours *3600 ) - (minutes*60)))
	//Format the 'time left' message and set a style for close and overdue items
	daysp='';hoursp='';minsp='';dueclass='';
	if(days!=1) daysp = 's';
	if(hours!=1) hoursp = 's';
	if(minutes!=1) minsp = 's';
	if(days<1) dueclass = 'close';
	if(days<0) dueclass = 'overdue';
	//Create the HTML for the item
	html = '<div id="item'+id+'" class="item'+dueclass+'">';
	html+= '<div class="itemdata">'
	html+= '<h3>'+name+'</h3>';
	html+= '<p>'+description+'</p>';
	if(days<0){
		html+= '<p class="meta">Was due '+((days*-1)-1)+'day'+daysp+' '+hours+'hour'+hoursp+' '+minutes+'min'+minsp+' ago</p>';
	}else{
		html+= '<p class="meta">Due in '+days+'day'+daysp+' '+hours+'hour'+hoursp+' '+minutes+'min'+minsp+'</p>';
	}
	html+= '</div>';
	if(completed){ //Set the item buttons for completed items
		html+= '<div class="itemactions">';
		html+= '<img src="makelivebutton.png" alt="Make this Jobii live again" onclick="makelive('+id+');" onmouseover="$(this).attr(\'src\', \'makelivebutton_o.png\');" onmouseout="$(this).attr(\'src\', \'makelivebutton.png\');" />';
		html+= '<img src="deletebutton.png" alt="Delete this Jobii" onclick="remove('+id+');" onmouseover="$(this).attr(\'src\', \'deletebutton_o.png\');" onmouseout="$(this).attr(\'src\', \'deletebutton.png\');" />';
		html+= '</div>';
		html+= '<div class="break">&nbsp;</p></div>';
		$('#completed').append(html); //Add the item to the completed DIV
	}else{ //Set the item buttons for live items
		html+= '<div class="itemactions">';
		html+= '<img src="completebutton.png" alt="Close this Jobii" onclick="completeitem('+id+');" onmouseover="$(this).attr(\'src\', \'completebutton_o.png\');" onmouseout="$(this).attr(\'src\', \'completebutton.png\');" />';
		html+= '<img src="deletebutton.png" alt="Delete this Jobii" onclick="remove('+id+');" onmouseover="$(this).attr(\'src\', \'deletebutton_o.png\');" onmouseout="$(this).attr(\'src\', \'deletebutton.png\');" />';
		html+= '</div>';
		html+= '<div class="break">&nbsp;</p></div>';
		$('#items').append(html); //Add the item to the items DIV
	}
}

//Function for marking an item as completed
function completeitem(itemid){
	//Update the database
	var db = Titanium.Database.open('jobii');
	db.execute('UPDATE todoitems SET COMP=? WHERE ID=?',true,itemid);
	db.close();
	//Remove from the live list
	$('#item'+itemid).fadeOut("normal",function() { switchItem('items',itemid); });
	//send tweet to Twitter, if appropriate
	if(Titanium.App.Properties.getString('tweet')=="on"){
		$('#spinner').fadeIn('fast');
		var msg = 'Just marked "'+itemList[itemid][0]+'" as completed using @d13design Jobii.';
		
		jQuery.ajax(
		{
			'username':Titanium.App.Properties.getString('twitteru'),
			'password':Titanium.App.Properties.getString('twitterp'),
			'type':'POST', 
			'url':'http://twitter.com/statuses/update.json',
			'data':{'status':msg, 'source':'Jobii'},
			success:function(resp,textStatus){
				$('#spinner').fadeOut();
			},
			error:function(XMLHttpRequest, textStatus, errorThrown){
				alert('textStatus='+textStatus+',error='+errorThrown);
			}
		});
	}
}

//Function for making a completed item live again
function makelive(itemid){
	//Update the database
	var db = Titanium.Database.open('jobii');
	db.execute('UPDATE todoitems SET COMP=? WHERE ID=?',false,itemid);
	db.close();
	//Remove from live list
	$('#item'+itemid).fadeOut("normal",function() { switchItem('completed',itemid); });
}

//Function for deleting an item
function remove(itemid){
	//Check the user is sure
	if (confirm('Are you sure you want to permanently remove the Jobii item "'+itemList[itemid][0]+'"?')) {
		//Update the database
		var db = Titanium.Database.open('jobii');
		db.execute('DELETE FROM todoitems WHERE ID=?', itemid);
		db.close();
		//Remove from the list
		delete itemList[itemid];
		$('#item' + itemid).fadeOut("normal", function(){
			$('#item' + itemid).remove();
		});
	}
}

//Function to clean up the completed items list
function clearUp(){
	//Check the user is sure
	if (confirm('Are you sure you want to permanently remove all closed Jobii items?')) {
		//Update the database
		var db = Titanium.Database.open('jobii');
		db.execute('DELETE FROM todoitems WHERE COMP=?', true);
		db.close();
		//Remove items from the list
		for (var i in itemList) {
			if (itemList[i][3] == true) {
				delete itemList[i];
			}
		}
		//Clean up the completed list HTML
		$('#completed').html('');
	}
}

//Function to update all items
function refresh(){
	for(var i in itemList){
		//Remove the item
		$('#item' + i).remove();
		//Recreate the item
		display(i);
	}
}

//Reusable function to switch items from one list to another
function switchItem(from,itemid){
	if(from=='items'){ //Moving from live to completed
		//remove from items
		$('#item'+itemid).remove();
		//update vars
		itemList[itemid][3] = true;
		//add to completed
		display(itemid);
	}else{ //Moving from completed to live
		//remove from completed
		$('#item'+itemid).remove();
		//update vars
		itemList[itemid][3] = false;
		//add to live
		display(itemid);
	}
}

//Function to create a new item
function newJobii(title,description,deadline,hours,minutes){
	//Save new item to database
	deadline = deadline+'-'+hours+'-'+minutes; //Format the deadline
	var db = Titanium.Database.open('jobii');
	db.execute('INSERT INTO todoitems (NAME, DESC, DLINE, COMP ) VALUES(?,?,?,?)',title,description,deadline,false);
	var rows = db.execute('SELECT last_insert_rowid()');
	db.close();
	//Add new item to the itemList array
	createItem(rows.field(0),title,description,deadline,false);
	//Add new item to live list
	display(rows.field(0));
	//Clear the form
	$('#newtitle').val('');
	$('#newdesc').val('');
	//Hide the form
	$('#new').fadeOut();
}

//Function to save settings
function updateSettings(){
	//Use local properties to store twitter account data
	Titanium.App.Properties.setString('twitteru',$('#twitteru').val());
	Titanium.App.Properties.setString('twitterp',$('#twitterp').val());
	Titanium.App.Properties.setString('tweet',$('#tweet').val());
	//Hide the settings panel
	$('#settings').fadeOut();
	//Update the user's image
	getTwitterIMG();
}

//Function to update the user's image
function getTwitterIMG(){
	//Get the user's Twitter username
	tu2 = Titanium.App.Properties.getString('twitteru');
	if (tu2) { //If a Twitter username has been provided get data from the Twitter API
		jQuery.ajax({
			'type': 'GET',
			'url': 'http://twitter.com/users/show/' + tu2 + '.json',
			success: function(resp, textStatus){
				td = JSON.parse(resp); //Parse the Twitter response
				$('#logo').html('<img src="' + td.profile_image_url + '" width="38" height="38" />'); //Update the user image
			},
			error: function(XMLHttpRequest, textStatus, errorThrown){
				alert('textStatus=' + textStatus + ',error=' + errorThrown);
			}
		});
	}else{ //No Twitter details are provided
		$('#logo').html('<img src="logo.png" />'); //Set the image to the Jobii logo
	}
}

//Function to load data from the database
loadData = function(){
	//Open the database
	var db = Titanium.Database.open('jobii');
	// These lines are great for testing and will clear the database and repopulate it with clean test data
	/*db.execute('DELETE FROM todoitems');
	db.execute('DROP TABLE todoitems');
	db.execute('CREATE TABLE IF NOT EXISTS todoitems  (ID INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, NAME TEXT, DESC TEXT, DLINE TEXT, COMP BOOLEAN)');
	db.execute('INSERT INTO todoitems (NAME, DESC, DLINE, COMP ) VALUES(?,?,?,?)','XMAS 2012','A test item set for Christmas 2012','2012-12-25-9-00',false);
	db.execute('INSERT INTO todoitems (NAME, DESC, DLINE, COMP ) VALUES(?,?,?,?)','Get Jobii','A test item set for getting the Jobii source code','2009-2-12-13-30',true);
	db.execute('INSERT INTO todoitems (NAME, DESC, DLINE, COMP ) VALUES(?,?,?,?)','XMAS 2013','A test item set for Christmas 2013','2013-12-25-9-00',false);
	db.execute('INSERT INTO todoitems (NAME, DESC, DLINE, COMP ) VALUES(?,?,?,?)','New Year','A test item set for a New Years Eve countdown in 2011','2011-12-31-11-55',false); */
	var rows = db.execute('SELECT * FROM todoitems');
	while (rows.isValidRow()){ //For each item in the database
		//Add the item to the itemList array
		createItem(rows.field(0),rows.fieldByName('NAME'),rows.fieldByName('DESC'),rows.fieldByName('DLINE'),rows.fieldByName('COMP'));
		//Display the item
		display(rows.field(0));
		//Then move to the next row - IMPORTANT!
		rows.next();
	}
	//Close the database
	rows.close();
	db.close();
}

