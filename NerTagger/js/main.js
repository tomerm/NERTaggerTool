/**
 * main.js 
 */

var gui;
var db;
var appName;
var logNode;
var dbt;
var fs, request;
var exec;
var spawn;
var mypath;
var config;
var statusNode, docNameNode;
var doc;
var curAction;
var comboId;
var linesOnPage = 1;
var activePanel = 0;
var spanInEdit = false;
var defaultDir = "rtl";
var defFontSize = 130;
var defPageSize = 5;
var searchPattern = "";
var createStatement = 'CREATE TABLE IF NOT EXISTS $ (itemid, name)';
var selectStatement = 'SELECT * FROM $';
var insertStatement = 'INSERT INTO $ (itemid, name) VALUES (?,?)';
var dropStatement = 'DROP TABLE IF EXISTS $';
var NerConfig = [];
var myPath;
var jarDir, emlDir, tmpDir;
var COLORS = ["aqua", "aquamarine", "bisque", "orchid", "darksalmon", "darkseagreen", "goldenrod", "hotpink", "lightcoral", "limegreen", "plum", "orangered", "peru", "olivedrab", "tan"];
var SHORTCUTS = ["P", "L", "O", "J", "F", "G", "R", "D", "T", "U", "M", "Y", "I", "B", "E"];
var defFileLines = 0;
var defPlainFileLines = 0;
var isConnected = false;
var defShowErrors = true;
var defShowDebug = true;
var defDecorResults = true;
var defShowEd = true;
var defShowPd = true;
var defShowFd = true;
var curLine = 0;
var LOCKED = "locked";
var UPDATED = "updated";
var UNTOUCHED = " ";
var isParaEditable = true;
var showDetails = false;
var LastTestResults = null;
var testDecor = false;
var minLine = 1;
var docLine = 0;
var testLine = 0;
var tdfType = "IOB";
var testDetailsType = "";
var linesInDet = 50;
var startInd = 0;
var syncWithLine = true;

var NerConfigEntry = (function() {
	var NerConfigEntry = function(ename, category, color, shortcut) {
		this.ename = ename;
		this.category = category; 
		this.shortcut = shortcut;
		this.color = color;
		this.copyTo = function(otherEntry) {
			otherEntry.ename = this.ename;
			otherEntry.category = this.category;
			otherEntry.color = this.color;
			otherEntry.shortcut = this.shortcut;
			return otherEntry;
		};
	};
	return NerConfigEntry;
})();

var WexResults = (function() {
	var WexResults = function(tagged, comp, docname, ext) {
		this.tagged = tagged;
		this.exactlyFound = 0;
		this.partiallyFound = 0;
		this.falselyFound = 0;
		this.notFound = 0;
		this.comp = comp || {};
		this.docname = docname;
		this.ext = !ext? "NerEngine" : ext; 
	};
	return WexResults;
})();

function initContent() {
	gui = require('nw.gui');
	var win = gui.Window.get();
	win.on("close", function() {
		endApp();
	});
	fs = require('fs');
	//request = require('request');
	exec = require('child_process').execSync;
	spawn = require('child_process').spawnSync;
	appName = gui.App.manifest.name;
	dataPath = gui.App.dataPath;
	mypath = require('path');
	jarDir = mypath.dirname(process.execPath);
	if (jarDir.indexOf("nwjs") > 0)
		jarDir = jarDir.substring(0, jarDir.indexOf("nwjs")) + "NerTagger\\lib";
	else
		jarDir = jarDir.substring(0, jarDir.lastIndexOf("\\") + 1) + "NerTagger\\lib";	
	emlDir = mypath.dirname(process.execPath);
	if (emlDir.indexOf("nwjs") > 0)
		emlDir = emlDir.substring(0, emlDir.indexOf("nwjs")) + "pyscripts";
	else
		emlDir = emlDir.substring(0, emlDir.lastIndexOf("\\") + 1) + "pyscripts";
	tmpDir = mypath.dirname(process.execPath);
	if (tmpDir.indexOf("nwjs") > 0)
		tmpDir = tmpDir.substring(0, tmpDir.indexOf("nwjs")) + "tmp";
	else
		tmpDir = tmpDir.substring(0, tmpDir.lastIndexOf("\\") + 1) + "tmp";
	
	logNode = document.getElementById('workPanel');
	
	document.getElementById('fileID').addEventListener('change', handleFileSelect, false);
	document.getElementById('txtxmlID').addEventListener('change', handleTxtXmlFileSelect, false);
	document.getElementById('tdfID').addEventListener('change', handleTDFFileSelect, false);
	document.getElementById('txtID').addEventListener('change', handleTxtFileSelect, false);
	document.getElementById('extcmpID').addEventListener('change', handleExtFileSelect, false);
	document.getElementById('loadtsvID').addEventListener('change', handleSaveTsvFileSelect, false);
	document.getElementById('loadtxtID').addEventListener('change', handleSaveTxtFileSelect, false);
	document.getElementById('exptdfID').addEventListener('change', handleSaveTdfFileSelect, false);
	document.getElementById('exptoksID').addEventListener('change', handleSaveToksFileSelect, false);
	document.getElementById('expengID').addEventListener('change', handleSaveEngFileSelect, false);
	
	statusNode = document.getElementById("status");
	docNameNode = document.getElementById("docname");	
	if (localStorage.jstfontsize)
		defFontSize = parseInt(localStorage.jstfontsize);
	document.getElementById("fontsize").value = ("" + defFontSize);
	setFontSize(defFontSize);
	if (localStorage.jstpagesize)
		defPageSize = parseInt(localStorage.jstpagesize);
	document.getElementById("pagesize").value = ("" + defPageSize);
	if (localStorage.jsttdftype)
		tdfType = localStorage.jsttdftype;	
	else
		tdfType = "BU";
	document.getElementById("tdftype").value = tdfType;
	
	var wArea = document.querySelector("#workArea");
	
	if (localStorage.jstdefaultdir) {
		defaultDir = localStorage.jstdefaultdir;
		wArea.classList.add(defaultDir);
	}
	if (localStorage.jsttokenizer) {
		jarDir = localStorage.jsttokenizer;
		if (!fs.existsSync(jarDir)) {
			jarDir = mypath.dirname(process.execPath).substring(0, jarDir.indexOf("nwjs")) + "NerTagger\\lib";
		}
	}
	if (localStorage.emlDir) {
		emlDir = localStorage.emlDir;
		if (!fs.existsSync(emlDir)) {
			emlDir = mypath.dirname(process.execPath).substring(0, emlDir.indexOf("nwjs")) + "pyscripts";
		}
	}
	if (localStorage.jstdecorresults) {
		defDecorResults = localStorage.jstdecorresults == "Y";
	}
	var cbox = document.getElementById('decorcbox');
	cbox.checked = defDecorResults;

	if (localStorage.jstshowerrors) {
		defShowErrors = localStorage.jstshowerrors == "Y";
	}
	var cbox = document.getElementById('errcbox');
	cbox.checked = defShowErrors;
	if (localStorage.jstshowdebug) {
		defShowDebug = localStorage.jstshowdebug == "Y";
	}
	cbox = document.getElementById('debugcbox');
	cbox.checked = defShowDebug;

	if (localStorage.jstshowed) {
		defShowEd = localStorage.jstshowed == "Y";
	}
	var cbox = document.getElementById('exactbox');
	cbox.checked = defShowEd;
	
	var slCombo = document.querySelector("#showLayer");
	var showLayer = slCombo.options[0].value.toLowerCase();
	document.body.className = "active-" + showLayer;
	readDB();
}


function endApp() {
	localStorage.jstfontsize = "" + defFontSize;
	localStorage.jstpagesize = "" + defPageSize;
	localStorage.jsttdftype = tdfType;
	//localStorage.jstlinesinplainfile = "" + defPlainFileLines;
	localStorage.jstdefaultdir = "" + defaultDir;
	localStorage.jsttokenizer = jarDir;
	localStorage.emlDir = emlDir;
	localStorage.jstdecorresults = defDecorResults? "Y" : "N";
	localStorage.jstshowerrors = defShowErrors? "Y" : "N"; 
	localStorage.jstshowdebug = defShowDebug? "Y" : "N";
	localStorage.jstshowed = defShowEd? "Y" : "N";

	gui.App.quit();
}

function menuDropdown(node) {
	if (!hasValidSettings())
		return;
	var dropdowns = document.getElementsByClassName("dropdown-content");
    for (var i = 0; i < dropdowns.length; i++) {
    	var openDropdown = dropdowns[i];
    	if (openDropdown.classList.contains('show-dropdown') && hasValidSettings()) {
    		openDropdown.classList.remove('show-dropdown');
    	}
    }
	while (node = node.nextSibling) {
		if (node.nodeType == 1)
			break;
	}
	node = node.firstChild;
	do {
		if (node.nodeType == 1)
			break;
	} while(node = node.nextSibling);
	
	node.classList.toggle("show-dropdown");
	document.getElementById("fontsize").value = ("" + defFontSize);
	document.getElementById("pagesize").value = ("" + defPageSize);
	document.getElementById("tdftype").value = tdfType;
}

window.onclick = function(event) {
	var active = document.activeElement;
	if (active.id === "fontsize" || active.id === "pagesize" || active.id === "linesf" || active.id === "linesp" || active.id == "errcbox" || active.id == "debugcbox" || 
			active.id == "decorcbox" || active.id == "tdftype" || active.id == "exactbox") {
		return;
	}
	if (active.tagName && active.tagName.toLowerCase() == "a") {
		var cb = active.querySelector('.menucheckbox');
		if (cb)
			return;
	}
	if (!event.target.matches('.dropdown-content') && !event.target.matches('.mainMenuItem')) {
		var dropdowns = document.getElementsByClassName("dropdown-content");
	    for (var i = 0; i < dropdowns.length; i++) {
	    	var openDropdown = dropdowns[i];
	    	if (openDropdown.classList.contains('show-dropdown') && hasValidSettings()) {
	    		openDropdown.classList.remove('show-dropdown');
	    		return;
	    	}
	    }
	}
};

document.addEventListener("keydown", function(event) {
	if (!doc)
		return;
	var node = event.target;
	if (!node.classList.contains("line"))
		return;
	var done = false;
	switch (event.which) {
		case 112: done = updateActive("Ins"); break;
		case 123: done = updateActive("Del"); break;
		case 118: done = searchTextView(); break;
		case 27: done = updateActive("Esc"); break;
		default:
			if (!event.ctrlKey || event.which == 17)
				break;
			if (event.ctrlKey && event.which >=48 && event.which <=90)
				done = updateActive(String.fromCharCode(event.which));
			break;
	  }
	if (event.which == 13 || done)
		event.preventDefault();
	if (event.shiftKey && event.ctrlKey) {
		alert("This is forbidden!");
		event.preventDefault();
		return false;
	}
	
});

document.addEventListener("keyup", function(event) {
	if (!doc) {
		if (event.target.id && (event.target.id == "textPosition" || event.target.id == "textLine"))
			event.target.value = "";
		return;
	}
	var node = event.target;
	if (node.id == "searchPat") {
		searchText(event);
		return false;
	}
	if (!node.classList.contains("line")) {
		//alert("Keyup from " + node.tagName);
		return false;
	}
	var endLine = doc.lines.length - 1;
	
	switch (event.which) {
		case 13:
		case 16:
		case 17:
		case 18:
			return true;
		case 33:   //PgUp
			var pos = parseInt(document.querySelector('#textPosition').value);
			if (isNaN(pos))
				return false;
			if (docLine > 0)
				docLine = Math.max(0, docLine - defPageSize);
			moveToLineAndPos(docLine, pos);
			getCurrentSelection();	
			return false;
		case 34:   //PgDown
			var pos = parseInt(document.querySelector('#textPosition').value);
			if (isNaN(pos))
				return false;
			if (docLine < endLine)
				docLine = Math.min(endLine, docLine + defPageSize);
			moveToLineAndPos(docLine, pos);
			getCurrentSelection();	
			return false;			
		case 35:   //End
			if (event.ctrlKey) {
				docLine = endLine;
			}
			moveToLineAndPos(docLine, doc.lines[docLine].text.length);
			return true;
		case 36:   //Home
			if (event.ctrlKey) {
				docLine = 0;
			}
			moveToLineAndPos(docLine, 0);
			return true;
		case 37:   //Left
		case 40:   //Down
			var pos = getCurrentPos();
			if (pos >= doc.lines[docLine].text.length) { 
				if (docLine < endLine + 1) {
					docLine++;
					pos = 0;
					moveToLineAndPos(docLine, pos);
				}
				else
					return true;
			}
			getCurrentSelection();	
			return true;
		case 39:   //Right
		case 38:   //Top
			var pos = getCurrentPos();
			if (pos == 0) {
				if (docLine > 0) {
					docLine--;
					pos = doc.lines[docLine].text.length;
					moveToLineAndPos(docLine, pos);
				}
				else
					return true;
			}
			getCurrentSelection();	
			return true;
		case 46:   //Del
		case 8:    //Bcksp
			if (!node.textContent) {
				node.innerHTML = "";
				var prev = node.previousSibling || node.nextSibling;
				node.parentNode.removeChild(node);
			    if (tsv.refreshDocument()) {
			    	tsv.saveIntoDB(db, doc);
			    	if (prev) {
			    		var sel = window.getSelection();
			    		var range = document.createRange();
			    		range.setStartBefore(prev.firstChild);
			    		range.setEndBefore(prev.firstChild);
			    		sel.removeAllRanges();
			    		sel.addRange(range);
			    	}
			    	getCurrentSelection();
			    	display.checkEntities(doc);
			    }
			    else {
			    	var d = doc.name;
			    	tsv.deleteDocumentFormDB(db, doc.name);
			    	clearScreen();
			    	alert("Document \"" + d + "\" is deleted");
			    }
			    return false;
			}
			else
				break;
		case 120:   //F9
		case 121:   //F10
		case 122:   //F11
			markLine(node, event.which);
			return false;
		default: break;
	}
	
	var needRefresh = false;
	var selectedSpan = null;
	
	node.querySelectorAll("div").forEach(function(div) {
		if (div.hasChildNodes() && div.childNodes.length == 1 && div.firstChild.querySelectorAll("br").length > 0 && div.firstChild.textContent == "")
			div.removeChild(div.firstChild);
		var prev1 = div.previousSibling, prev2 = prev1? prev1.previousSibling : null;
		if (prev1 && prev2) {
			if (prev1.querySelectorAll("br").length > 0 && prev1.firstChild.textContent == "" && 
					prev2.querySelectorAll("br").length > 0 && prev2.firstChild.textContent == "")
				div.parentNode.removeChild(prev1);
		}
		var nlspan = document.createElement('span');
		nlspan.appendChild(document.createElement('br'));
		selectedSpan = nlspan;
		node.insertBefore(nlspan, div);
		while(div.firstChild) {
			node.insertBefore(div.firstChild, div);
			needRefresh = true;
		}
		node.removeChild(div);
	});	
	
	var cPos = parseInt(document.querySelector('#textPosition').value);
	if (node.firstChild.nodeType == 3) {
		var tsp = document.createElement("span");
		tsp.appendChild(node.firstChild);
		node.appendChild(tsp);
		selectedSpan = node.firstChild;
		cPos = 1;
	}
	
	node.querySelectorAll("span").forEach(function(span, index) {
		if (span.innerHTML == "&nbsp;") {
			span.innerHTML = " ";
			needRefresh = true;
		}
		else if(span.textContent.length > 1 || (span.querySelectorAll("br").length > 0 && span.textContent.length > 0)) {
			var tt = span.textContent;
			if (span.querySelectorAll("br").length > 0) {
				alert("BR found in span");
				var sbr = span.querySelector("br");
				var spbr = document.createElement("span");
				spbr.appendChild(sbr);
				if (span.nextSibling)
					node.insertBefore(spbr, span.nextSibling);
				else
					node.appendChild(spbr);
			}
			span.innerHTML = span.textContent.substring(0,1);
			if (tt.length == 1) {
				selectedSpan = span;
			}
			for (var i=tt.length-1; i>0; i--) {
				var nspan = document.createElement("span");
				nspan.innerHTML = tt.substring(i,i+1);
				nspan.className = span.className;
				if (span.nextSibling)
					span.parentNode.insertBefore(nspan,span.nextSibling);
				else
					span.parentNode.appendChild(nspan);
				if (i == tt.length-1) {
					selectedSpan = nspan;
				}
			}
			if (cPos == 0 && span === span.parentNode.firstChild) {
				selectedSpan = span;
			}
			needRefresh = true;
		}
	});
	
	if (node.lastChild.tagName === "br") {
		var br = para.lastChild;
		var sel = window.getSelection();
		var range = sel.getRangeAt(0);
		range.setStartBefore(br.previousSibling);
		range.setEndBefore(br.previousSibling);
		sel.removeAllRanges();
		sel.addRange(range);
		node.removeChild(br);
		needRefresh = true;
	}

	if (selectedSpan) {
		var sel = window.getSelection();
		if (sel.rangeCount) {
			var range = document.createRange();
			range.setEndAfter(selectedSpan);
			range.setStartAfter(selectedSpan);
			sel.removeAllRanges();
			sel.addRange(range);
		}
	}

    if (tsv.refreshLine(node)) {
    	tsv.saveIntoDB(db, doc);
    	getCurrentSelection();
    	display.checkEntities(doc);
    }
    else {
    	var d = doc.name;
    	tsv.deleteDocumentFormDB(db, doc.name);
    	clearScreen();
    	alert("Document \"" + d + "\" is deleted");
    }
	
});

function moveToLineAndPos(line, pos) {	
	if (!doc || line == undefined || pos == undefined)
		return;
	if (line < 0)
		line = 0;
	if (pos < 0)
		pos = 0;
	if (line >= doc.lines.length) {
		alert("Current document doesn't have so many lines. Selection is set to the last line of the document.");
		line = doc.lines.length - 1;
	}
	if (pos > doc.lines[line].text.length) {
		alert("Selected line doesn't have so many characters. Selection is set to the end of this line.");
		pos = doc.lines[line].text.length;
	}
	docLine = line;
	displayView(line);
	var div = document.querySelector(".para .line" + curLine);
	div.focus();
	var sel = window.getSelection();
	var rg = document.createRange();
	rg.selectNodeContents(div);
	if (pos < div.childNodes.length) {
		rg.setEndBefore(div.childNodes[pos]);
		rg.setStartBefore(div.childNodes[pos]);
	}
	else {
		rg.setStart(div.childNodes[pos-1],1);
		rg.setEnd(div.childNodes[pos-1],1);
	}
	sel.removeAllRanges();
	sel.addRange(rg);
	getCurrentSelection();	
}

function hasValidSettings() {
	var val = document.getElementById("fontsize").value;
	if (/^\d+$/.test(val)) {
		var n = parseInt(val);
		if (n >= 100 && n <= 200) {
			if (n != defFontSize) {
				defFontSize = n;
				var wPanel = document.querySelector("#workPanel");
				wPanel.style.fontSize = "" + defFontSize + "%";
			}
		}
		else
			return false;
	}
	else
		return false;
	val = document.getElementById("pagesize").value;
	if (/^\d+$/.test(val)) {
		var n = parseInt(val);
		if (n > 0) {
			if (n != defPageSize) {
				defPageSize = n;
			}
		}
		else
			return false;
	}
	else
		return false;
	val = document.getElementById("tdftype").value;
	if (val)
		val = val.toUpperCase();	
	if (val != "BU" && val != "IOB")
		return false;
	else
		tdfType = val;
	
	return true;
}

function endSettings(e) {
	if (!e)
		e = window.event;
	if (e.which == '13') {
		var node = e.target.parentNode;
		node.focus();
		node.click();
		return false;
	}
}

function setFontSize(n) {
	var wPanel = document.querySelector("#workPanel");
	wPanel.style.fontSize = "" + n + "%";	
}

function loadTSV(oldFormat) {
	if (!isParaEditable) {
		showSummarySection();
		display.decorateResults(doc, LastTestResults, false);
	}
	var tsvId = !oldFormat? document.querySelector("#tsvID") : document.querySelector("#txtxmlID");
	tsvId.value = "";
	tsvId.click();
}

function loadTDF() {
	if (!isParaEditable) {
		showSummarySection();
		display.decorateResults(doc, LastTestResults, false);
	}
	var tdfId = document.querySelector("#tdfID");
	tdfId.value = "";
	tdfId.click();
}

function loadTXT() {
	if (!isParaEditable) {
		showSummarySection();
		display.decorateResults(doc, LastTestResults, false);
	}
	var txtId = document.querySelector("#txtID");
	txtId.value = "";
	txtId.click();
}

function loadExternal() {
	if (!doc) {
		alert("Load some document for compare!");
		return;
	}
	if (!isParaEditable) {
		showSummarySection();
		display.decorateResults(doc, LastTestResults, false);
	}
	var txtId = document.querySelector("#extcmpID");
	txtId.value = "";
	txtId.click();
}

function saveTSV() {
	if (!doc) {
		alert("Load some document for export!");
		return;
	}
	var loadtsvId = document.querySelector("#loadtsvID");
	var docname = doc.name.replace(/_NRT$/, "");
	loadtsvId.setAttribute("nwsaveas", docname + "_ENT.txt");
	loadtsvId.value = "";
	loadtsvId.click();	
}

function saveTXT() {
	if (!doc) {
		alert("Load some document for export!");
		return;
	}
	var loadtxtId = document.querySelector("#loadtxtID");
	loadtxtId.value = "";
	loadtxtId.click();	
}

function saveTDF() {
	if (!doc) {
		alert("Load some document for export!");
		return;
	}
	var loadtdfId = document.querySelector("#exptdfID");
	loadtdfId.value = "";
	loadtdfId.click();	
}

function saveTOKS() {
	if (!doc) {
		alert("Load some document for export!");
		return;
	}
	var loadtoksId = document.querySelector("#exptoksID");
	loadtoksId.value = "";
	loadtoksId.click();	
}

function saveEng() {
	if (!doc) {
		alert("Load some document for export!");
		return;
	}
	var loadengId = document.querySelector("#expengID");
	loadengId.value = "";
	loadengId.click();	
}

function handleTsvFileSelect() {
	var fileinput = document.querySelector('input#tsvID[type=file]');
	var path = fileinput.value;
	var apath = path.split("\\").length - 1;
	var fName = path.split("\\")[apath].split(".")[0];
	statusNode.innerHTML = "Load annotated document from " + path + "...";
	var txt = fs.readFileSync(path, 'utf8');
	if (!txt) {
		statusNode.classList.toggle("show-error");
		statusNode.innerHTML = "Problem with reading file " + path;
		alert("File " + path + "doesn't exist or not readable");
		statusNode.classList.remove("show-error");
		statusNode.innerHTML = "";
		return;
	} else {
		loadDoc("loadtsv",txt,fName);
	}
	statusNode.innerHTML = "";
	fileinput.value = "";
	return;
}

function handleTxtXmlFileSelect() {
	var fileinput = document.querySelector('input#txtxmlID[type=file]');
	var path = fileinput.value;
	var arpath = path.split("\\");
	var apath = arpath.length - 1;
	var fName = arpath[apath].split(".")[0];
	var lastSeg = arpath[apath].split(".");
	statusNode.innerHTML = "Load annotated sentences from " + path + "...";
	if (lastSeg.length != 2 || lastSeg[1] != "txt") {
		alert("File " + path + " doesn't have proper extension");
		statusNode.innerHTML = "";
		return;
	}
	var txt = fs.readFileSync(path, 'utf8');
	if (!txt) {
		alert("File " + path + "doesn't exist or not readable");
		statusNode.innerHTML = "";
		return;
	}	
	loadDoc("loadtsv",txt,fName,true);	
	statusNode.innerHTML = "";
	fileinput.value = "";
	return;
}

function handleTDFFileSelect() {
	var fileinput = document.querySelector('input#tdfID[type=file]');
	var path = fileinput.value;
	var arpath = path.split("\\");
	var apath = arpath.length - 1;
	var fName = arpath[apath].split(".")[0];
	var lastSeg = arpath[apath].split(".");
	statusNode.innerHTML = "Load tokenized data from " + path + "...";
	if (lastSeg.length != 2 || lastSeg[1] != "txt") {
		alert("File " + path + " doesn't have proper extension");
		statusNode.innerHTML = "";
		return;
	}
	statusNode.innerHTML = "Start read file...";
	var txt = fs.readFileSync(path, 'utf8');
	if (!txt) {
		alert("File " + path + "doesn't exist or not readable");
		statusNode.innerHTML = "";
		return;
	}
	statusNode.innerHTML = "End read file."
	loadDoc("loadtdf",txt,fName,true);	
	statusNode.innerHTML = "";
	fileinput.value = "";
	return;
}

function handleTxtFileSelect() {
	var fileinput = document.querySelector('input#txtID[type=file]');
	var path = fileinput.value;
	var apath = path.split("\\").length - 1;
	var fName = path.split("\\")[apath].split(".")[0];
	statusNode.innerHTML = "Load regular file from " + path + "...";
	var txt = fs.readFileSync(path, 'utf8');
	if (!txt) {
		statusNode.classList.toggle("show-error");
		statusNode.innerHTML = "Problem with reading file " + path;
		alert("File " + path + "doesn't exist or not readable");
		statusNode.classList.remove("show-error");
		statusNode.innerHTML = "";
		return;
	} else {
		loadDoc("loadtxt",txt,fName);
	}
	statusNode.innerHTML = "";
	fileinput.value = "";
	return;
}

function handleExtFileSelect() {
	var fileinput = document.querySelector('input#extcmpID[type=file]');
	var path = fileinput.value;
	statusNode.innerHTML = "Load file with external results from " + path + "...";
	var txt = fs.readFileSync(path, 'utf8');
	if (!txt) {
		statusNode.classList.toggle("show-error");
		statusNode.innerHTML = "Problem with reading file " + path;
		alert("File " + path + "doesn't exist or not readable");
		statusNode.classList.remove("show-error");
		statusNode.innerHTML = "";
		return;
	} else {
		path = path.replace(/\\/g,"/");
		displayEngineResults(tsv.handleExternalResults(txt), path.substring(path.lastIndexOf("/")+1));
	}
	statusNode.innerHTML = "";
	fileinput.value = "";
	return;
	
}

function handleSaveTsvFileSelect() {
	var fileinput = document.querySelector('input#loadtsvID[type=file]');
	var path = fileinput.value;
	fs.stat(path, function(err, stat) {
	    if (!err || err.code == 'ENOENT') {
	    	statusNode.innerHTML = "Export tagged sentences into " + path + "...";
	        tsv.exportTaggedSentences(fs, doc, path);
	    } else {
			statusNode.classList.toggle("show-error");
			statusNode.innerHTML = "Problem with writing into the file " + path;
			alert("You can't write into the file " + path);
			statusNode.classList.remove("show-error");
	    }
		statusNode.innerHTML = "";
		fileinput.value = "";
	});
	return;
}

function handleSaveTxtFileSelect() {
	var fileinput = document.querySelector('input#loadtxtID[type=file]');
	var path = fileinput.value;
	fs.stat(path, function(err, stat) {
	    if (!err || err.code == 'ENOENT') {
	    	statusNode.innerHTML = "Save text content of the document into " + path + "...";
	        tsv.exportTextContent(fs, doc, path);
	    } else {
			statusNode.classList.toggle("show-error");
			statusNode.innerHTML = "Problem with writing into the file " + path;
			alert("You can't write into the file " + path);
			statusNode.classList.remove("show-error");
	    }
		statusNode.innerHTML = "";
		fileinput.value = "";
	});
	return;
}

function handleSaveTdfFileSelect() {
	var fileinput = document.querySelector('input#exptdfID[type=file]');
	var path = fileinput.value;
	statusNode.innerHTML = "Export entities into " + path + ". Please wait...";
	fs.stat(path, function(err, stat) {
	    if (!err || err.code == 'ENOENT') {
	        tsv.exportEntities(fs, exec, doc, path);
	    } else {
			statusNode.classList.toggle("show-error");
			statusNode.innerHTML = "Problem with writing into the file " + path;
			alert("You can't write into the file " + path);
			statusNode.classList.remove("show-error");
	    }
		statusNode.innerHTML = "";
		fileinput.value = "";
	});
	return;
}

function handleSaveToksFileSelect() {
	var fileinput = document.querySelector('input#exptoksID[type=file]');
	var path = fileinput.value;
	statusNode.innerHTML = "Export tokenized sentences into " + path + ". Please wait...";
	fs.stat(path, function(err, stat) {
	    if (!err || err.code == 'ENOENT') {
	        tsv.exportToks(fs, exec, doc, path);
	    } else {
			statusNode.classList.toggle("show-error");
			statusNode.innerHTML = "Problem with writing into the file " + path;
			alert("You can't write into the file " + path);
			statusNode.classList.remove("show-error");
	    }
		statusNode.innerHTML = "";
		fileinput.value = "";
	});
	return;
}

function handleSaveEngFileSelect() {
	var fileinput = document.querySelector('input#expengID[type=file]');
	var path = fileinput.value;
	statusNode.innerHTML = "Save document tagged by NerEngine into " + path + ". Please wait...";
	fs.stat(path, function(err, stat) {
	    if (!err || err.code == 'ENOENT') {
	        tsv.exportEng(fs, exec, doc, path);
	    } else {
			statusNode.classList.toggle("show-error");
			statusNode.innerHTML = "Problem with writing into the file " + path;
			alert("You can't write into the file " + path);
			statusNode.classList.remove("show-error");
	    }
		statusNode.innerHTML = "";
		fileinput.value = "";
	});
	return;
}

function handleFileSelect(evt) {
	var fileinput = document.querySelector('input#fileID[type=file]');
	var path = fileinput.value;
	var name = "", category = "";
	var result;
	var wrongData = false;
	var ind = -1;
	statusNode.innerHTML = "Load configuration from " + path + "...";
	var confCopy = [];	
	fs.readFile(path, 'utf8', function(err, txt) {
		  if (err) {
			  statusNode.classList.toggle("show-error");
			  statusNode.innerHTML = "Problem with reading file " + path;
			  alert("File " + path + "doesn't exist or not readable");
			  statusNode.classList.remove("show-error");
			  statusNode.innerHTML = "";
			  return;
		  }
		  else {
			  var aresult = txt.split(/\r?\n/);
			  for (var i =0; i<aresult.length; i++) {
				  result = aresult[i].trim();
				  if (result.length == 0) {
					  continue;
				  }
				  else {
					  var type = result.substring(0,1);
					  var entry = result.substring(1);
					  ind++;
					  if ((type !== "#" && type !== "+") || (type === "+" && category.length == 0) || !entry || entry.length == 0) {
						  alert("Wrong: type=" + type + ", category: " + category + ", entry: " + entry + ", entry length: " + (entry? entry.length : -1));
						  wrongData = true;
						  break;
					  }
					  name = entry.trim();
					  if (type == "#") {
						  category = name;
						  confCopy.push(new NerConfigEntry(name, "", COLORS[ind], SHORTCUTS[ind]));
					  }
					  else {
						  confCopy.push(new NerConfigEntry(name, category, COLORS[ind], SHORTCUTS[ind]));
					  }
				  }
			  }
				statusNode.innerHTML = "";
				if (wrongData || confCopy.length == 0) {
					alert("File " + path + " doesn't contain valid data. Configuration isn't loaded. " + (wrongData? "Wrong data" : "Empty conf"));
					return;
				}
				else {
					NerConfig = confCopy.slice(0); 
					fillEntityTypeCombo();
					updateStyleSheet();
			    	saveConfig();
			    	createSummaryTable();
			    	if (doc)
			    		checkEntities(doc);
			    	alert("Restart Tagger to apply new colors");
				}
		  }
	});
}

function saveConfig() {
	db.transaction(function (tx) {
		var stmt = dropStatement.replace("$", "config");
		tx.executeSql(stmt);
		tx.executeSql('CREATE TABLE IF NOT EXISTS config (fullname, entityName, category, color, shortcut)', [], null, onError);
		for (var i=0; i<NerConfig.length; i++) {
			var nc = NerConfig[i];
			tx.executeSql('INSERT INTO config (fullname, entityName, category, color, shortcut) VALUES (?,?,?,?,?)', [nc.ename + nc.category, nc.ename, nc.category, nc.color, nc.shortcut], null, onError); 
		}
	});
}

function readDB(debug) {
	if (!db)
		db = openDatabase('taggerd2', '1.0', 'BDLTagger DB', 5 * 1024 * 1024);
	
	if (debug) {
		db.transaction(function(tx) {
			if (debug == 1) {
				alert("For debug only");
				tx.executeSql('DROP TABLE IF EXISTS config');
				NerConfig = [];
				saveConfig();
			}
			else {
				if (confirm("Do you really want to delete all documents from your DB?")) {
					clearScreen();
					tx.executeSql('DROP TABLE IF EXISTS document');
					tx.executeSql('DROP TABLE IF EXISTS lines');
					tx.executeSql('DROP TABLE IF EXISTS entities');
				}
			}
		});
		return;
	}
	NerConfig = [];
	NerConfig.className = "nerconfig";
	db.transaction(function(tx) {
		tx.executeSql('CREATE TABLE IF NOT EXISTS config (fullname, entityName, category, color, shortcut)', [], null, onError);
		tx.executeSql('SELECT * FROM config', [],function(tx, results) {
			var len = results.rows.length, j;
			if (len == 0) {
				NerConfig.push(new NerConfigEntry("Person", "", "aqua", "P"));
				NerConfig.push(new NerConfigEntry("Location", "", "aquamarine", "L"));
				NerConfig.push(new NerConfigEntry("Organization", "", "bisque", "O"));
				saveConfig();
			}
			else {
				for (j = 0; j < len; j++) {
					var row = results.rows[j];
					NerConfig.push(new NerConfigEntry(row.entityName, row.category, row.color, row.shortcut));
				}
			}
			fillEntityTypeCombo();
			updateStyleSheet();
			createSummaryTable();
		}, onError);
	});
}	

function fillEntityTypeCombo() {
	var aCombo = [document.querySelector("#entityType"), document.querySelector("#activeLayer"), document.querySelector("#showLayer")];
	var combo, option;
	for (var k=0; k<3; k++) {
		combo = aCombo[k];
		for (var i=combo.options.length-1; i>0; i--) {
			combo.options[i].remove();
		}	
		for (i=0; i<NerConfig.length; i++) {
			option = document.createElement('option');
			option.text = option.value = NerConfig[i].ename;
			if (NerConfig[i].category != "")
				option.text = NerConfig[i].category + " -> " + option.value;
			combo.add(option);
		}
		if (k == 1)
			continue;
		option = document.createElement('option');
		option.text = option.value = k == 0? "Unknown" : "None";
		combo.add(option);
	}
}

function updateStyleSheet() {
	var mycss = document.querySelector("style[title='mycss']");
	var rule = " {background-color: $;}";
	var selector = ".active-$ ";
	var base = " ";
	if (mycss) {
		mycss.innerHTML = "";
	}
	else {		
		mycss = document.createElement('style');
		mycss.type = 'text/css';
		mycss.innerHTML = '';
		mycss.title = "mycss";
		document.getElementsByTagName('head')[0].appendChild(mycss);
	}
	var count = 0;
	for (var i=0; i<document.styleSheets.length; i++) {
		if (document.styleSheets[i].title == "mycss") {
			mycss = document.styleSheets[i];
			mycss.insertRule(selector.replace("$","none") + base + rule.replace("$", "white"),count++);
			var categoryColor;
			for (var j=0; j<NerConfig.length; j++) {
				mycss.insertRule(selector.replace("$",NerConfig[j].ename.toLowerCase() + base + "." + NerConfig[j].ename.toLowerCase()) + rule.replace("$", NerConfig[j].color),count++);
				if (NerConfig[j].category == "") {
					mycss.insertRule(selector.replace("$","all" + base + "." + NerConfig[j].ename.toLowerCase()) + rule.replace("$", NerConfig[j].color),count++);
					categoryColor = NerConfig[j].color;
				}
				else {
					mycss.insertRule(selector.replace("$",NerConfig[j].category.toLowerCase() + base + "." + NerConfig[j].ename.toLowerCase()) + rule.replace("$", categoryColor),count++);
					mycss.insertRule(selector.replace("$","all" + base + "." + NerConfig[j].ename.toLowerCase()) + rule.replace("$", categoryColor),count++);
				}
			}
			return;
		}
	}
	alert("StyleSheet is't found!");
}

function createSummaryTable() {
	var table = document.querySelector("#summaryTableID");
	var tr1 = document.querySelector("#summaryTr1");
	table.querySelectorAll("tr").forEach(function(tr) {
		if (tr !== tr1)
			tr.parentNode.removeChild(tr);
	});
	
	for (var i=0; i<NerConfig.length; i++) {
		var row = document.createElement("tr");
		row.id = NerConfig[i].ename.toLowerCase();
		var td = document.createElement("td");
		td.style.width = "65%";
		td.innerHTML = (NerConfig[i].category == ""? "&nbsp;&nbsp;" : "&nbsp;&nbsp;&nbsp;&nbsp;") + NerConfig[i].ename;
		td.style.marginLeft = (NerConfig[i].category == ""? "10px" : "20px");
		row.appendChild(td);
		td = document.createElement("td");
		td.style.backgroundColor = NerConfig[i].color;
		td.style.width = "5%";
		row.appendChild(td);
		td = document.createElement("td");
		td.innerHTML = NerConfig[i].shortcut;
		td.style.width = "15%";
		td.style.textAlign = "center";
		row.appendChild(td);
		td = document.createElement("td");
		td.innerHTML = "0";
		td.style.width = "100%";
		td.style.textAlign = "right";
		td.style.marginRight = "15px";
		row.appendChild(td);
		table.appendChild(row);
	}
	if (doc) {
		display.checkEntities(doc);
	}
}

function updateActive(command) {
	if (!doc || !command) {
		if(!!doc && !command) {
			setSpanInEdit(false);
			document.querySelector(".para .line" + curLine).focus();
		}
		return;
	}
	sel = window.getSelection();
	var range = null;
	if (sel.rangeCount) {
		range = sel.getRangeAt(0);
	}
	if (!range || range.collapsed) {
		return false;
	}
	if (command === "Esc") {
		range.collapse();
		sel.removeAllRanges();
		sel.addRange(range);
		return false;
	}
	var node = document.querySelector("#activeLayer");
	var layer = node.options[node.selectedIndex].value;
	var ind = -1, deleteAll = false, shortcut = command.length == 1;
	if (layer == "None" && command === "Del")
		deleteAll = true;
	if (layer == "None" && command === "Ins")
		return false;
	for (var i=0; i<NerConfig.length; i++) {
		if (!shortcut && (layer == NerConfig[i].ename)) {
			ind = i;
			break;
		}
		else if(command.toLowerCase() == NerConfig[i].shortcut.toLowerCase()) {
			ind = i;
			break;
		}
	}
	if (!deleteAll && ind < 0) {
		alert("Unknown shortcut");
		return false;
	}
	
	var span;
	var para = document.querySelector(".para .line" + curLine);
	var nls = 0;
	var rg = document.createRange(), startPos, endPos;
	rg.selectNodeContents(para);
	rg.setEnd(range.startContainer, range.startOffset);
	span = document.createElement("span");
	span.appendChild(rg.cloneContents());
	nls = span.querySelectorAll("br").length;
	startpos = span.textContent.length + nls;
	
	rg.selectNodeContents(para);
	rg.setEnd(range.endContainer, range.endOffset);
	span = document.createElement("span");
	span.appendChild(rg.cloneContents());
	endpos = span.textContent.length + nls;
	var c=range.cloneContents();
	var brs = c.querySelectorAll('br').length;
	if (brs > 0) {
		alert("You can't select entity, placed in more then one paragraph of the text.");
		return false;
	}

	for (var j=startpos; j<endpos; j++) {
		if (para.childNodes[j].querySelectorAll("br").length > 0) {
			alert("Span contains BR!");
			break;
		}
		if (deleteAll)
			para.childNodes[j].className = "";
		else if(command === "Del") {
			para.childNodes[j].classList.remove(NerConfig[ind].ename.toLowerCase());
			if (NerConfig[ind].category === "" && ind < NerConfig.length - 1) {
				for (var k = ind+1; k < NerConfig.length; k++) {
					if (NerConfig[k].category.toLowerCase() == NerConfig[ind].ename.toLowerCase()) {
						para.childNodes[j].classList.remove(NerConfig[k].ename.toLowerCase());
					}
					else 
						break;
				}
			}
		}
		else
			para.childNodes[j].classList.add(NerConfig[ind].ename.toLowerCase());
		if (para.childNodes[j].classList.length > 1)
			para.childNodes[j].setAttribute("multi", true);
		else
			para.childNodes[j].removeAttribute("multi");
		para.childNodes[j].title = para.childNodes[j].className.replace(/\s+/g, ",");
	}
	
	range.collapse();
	sel.removeAllRanges();
	sel.addRange(range);
	tsv.refreshLine(para); 
	display.checkEntities(doc);
	tsv.saveIntoDB(db, doc);
	return true;
}


function updateLayer(combo) {
	document.body.className = "active-" + combo.options[combo.selectedIndex].value.toLowerCase();
}

function loadDoc(cname, txt, fName, cont) {
	db.transaction(function(tx) {
		tx.executeSql('CREATE TABLE IF NOT EXISTS document (name, description)', [], null, onError);
		tx.executeSql('SELECT * FROM document', [], function(tx, results) {
			var bResult = document.querySelector("#getresults");
			if (!cname)
				bResult.className = "listofdocuments";
			else
				bResult.className = cname;
			bResult.dataResults = [];
			bResult.dataDescs = [];
			bResult.dataTxt = "";
			bResult.fName = "";
			bResult.contTxt = "";
			for (var i=0; i<results.rows.length; i++) {
				bResult.dataResults.push(results.rows[i].name);
				bResult.dataDescs.push(results.rows[i].description || "");
			}
			if (txt)
				bResult.dataTxt = txt;
			if (fName)
				bResult.fName = fName;
			if (cont) {
				bResult.contTxt = cont;
			}
			bResult.click();
		}, onError);
	});
}

function createTsv(node) {
	createCustomPrompt(node, function(docName, description, text, cont) {
		docNameNode.innerHTML = docName;
		if (!cont)
			window.doc = tsv.loadDocument(docName, description, text);
		else {
			statusNode.innerHTML = "Load file...";
			window.doc = tsv.loadTaggedSentences(docName, description, text);
		}
		if (window.doc == null) {
			clearScreen();
			return;
		}
		display.display(window.doc);
		curLine = 1;
		docLine = 0;
		var para = document.querySelector(".para");
		tsv.refreshDocument();
		tsv.saveIntoDB(window.db, window.doc);
		getCurrentSelection();
		statusNode.innerHTML = "";
	});
}

function createTdf(node) {
	createCustomPrompt(node, function(docName, description, text, cont) {
		docNameNode.innerHTML = docName;
		statusNode.innerHTML = "Load file...";
		window.doc = tsv.loadTokenizedData(docName, description, text);
		if (window.doc == null) {
			alert("Window.doc is null")
			clearScreen();
			return;
		}
		display.display();
		curLine = 1;
		docLine = 0;
		tsv.refreshDocument();
		tsv.saveIntoDB(window.db, window.doc);
		getCurrentSelection();
		statusNode.innerHTML = "";
	});
}

function createTxt(node) {
	createCustomPrompt(node, function(docName, description, text) {
		docNameNode.innerHTML = docName;
		window.doc = tsv.loadPlainText(docName, description, text);
		var para = document.querySelector(".para");
		display.display(window.doc);
		curLine = 1;
		docLine = 0;
		tsv.refreshDocument();
		tsv.saveIntoDB(window.db, window.doc);
		getCurrentSelection();
		statusNode.innerHTML = "";
	});
}

function canGetResults(node) {
	if(node.className == "listofdocuments" || node.className == "removedocument") {
		if (!node.dataResults || node.dataResults.length == 0) {
			alert("Your DB doesn't contain any document yet.");
		}
		else {
			createCustomPrompt(node, function(docName) {
				if (node.className == "listofdocuments") {
					docNameNode.innerHTML = docName;
					doc = tsv.loadDocumentFromDB(docName);
				}
				else
					tsv.deleteDocumentFormDB(window.db, docName);
			});
		}
	}
	else if (node.className == "loadtsv") {
		createTsv(node);
	}
	else if (node.className == "loadtdf") {
		createTdf(node);
	}
	else if(node.className == "wex") {
		updateWexInfo(node);
	}
	else
		createTxt(node);
}

function canRedisplay(node) {
	docLine = 0;
	display.display(doc);
	getCurrentSelection();
}

function configLayersDialog() {
	createCustomPrompt(getConfigCopy(NerConfig));
}

function getConfigCopy(config, result) {
	var cConfig = [];
	if (result) {
		cConfig = result;
		for (var i=0; i<cConfig.length; i++) {
			cConfig.pop();
		}
	}
	for (var i=0; i<config.length; i++) {
		cConfig.push(config[i].copyTo(new NerConfigEntry()));
	}
	cConfig.className = "nerconfig";
	return cConfig;
}

function createCustomPrompt(node, callback) {
	    if(document.getElementById("customDialog")) 
	    	return;
	    var title = "", subtitle = "";
	    var needRestart = false;
    	var arcombo = [];
	    if (node.className == "listofdocuments") {
	    	title = "LOAD DOCUMENT";
	    	subtitle = "Choose your document from the list<br/>";
	    }
	    else if(node.className == "removedocument") {
	    	title = "REMOVE DOCUMENT";
	    	subtitle = "Choose your document from the list<br/>";	    	
	    }
	    else if(node.className == "loadtsv" || node.className == "loadtxt") {
	    	title = "CREATE DOCUMENT";
	    	subtitle = "Enter name and description of the document<br/>";
	    }
	    else if(node.className == "nerconfig") {
	    	title = "ENTITY RENDERING";
	    	subtitle = "Choose colors and shortcuts";
	    }
	    else if(node.className == "wex") {
	    	title = "UPDATE WEX INFO";
	    	subtitle = "Enter server name and your credentials";
	    }
	    var mObj = document.querySelector("#mainPanel").appendChild(document.createElement("div"));
	    mObj.id = "customDialog";
	    mObj.style.position = "absolute";
	    mObj.style.boxShadow = "0px 8px 16px 0px rgba(0,0,0,0.9)";
	    mObj.style.display = "block";
	    mObj.style.width = "400px";
	    mObj.style.height = "300px";
	    mObj.style.left = "500px";
	    mObj.style.bottom = "400px";
	    mObj.style.textAlign = "center";
	    var alertObj = mObj.appendChild(document.createElement("div"));
	    alertObj.id = "alertBox";
	    var h1 = alertObj.appendChild(document.createElement("h1"));
	    h1.appendChild(document.createTextNode(title));
	    var msg = alertObj.appendChild(document.createElement("p"));
	    msg.innerHTML = subtitle;
	    msg.style.position = "relative";
	    msg.style.top = "-10pt";
	    
	    if (node.className == "listofdocuments" || node.className == "removedocument") {
		    var combo = alertObj.appendChild(document.createElement("select"));
		    combo.style.width = "70%";
		    combo.onchange = function(e) {
		    	var dInfo = document.querySelector("#divinfo");
		    	if (e.target.selectedIndex == 0)
		    		dInfo.innerHTML = "";
		    	else
		    		dInfo.innerHTML = e.target.options[e.target.selectedIndex].value || "";
		    };
		    var option = document.createElement("option");
		    option.text = "Not selected";
		    combo.add(option);
		    for (var i=0; i<node.dataResults.length; i++) {
		    	option = document.createElement("option");
		    	option.text = node.dataResults[i];
		    	option.value = node.dataDescs[i];
		    	combo.add(option);
		    }
		    var divInfo = alertObj.appendChild(document.createElement("div"));
		    divInfo.style.paddingTop = "20px";
		    divInfo.style.width= "80%";
		    divInfo.style.fontSize = "small";
		    divInfo.id = "divinfo";
	    }
	    else if(node.className != "nerconfig" && node.className != "wex") {
	    	var cont = alertObj.appendChild(document.createElement("div"));
	    	cont.style.textAlign = "left";
	    	cont.style.width = "80%";
	    	cont.style.position = "absolute";
	    	cont.style.right = "40px";
	    	cont.style.top = "110px";
	    	var lab1 = cont.appendChild(document.createElement("div"));
	    	lab1.innerHTML = "Name of the document <span style='color: red;'>(required)</span>";
	    	var dInp1 = cont.appendChild(document.createElement("div"));
	    	var inp1 = dInp1.appendChild(document.createElement("input"));
	    	inp1.style.width = "100%";
	    	inp1.onchange = function() {lab3.innerHTML = "";};
	    	inp1.id = "inp1";
	    	if (node.fName)
	    		inp1.value = node.fName;
	    	var lab2 = cont.appendChild(document.createElement("div"));
	    	lab2.innerHTML = "Description of the document (optional)";
	    	lab2.style.marginTop = "7px";
	    	var dInp2 = cont.appendChild(document.createElement("div"));
	    	var inp2 = dInp2.appendChild(document.createElement("input"));
	    	inp2.style.width = "100%";
	    	inp2.id = "inp2";
	    	var lab3 = cont.appendChild(document.createElement("div"));
	    	lab3.style.marginTop = "10px";
	    	lab3.style.textAlign = "center";
	    	lab3.style.color = "red";
	    }
	    else if(node.className == "wex") {
	    	var cont = alertObj.appendChild(document.createElement("div"));
	    	cont.style.textAlign = "left";
	    	cont.style.width = "80%";
	    	cont.style.position = "absolute";
	    	cont.style.right = "40px";
	    	cont.style.top = "95px";
	    	var lab1 = cont.appendChild(document.createElement("div"));
	    	lab1.innerHTML = "Server:";
	    	var dInp1 = cont.appendChild(document.createElement("div"));
	    	var inp1 = dInp1.appendChild(document.createElement("input"));
	    	inp1.value = wexServer;
	    	inp1.style.width = "100%";
	    	inp1.id = "inp1";
	    	
	    	var lab2 = cont.appendChild(document.createElement("div"));
	    	lab2.innerHTML = "User name:";
	    	lab2.style.marginTop = "7px";
	    	var dInp2 = cont.appendChild(document.createElement("div"));
	    	var inp2 = dInp2.appendChild(document.createElement("input"));
	    	inp2.value = wexUser;
	    	inp2.style.width = "100%";
	    	inp2.id = "inp2";

	    	var lab3 = cont.appendChild(document.createElement("div"));
	    	lab3.innerHTML = "Password:";
	    	lab3.style.marginTop = "7px";
	    	var dInp3 = cont.appendChild(document.createElement("div"));
	    	var inp3 = dInp3.appendChild(document.createElement("input"));
	    	inp3.type = "password";
	    	inp3.value = wexPswd;
	    	inp3.style.width = "100%";
	    	inp3.id = "inp3";

	    }
	    else {
	    	var cont = alertObj.appendChild(document.createElement("div"));
	    	cont.style.textAlign = "left";
	    	cont.style.width = "80%";
	    	cont.style.position = "absolute";
	    	cont.style.right = "40px";
	    	cont.style.top = "110px";
	    	var labs = ["Entity name", "Color", "Shortcut"];
	    	var fields = ["ename", "color", "shortcut"];
	    	for (var ic = 0; ic < 2; ic++) {
		    	var lab1 = cont.appendChild(document.createElement("div"));
		    	lab1.innerHTML = labs[ic];
			    var combo = cont.appendChild(document.createElement("select"));
			    arcombo.push(combo);
			    combo.style.width = "100%";
			    combo.id = fields[ic];
		    	if (ic > 0) {
		    		combo.style.position = lab1.style.position = "relative";
		    		combo.style.top = lab1.style.top = "" + 5*ic + "px";
				    combo.onchange = function(e) {
				    	node[arcombo[0].selectedIndex][e.target.id] = e.target.value;
				    	if (e.target.id == "color") {
				    		e.target.style.backgroundColor = e.target.value;
				    		needRestart = true;
				    	}
				    };
		    	}
		    	else {
				    combo.onchange = function(e) {
				    	for (var j=0; j < arcombo[1].options.length; j++) {
				    		if (arcombo[1].options[j].value == node[e.target.selectedIndex].color) {
				    			arcombo[1].selectedIndex = j;
				    			arcombo[1].style.backgroundColor = arcombo[1].options[j].value;
				    			break;
				    		}
				    	}
				    	sinp1.value = node[e.target.selectedIndex].shortcut;
				    };		    		
		    	}
			    var countOptions = ic == 0? node.length : COLORS.length;
			    var ind = 0;
			    for (var i=0; i<countOptions; i++) {
			    	option = document.createElement("option");
			    	var txt = "", val = "";
			    	if (ic == 0) {
			    		if (node[i].category == "")
			    			txt = node[i].ename;
			    		else
			    			txt = node[i].category + " -> " + node[i].ename;
			    		val = node[i].ename;
			    	}
			    	else if(ic == 1) {
			    		txt = val = COLORS[i];
			    		if (txt == node[arcombo[0].selectedIndex].color)
			    			ind = i;
			    	}
			    	option.text = txt;
			    	option.value = val;
			    	if (ic == 1)
			    		option.style.backgroundColor = txt;
			    	else
			    		option.text = txt;
			    	combo.add(option);
			    }
			    if (ic > 0)
			    	combo.selectedIndex = ind;
			    if (ic == 1) {
			    	combo.style.backgroundColor = combo.options[combo.selectedIndex].value;
			    }
	    	}
	    	var labsh = cont.appendChild(document.createElement("div"));
	    	labsh.innerHTML = "Shortcut";
	    	var dsInp1 = cont.appendChild(document.createElement("div"));
    		labsh.style.position = dsInp1.style.position = "relative";
    		labsh.style.top = dsInp1.style.top = "" + 5*ic + "px";
	    	var sinp1 = dsInp1.appendChild(document.createElement("input"));
	    	sinp1.style.width = "100%";
	    	sinp1.value = node[0].shortcut;
	    	sinp1.onchange = sinp1.onkeyup = function(e) {
	    		if (sinp1.value.length > 1)
	    			sinp1.value = sinp1.value.substring(0,1);
	    		node[arcombo[0].selectedIndex].shortcut = sinp1.value;
	    	}
	    	sinp1.onkeydown = function (e) {
	    		if (e.which == 13)
	    			node[arcombo[0].selectedIndex].shortcut = sinp1.value;
	    	};
	    	sinp1.id = "inp1";
	    }
	    var divInfo = alertObj.appendChild(document.createElement("div"));
	    divInfo.style.paddingTop = "20px";
	    divInfo.style.width= "80%";
	    divInfo.style.fontSize = "small";
	    divInfo.id = "divinfo";
	    var div = alertObj.appendChild(document.createElement("div"));
	    div.className = node.className == "listofdocuments"? "dialogbtnpanel" : "dialogbtnpanel tsv";
	    var btnOK = div.appendChild(document.createElement("a"));
	    btnOK.id = "okBtn";
	    btnOK.className ="dialogbtn";
	    btnOK.appendChild(document.createTextNode(node.className != "nerconfig"? " OK! " : "Save"));
	    btnOK.href = "#";
	    var btnCancel = div.appendChild(document.createElement("a"));
	    btnCancel.id = "cancelBtn";
	    btnCancel.appendChild(document.createTextNode("Cancel"));
	    btnCancel.href = "#";
	    btnCancel.className = "dialogbtn";
	    node.finalResult = [];
	    if (node.className == "listofdocuments" || node.className == "removedocument") {
		    btnCancel.focus();
		    btnOK.onclick = function() {
		    	if (combo.selectedIndex == 0) return;
		    	var docName = combo.options[combo.selectedIndex].text;
		    	document.querySelector("#mainPanel").removeChild(mObj);
		    	clearScreen();
	    		callback(docName);
		    };
	    }
	    else if (node.className == "nerconfig") {
		    btnCancel.focus();
		    btnOK.onclick = function() {
		    	NerConfig = node.slice(0);
		    	saveConfig();
		    	updateStyleSheet();
		    	display.checkShortcuts();
		    	document.querySelector("#mainPanel").removeChild(mObj);
		    	if (needRestart)
		    		alert("Restart Tagger to apply new colors");
		    };	    	
	    }
	    else if(node.className == "wex") {
		    btnCancel.focus();
		    btnOK.onclick = function() {
		    	wexServer = inp1.value;
		    	wexUser = inp2.value;
		    	wexPswd = inp3.value;
		    	document.querySelector("#mainPanel").removeChild(mObj);
		    }
	    }
	    else {
	    	inp1.focus();
	    	inp1.onkeydown = function (e) {
	    		if (e.which == 13)
	    			btnOK.click();
	    	};
		    btnOK.onclick = function() {
		    	if (!inp1.value || inp1.value.trim().length == 0) return;
		    	var docName = inp1.value.trim();
		    	for (var i=0; i<node.dataResults.length; i++) {
		    		if (docName.toLowerCase() == node.dataResults[i].toLowerCase()) {
		    			lab3.innerHTML = "Document with this name already exists.";
		    			return;
		    		}
		    	}
		    	var desc = inp2.value? inp2.value.trim() : "";
		    	document.querySelector("#mainPanel").removeChild(mObj);
		    	clearScreen();
		    	callback(docName, desc, node.dataTxt, node.contTxt);
		    };	    	
	    }
	    btnCancel.onclick = function() {
	    	document.querySelector("#mainPanel").removeChild(mObj); 
	    };
}

function clearScreen() {
	var wPanel = document.querySelector("#workArea");
	statusNode.innerHTML = "";
	document.querySelector("#entityText").value = "";
	document.querySelector("#textLine").value = "";
	document.querySelector("#textPosition").value = "";
	document.querySelector("#textLength").value = "";
	document.querySelector("#tdall").innerHTML = "0";
	document.querySelector("#entityType").selectedIndex = 0;
	var stab = document.querySelector("#summaryTableID");
	for (var i=0; i<stab.childNodes.length; i++) {
		if (stab.childNodes[i].nodeType == 1 && stab.childNodes[i].tagName.toLowerCase() == "tr")
			stab.childNodes[i].lastChild.innerHTML = "0";
	}		
	document.querySelector("#sumid").style.display = "block";
	
	setSpanInEdit(false);
	if (!isParaEditable) {
		showSummarySection();
		display.decorateResults(doc, LastTestResults, false);
	}
	wPanel.innerHTML = "";
	docNameNode.innerHTML = "";
	curLine = 1;
	docLine = 0;
	minLine = 1;
	doc = null;
}

function setSpanInEdit(inedit) {
	if (spanInEdit == inedit)
		return;
	spanInEdit = inedit;
	var toolspanel = document.querySelector(".toolsPanel");
	if (inedit)
		toolspanel.classList.toggle("infocus");
	else
		toolspanel.classList.remove("infocus");
}

function changeDefaultDirection() {
	var wa = document.querySelector("#workArea");
	if (wa.classList.contains("rtl")) {
		wa.classList.remove("rtl");
		wa.classList.add("ltr");
	}
	else {
		wa.classList.remove("ltr");
		wa.classList.add("rtl");		
	} 
	defaultDir = wa.className;
}

function searchEntity(move) {
	if (!doc)
		return;
	setSpanInEdit(true);
	var node = document.querySelector("#activeLayer");
	var layer = node.options[node.selectedIndex].value.toLowerCase();
	var entities = [];
	var found = -1, pos = 0, line = 0, len = 0, type = " ";
	for (var ln = 0; ln < doc.lines.length; ln++) {
		for (var i=0; i<doc.lines[ln].entities.length; i++) {
			var entity = doc.lines[ln].entities[i];
			var ind = -1;
			var category = "";
			var skeep = false;
			if (layer != "none") {
				for (var k=0; k<NerConfig.length; k++) {
					if (entity.classes == NerConfig[k].ename.toLowerCase()) {
						category =  NerConfig[k].category.toLowerCase();
						if (entity.classes != layer && category != layer) {
							skeep = true;
						}
						break;
					}
				}
				if (skeep)
					continue;
			}
			for (var j =0; j<entities.length; j++) {
				if (entity.line > entities[j].line || (entity.line == entities[j].line && entity.begin > entities[j].begin))
					continue;
				else if(entity.line < entities[j].line || (entity.line == entities[j].line && entity.begin < entities[j].begin) || ((entity.line == entities[j].line && entity.begin == entities[j].begin) && (entity.classes < entities[j].classes))) {
					entities.splice(j,0,entity);
					ind = j;
					break;
				}
			}
			if (ind < 0) {
				entities.push(entity);
				ind = entities.length - 1;
			}
		}
	}
	var typeCombo = document.querySelector("#entityType"), posNode = document.querySelector("#textPosition");
	var textNode = document.querySelector("#entityText"), lengthNode = document.querySelector("#textLength");
	var lineNode = document.querySelector("#textLine");
	var eType = typeCombo.value.toLowerCase();
	if (eType == "") {
		type == " ";
	}
	else {
		type = eType;
	}

	len = (isNaN(parseInt(lengthNode.value))? 0 : parseInt(lengthNode.value));
	
	if (posNode.value != "") {
		line = parseInt(lineNode.value) - 1;
		pos = parseInt(posNode.value);
	}
	else {
		pos = -1;
		line = -1;
	}

	if (move%2 == 1) {
		if (move == 1) {
			pos = -1;
			line = -1;
			type = " ";
		}
		else
			pos += len;
		for (i=0; i<entities.length; i++) {
			if (entities[i].line > line || (entities[i].line == line && entities[i].begin > pos) || (entities[i].line == line && entities[i].begin == pos && entities[i].classes > type)) {
				found = i;
				break;
			}
		}
	}
	else {
		if (move == 4) {
			pos = doc.lines[doc.lines.length-1].text.length;
			line = doc.lines.length-1;
			type = "z";
		}
		for (i=entities.length-1; i>=0; i--) {
			if (entities[i].line < line || (entities[i].line == line && entities[i].begin < pos) || (entities[i].line == line && entities[i].begin == pos && entities[i].classes < type)) {
				found = i;
				break;
			}
		}
	}
	
	if (found >= 0) {
		for (i=0; i<typeCombo.options.length; i++) {
			if (entities[found].classes == typeCombo.options[i].value.toLowerCase()) {
				typeCombo.selectedIndex = i;
				break;
			}
		}
		lineNode.value = entities[found].line + 1;
		posNode.value = entities[found].begin;
		lengthNode.value = entities[found].end - entities[found].begin /*+ 1*/;
		textNode.value = doc.lines[entities[found].line].text.substring(entities[found].begin, entities[found].end /*+ 1*/);
		docLine = entities[found].line;
		displayView(docLine);
		//curLine = docLine%100 + 1;
		var sel = window.getSelection();
		var range = document.createRange();
		var para = document.querySelector(".para .line" + curLine);
		para.focus();
		range.selectNodeContents(para);
		range.setStartBefore(para.childNodes[entities[found].begin]);
		range.setEndAfter(para.childNodes[entities[found].end /**/- 1]);
		sel.removeAllRanges();
		sel.addRange(range);
	}
}

function getCurrentSelection() {
	var sel = window.getSelection();
	var range = sel.getRangeAt(0);
	var span;
	var para = document.activeElement;
	if (para.tagName === "span")
		para = para.parentNode;
	curLine = parseInt(para.className.substring(para.className.indexOf("line line") + 9));
	docLine = curLine + minLine -2;
	var rg = document.createRange(), startPos, endPos;
	rg.selectNodeContents(para);
	rg.setEnd(range.startContainer, range.startOffset);
	span = document.createElement("span");
	span.appendChild(rg.cloneContents());
	startpos = span.textContent.length;
	
	document.querySelector("#entityText").value = "";
	document.querySelector("#textLine").value = "" + (docLine + 1);
	document.querySelector("#textPosition").value = "" + startpos;
	document.querySelector("#textLength").value = "";
	document.querySelector("#entityType").selectedIndex = 0;
	if (showDetails) {
		syncWithLine = true;
		showTestDetails();
	}
}

function getCurrentPos() {
	var sel = window.getSelection();
	var range = sel.getRangeAt(0);
	var span;
	var para = document.activeElement;
	if (para.tagName === "span")
		para = para.parentNode;
	curLine = parseInt(para.className.substring(para.className.indexOf("line line") + 9));
	docLine = curLine + minLine -2;
	//alert("Call getCurrentPos: curLine=" + curLine + ", docLine=" + docLine + ", minLine=" + minLine);
	var rg = document.createRange(), startPos, endPos;
	rg.selectNodeContents(para);
	rg.setEnd(range.startContainer, range.startOffset);
	span = document.createElement("span");
	span.appendChild(rg.cloneContents());
	return span.textContent.length;
}
	
function searchTextView() {
	var div = document.querySelector("#searchDiv");
	div.style.display="inline-block";
	var inp = document.querySelector("#searchPat");
	inp.focus();
}

function searchText(e) {
	statusNode.innerHTML = "";
	var node = e.target;
	var val = node.value;
	if (e.which == 13 || e.which == 27) {
		var div = document.querySelector("#searchDiv");
		div.style.display="none";
		if (e.which == 27 || val == "") {
			searchPattern = "";
			return;
		}
	}
	else
		return;
	var pos = document.querySelector("#textPosition").value;
	var line = document.querySelector("#textLine").value;	
	if (pos == "") {
		pos = 0;
		line = 0;
	}
	else {
		line = parseInt(line) - 1;
		pos = parseInt(pos);
	}
	var startLine = line, startPos = pos;
	
	if (searchPattern != "")
		pos++;
	var ind = -1;
	for (var ln = line; ln < doc.lines.length - 1; ln++) {
		ind = doc.lines[ln].text.substring((ln == line? pos : 0)).indexOf(val);
		if (ind >= 0) {
			pos = ind + (ln == line? pos : 0);
			line = ln;
			break;
		}
	}
	if (ind < 0) {
		statusNode.innerHTML = "Pattern isn't found";
		pos = ind = line = 0;
		val = "";
		line = startLine;
		pos = startPos;
	}
	searchPattern = val;
	docLine = line;
	displayView(docLine);
	//curLine = docLine%100 + 1;
	var para = document.querySelector(".para .line" + curLine);
	para.focus();
	var sel = window.getSelection();
	var rg = document.createRange();
	rg.setStartBefore(para.childNodes[pos]);
	if (val)
		rg.setEndAfter(para.childNodes[pos + (val.length - 1)]);
	else
		rg.setEndBefore(para.childNodes[pos]);
	sel.removeAllRanges();
	sel.addRange(rg);
	getCurrentSelection();
}

function stopSearch(node) {
}

function moveToPos(node) {
	var lineNum, newPos = 0;
	if (node.id === "textLine") {
		lineNum = node.value;
		newPos = document.querySelector('#textPosition').value;
	}
	else {
		lineNum = document.querySelector('#textLine').value;
		newPos = node.value;
	}
	if (!isNaN(parseInt(lineNum)) && !isNaN(parseInt(newPos))) {
		lineNum = parseInt(lineNum);
		newPos = parseInt(newPos);
		if (lineNum <= 0)
			lineNum = 1;
		if (newPos < 0)
			newPos = 0;
		lineNum--;
		if (lineNum >= doc.lines.length) {
			alert("Current view doesn't have so many lines. Selection is set to the last line of the view.");
			lineNum = doc.lines.length - 1;			
		}
		if (newPos > doc.lines[lineNum].text.length) {
			alert("Selected line doesn't have so many characters. Selection is set to the end of this line.");
			newPos = doc.lines[lineNum].text.length;
		}
	}
	docLine = lineNum;
	displayView(lineNum);
	var div = document.querySelector(".para .line" + curLine);
	div.focus();
	var sel = window.getSelection();
	var rg = document.createRange();
	rg.selectNodeContents(div);
	if (newPos < doc.lines[lineNum].text.length) {
		rg.setStartBefore(div.childNodes[newPos]);
		rg.setEndBefore(div.childNodes[newPos]);
	}
	else {
		rg.setStart(div.childNodes[newPos-1],1);
		rg.setEnd(div.childNodes[newPos-1],1);
	}
	sel.removeAllRanges();
	sel.addRange(rg);
	getCurrentSelection();
}

function markLine(node, type) {
	var cl = node.className;
	var n = parseInt(cl.substring(cl.indexOf("line line") + 9)) - 1;
	var meta;
	if (type == 120)
		meta = "locked";
	else if(type == 121)
		meta = "updated";
	else
		meta = " ";
	node.setAttribute("data-meta", meta);
	doc.lines[n+minLine-1].meta = meta;
	tsv.saveIntoDB(db, doc);
}

function setTokenizerPath() {
	var tPath = prompt("Please enter full path to the directory, containing jar files", jarDir).trim();
	if (!tPath)
		return;
	if (tPath === "default") {
		var mypath = require('path');
		var pPath = mypath.dirname(process.execPath);
		if (pPath.indexOf("nwjs") > 0) {
			pPath = pPath.substring(0, pPath.indexOf("nwjs"));
		}
		jarDir = pPath + "NerTagger\\lib";
		alert("The default path is: " + jarDir);
		return;
	}
	try {
		  fs.accessSync(tPath);
	} catch (err) {
		  alert('This directory doesn\'t exist. Previous path isn\'t changed.');
		  return;
	}
	/*
	if (/ /.test(tPath)) {
		alert("Spaces in the names of directories or files are not permitted here. Previous path isn't changed.");
		return;
	}
	*/
	jarDir = tPath;
}

function setExtModelLauncherPath() {
	var tPath = prompt("Please enter full path to the directory, containing model's launcher", emlDir).trim();
	if (!tPath)
		return;
	if (tPath === "default") {
		var mypath = require('path');
		var pPath = mypath.dirname(process.execPath);
		if (pPath.indexOf("nwjs") > 0) {
			pPath = pPath.substring(0, pPath.indexOf("nwjs"));
		}
		emlDir = pPath + "pyscripts";
		alert("The default path is: " + emlDir);
		return;
	}
	try {
		  fs.accessSync(tPath);
	} catch (err) {
		  alert('This directory doesn\'t exist. Previous path isn\'t changed.');
		  return;
	}
	/*
	if (/ /.test(tPath)) {
		alert("Spaces in the names of directories or files are not permitted here. Previous path isn't changed.");
		return;
	}
	*/
	emlDir = tPath;
}

function showErrorsInTDF(cbox) {
	defShowErrors = cbox.checked;
	if (!defShowErrors) {
		document.querySelector("#debugcbox").checked = false;
		defShowDebug = false;
	}
}

function showDebugInTDF(cbox) {
	if (defShowErrors)
		defShowDebug = cbox.checked;
	else
		cbox.checked = false;
}

function decorateTestResults(cbox) {
	defDecorResults = cbox.checked;
	if (!defDecorResults) {
		document.querySelector("#decorcbox").checked = false;
	}
	display.decorateResults(doc, LastTestResults, !isParaEditable);
}

function showExactDets(cbox) {
	defShowEd = cbox.checked;
}

function getBusyIndicator(node) {
	if (!node)
		node = statusNode;
	var busyInd = document.createElement("div");
	busyInd.className = "busyInd";
	node.appendChild(busyInd);
}

function stopBusyIndicator() {
	statusNode.lastChild.classList.add("nvis");
}

function testEngine() {
	if (!doc) {
		alert("Load some document to check it with NerEngine!");
		return;
	}
	if (!isParaEditable) {
		showSummarySection()
		display.decorateResults(doc, LastTestResults, false);
	}
	var paras = "";
	for (var i=0; i<doc.lines.length; i++) {
		paras += doc.lines[i].text + "\n"; 
	}
	paras += "+END+";
	obj = {"input": paras, "shell": true};
	var result = spawn("java -Dfile.encoding=UTF-8 -jar " + jarDir + "\\wn2.jar", obj);
	displayEngineResults(tsv.handleEngineResponce(result.stdout));
}

function displayEngineResults(comp, ext) {
	if (!comp)
		return;
	isParaEditable = false;	
	LastTestResults = null;
	var results = new WexResults(comp.gold.length, comp, doc.name, ext);
	for (var k=0; k< comp.actual.length; k++) {
		aEnt = comp.actual[k];
		var found = false;
		for (var i=0; i < comp.gold.length; i++) {
			var gEnt = comp.gold[i];
			if (gEnt.line < aEnt.line)
				continue;
			else if(gEnt.line > aEnt.line)
				break;
			if (aEnt.classes.toLowerCase() != gEnt.classes.toLowerCase()) {
				continue;			
			}
			if (aEnt.begin == gEnt.begin && aEnt.end == gEnt.end-1) {
				results.exactlyFound++;
				gEnt.found = true;
				gEnt.foundType = 2;
				aEnt.foundType = 2;
				found = true;
				break;
			}
			else if((aEnt.begin >= gEnt.begin && aEnt.begin <= gEnt.end-1) || (aEnt.end > gEnt.begin && aEnt.end <= (gEnt.end-1)) || (aEnt.begin < gEnt.begin && aEnt.end > (gEnt.end-1))) {
				results.partiallyFound++;
				gEnt.found = true;
				gEnt.foundType = 1;
				aEnt.foundType = 1;
				found = true;
				break;
			}
		}
		if (!found) {
			results.falselyFound++;
		}
	}
	for (var i=0; i<comp.gold.length; i++) {
		if (!comp.gold[i].found) {
			results.notFound++;
		}
	}
	LastTestResults = JSON.parse(JSON.stringify(results));
	display.decorateResults(doc, LastTestResults, true);
	var sumdiv = document.querySelector("#sumid");
	sumdiv.style.display="none";
	document.querySelector("#wrlegend").innerHTML = "Test results (" + LastTestResults.docname + " -> " + LastTestResults.ext + ")";
	var wexdiv = document.querySelector("#wexresults");
	wexdiv.style.display="block";
	var wexFound = results.exactlyFound + results.partiallyFound + results.falselyFound;
	document.querySelector("#tdwexall").innerHTML = "" + results.tagged;
	document.querySelector("#tdwexfound").innerHTML = "" + wexFound;
	document.querySelector("#tdwexexact").innerHTML = "" + results.exactlyFound;
	document.querySelector("#tdwexpart").innerHTML = "" + results.partiallyFound;
	document.querySelector("#tdwexfals").innerHTML = "" + results.falselyFound;
	document.querySelector("#tdwexnotf").innerHTML = "" + results.notFound;
	var precision = wexFound > 0? results.exactlyFound/wexFound : 0;
	var recall = results.tagged > 0? results.exactlyFound/results.tagged : 0;
	document.querySelector("#tdwexprecision1").innerHTML = (wexFound > 0? parseFloat((results.exactlyFound/wexFound)*100).toFixed(1) : "0.0") + "%"; 
	document.querySelector("#tdwexrecall1").innerHTML = (results.tagged > 0? parseFloat((results.exactlyFound/results.tagged)*100).toFixed(1) : "0.0") + "%";
	document.querySelector("#tdwexfmeasure").innerHTML = (precision + recall > 0? parseFloat(2*(precision*recall/(precision + recall))*100).toFixed(1) : "0.0") + "%";
}

function showSummarySection() {
	var wexdiv = document.querySelector("#wexresults");
	wexdiv.style.display="none";
	var wexdet = document.querySelector("#wexdetails");
	wexdet.style.display="none";
	var sumdiv = document.querySelector("#sumid");
	sumdiv.style.display="block";
	isParaEditable = true;
	showDetails = false;
	display.decorateResults(doc, LastTestResults, false);
}

function prevTestDetails() {
	startInd = Math.max(0, startInd - linesInDet);
	showTestDetails();
}

function nextTestDetails() {
	startInd = Math.max(0, Math.min(startInd+linesInDet, LastTestResults.comp.actual.length - linesInDet));
	showTestDetails();
}

function showTestDetails(type) {
	var sumdiv = document.querySelector("#sumid");
	sumdiv.style.display="none";
	var wexdiv = document.querySelector("#wexresults");
	wexdiv.style.display="none";
	var wexdet = document.querySelector("#wexdetails");
	wexdet.style.display="block";
	document.querySelectorAll("#wexdetlines tr").forEach(function(tr) {
		tr.parentNode.removeChild(tr);
	});
	var wbody = document.querySelector("#wexdetlines");
	if (!showDetails || syncWithLine) {
		showDetails = true;
		syncWithLine = true;
		testLine = docLine;
		if (type)
			testDetailsType = type;
		startInd = 0;
	}
	document.querySelector("#wdlegend").innerHTML = "Test results (" +  (testDetailsType == 1? "found entities" : "source entities") + ")";
	var entities = testDetailsType == 1? LastTestResults.comp.actual : LastTestResults.comp.gold;
	if (!defShowEd)
		entities = entities.filter(function(value) {
			return value.foundType != 2;
		});
	if (syncWithLine) {
		var before = 0, after = 0;
		if (entities.length > linesInDet) {
			for (var i=0; i<entities.length; i++) {
				if (entities[i].line < testLine)
					before++;
				else
					after++;
			}
			if (after >= linesInDet)
				startInd = before;
			else
				startInd = Math.max(0, before-(linesInDet-after)-1);
		}
		syncWithLine = false;
	}
	try {
	for (var i=0; i<entities.length; i++) {
		if (i < startInd)
			continue;
		if (i > startInd + linesInDet)
			break;
		var wline = entities[i];
		var tr = document.createElement("tr");
		wbody.appendChild(tr);
		var td = document.createElement("td");
		td.style.width = "20%";
		if (doc && (doc.name == LastTestResults.docname)) {
			var anch = document.createElement("a");
			anch.href = "#";
			anch.innerHTML = wline.classes;
			anch.wline = wline;
			//anch.tdt = testDetailsType;
			anch.onclick = function(e) {
				moveToAndSelect(e.target);
			};
			td.appendChild(anch);
		}
		else {
			td.innerHTML = wline.classes;
		}
		tr.appendChild(td);
		td = document.createElement("td");
		td.style.width = "26%";
		td.innerHTML = wline.txt;
		tr.appendChild(td);
		
		td = document.createElement("td");
		td.style.width = "13%";
		td.style.textAlign = "right";
		td.innerHTML = "" + (wline.line + 1);
		tr.appendChild(td);
		
		td = document.createElement("td");
		td.style.width = "13%";
		td.style.textAlign = "right";
		td.innerHTML = "" + wline.begin;
		tr.appendChild(td);
		td = document.createElement("td");
		td.style.width = "13%";
		td.style.textAlign = "right";
		td.innerHTML = "" + (wline.end - wline.begin + (testDetailsType == 1? 1 : 0));
		tr.appendChild(td);
		td = document.createElement("td");
		td.style.width = "15%";
		td.style.paddingLeft = "15px";
		td.innerHTML = "";
		if (testDetailsType == 1)
			td.innerHTML = wline.foundType == 2? "Exct." : wline.foundType == 1? "Part." : "Fals.";
		else
			td.innerHTML = wline.found? (wline.foundType == 2? "Exct." : "Part.") : "NF";
		tr.appendChild(td);
	}
	} catch (e) {alert(e)}
}

function moveToAndSelect(anch) {
	var wline = anch.wline;
	docLine = wline.line;
	displayView(wline.line);
	var start = wline.begin;
	var len = wline.end - wline.begin + (testDetailsType == 1? 1 : 0);
	if (start + len > doc.lines[wline.line].text.length) {
		alert("Wrong position. Can't select the entity.");
		return;
	}
	var div = document.querySelector(".para .line" + (wline.line - minLine + 2));
	div.focus();
	var sel = window.getSelection();
	var rg = document.createRange();
	rg.selectNodeContents(div);
	if (start < div.childNodes.length) {
		rg.setEndBefore(div.childNodes[start + len]);
		rg.setStartBefore(div.childNodes[start]);
	}
	else {
		rg.setStart(div.childNodes[start-1],1);
		rg.setEnd(div.childNodes[start-1],1);
	}
	sel.removeAllRanges();
	sel.addRange(rg);
	getCurrentSelection();	
}

function showWexSection() {
	if (Object.keys(LastTestResults).length === 0 ) {
		statusNode.innerHTML = "You didn't test any file with NerEngine in the time of current session";
		return;
	}
	isParaEditable = false;
	showDetails = false;
	display.decorateResults(doc, LastTestResults, true);
	var sumdiv = document.querySelector("#sumid");
	sumdiv.style.display="none";
	var wexdet = document.querySelector("#wexdetails");
	wexdet.style.display="none";
	var wexdiv = document.querySelector("#wexresults");
	document.querySelector("#wrlegend").innerHTML = "Test results (" + LastTestResults.docname + " -> " + LastTestResults.ext + ")";	
	wexdiv.style.display="block";
	var results = JSON.parse(JSON.stringify(LastTestResults));
	var wexFound = results.exactlyFound + results.partiallyFound + results.falselyFound;
	document.querySelector("#tdwexall").innerHTML = "" + results.tagged;
	document.querySelector("#tdwexfound").innerHTML = "" + wexFound;
	document.querySelector("#tdwexexact").innerHTML = "" + results.exactlyFound;
	document.querySelector("#tdwexpart").innerHTML = "" + results.partiallyFound;
	document.querySelector("#tdwexfals").innerHTML = "" + results.falselyFound;
	document.querySelector("#tdwexnotf").innerHTML = "" + results.notFound;
	var precision = wexFound > 0? results.exactlyFound/wexFound : 0;
	var recall = results.tagged > 0? results.exactlyFound/results.tagged : 0;
	document.querySelector("#tdwexprecision1").innerHTML = (wexFound > 0? parseFloat((results.exactlyFound/wexFound)*100).toFixed(1) : "0.0") + "%"; 
	document.querySelector("#tdwexrecall1").innerHTML = (results.tagged > 0? parseFloat((results.exactlyFound/results.tagged)*100).toFixed(1) : "0.0") + "%";
	document.querySelector("#tdwexfmeasure").innerHTML = (precision + recall > 0? parseFloat(2*(precision*recall/(precision + recall))*100).toFixed(1) : "0.0") + "%";
}

function scrollWexDetails() {
	var wexdet = document.querySelector("#wexdetails");
	if (wexdet.style.display=="none")
		return;
	var cLine = document.querySelector("#textLine").value;
	var iLine = parseInt(cLine);
	if (!isNaN(iLine)) {
		testLine = iLine;
		syncWithLine = true;
		showTestDetails();
	}
	var wbody = document.querySelector("#wexdetlines");
	for (var i=0; i<wbody.childNodes.length; i++) {
		if (wbody.childNodes[i].nodeType != 1)
			continue;
		var txd = wbody.childNodes[i].childNodes[2].textContent;
		if (txd == cLine) {
			wbody.childNodes[i].scrollIntoView();
			break;
		}
	}
}

function displayView(line) {
	if (line >= minLine - 1 && line < minLine + 99) {
		curLine = line%100 + 1;
		return;
	}
	minLine = line - line%100 + 1;
	curLine = line%100 + 1;
	display.display();
}

function msg(txt) {
	var formsg = document.getElementById("formsg");
	formsg.data = txt;
	formsg.click();	
}

function changeStatus() {
	var formsg = document.getElementById("formsg");
	statusNode.innerHTML = (formsg.data? formsg.data : "");
}

function eDbg(text, entities) {
	var ttt = text + "\n";
	for (var i=0; i<entities.length; i++) {
		var entity = entities[i];
		ttt += "" + i + ". Name: " + entity.classes + ", begin: " + entity.begin + ", end: " + entity.end + "\n";
	}
	alert(ttt);			
}

var onError = function (tx, e) {
	  alert("There has been an error: " + e.message);
};

var onSuccess = function (tx, r) {
	  alert("OK");
};
