/**
 * 
 */

var tsv = (function() {
	var Document = (function() {
		var Document = function(name, description) {
			this.name = name;
			this.description = description;
			this.activeLayer = "all";
			this.lines = [];
		};
		return Document;
	})();
	
	var Line = (function() {
		var Line = function(text, doc) {
			this.text = text;
			this.document = doc;
			this.meta = " ";
			this.entities = [];
		};
		return Line;
	})();

	var Entity = (function() {
		var Entity = function(line, begin, end, classes, txt) {
			this.line = line;
			this.begin = begin;
			this.end = end;
			this.classes = classes;
			this.txt = txt || "";
			this.found = false;
			this.foundType = 0;
		};
		return Entity;
	})();

	var Comp = (function() {
		var Comp = function() {
			this.gold = [];
			this.actual = [];
		};
		return Comp;
	})();
	
	function onSucc() {
		alert("OK!");
	};

	function onEr(tx, e) {
		alert("There has been an error: " + e.message);
	};

	var names = ["Person", "Location", "Organization", "Date", "Time", "Duration", "Measure", "Money", "Ordinal", "Number", "Percent", "PhoneNumber", 
        "EmailAddress", "URL", "TwitterHandle", "Hashtag", "IPAddress", "JobTitle", "Facility", "GeographicFeature", "Product"];

	return {
		saveIntoDB: function(db, doc) {
			var i = 0, j = 0;
			for(i=0; i<doc.lines.length; i++) {
				for (j=0; j<doc.lines[i].entities.length; j++) {
					var entity = doc.lines[i].entities[j];
					if (entity.line != i) {
						//alert("Save: Enitity in line " + i + " has line " + entity.line);
						entity.line = i;
					}
				}
			}

			db.transaction(function (tx) {
				tx.executeSql('CREATE TABLE IF NOT EXISTS document (name, description)', [], null, onEr);
				tx.executeSql('DELETE FROM document WHERE name = ?', [doc.name], null, onEr); 
				tx.executeSql('INSERT INTO document (name, description) VALUES (?,?)', [doc.name, doc.description], null, onEr);
			});
			db.transaction(function (tx) {
				tx.executeSql('CREATE TABLE IF NOT EXISTS lines (docname, text, meta, entities integer)', [], null, onEr);
				tx.executeSql('DELETE FROM lines WHERE docname = ?', [doc.name], null, onEr);
				for (i=0; i<doc.lines.length; i++) {
					tx.executeSql('INSERT INTO lines (docname, text, meta, entities) VALUES (?,?,?,?)', [doc.name, doc.lines[i].text, 
						doc.lines[i].meta, doc.lines[i].entities.length], null, onEr);
				}
			});
			db.transaction(function (tx) {
				tx.executeSql('CREATE TABLE IF NOT EXISTS entities (docname, linenumber, entitynumber, classes,  begin integer, end integer)', [], null, onEr);
				tx.executeSql('DELETE FROM entities WHERE docname = ?', [doc.name], null, onEr);
				for(i=0; i<doc.lines.length; i++) {
					for (j=0; j<doc.lines[i].entities.length; j++) {
						var entity = doc.lines[i].entities[j];
						tx.executeSql('INSERT INTO entities (docname, linenumber, entitynumber, classes, begin, end) VALUES(?,?,?,?,?,?)',
								[doc.name, tools.formatKey(entity.line), tools.formatKey(j), entity.classes, entity.begin, entity.end], null, onEr);
					}
				}
			});
		},
		
		deleteDocumentFormDB: function(db, docname) {
			db.transaction(function (tx) {
				tx.executeSql('DELETE FROM entities WHERE docname = ?', [docname], null, onEr);
				tx.executeSql('DELETE FROM lines WHERE docname = ?', [docname], null, onEr);
				tx.executeSql('DELETE FROM document WHERE name = ?', [docname], null, onEr); 
			});			
		},
		
		loadDocumentFromDB: function(docName) {
			window.statusNode.innerHTML = 'Load document "' + docName + "'...";
			var redisplay = document.querySelector("#redisplay");
			db.transaction(function(tx) {
				tx.executeSql('SELECT * FROM document WHERE name=?', [docName], function(tx, results) {
					var row = results.rows[0];
					window.doc = new Document(row.name, row.description);
				}, onEr);
			});
			db.transaction(function(tx) {
				tx.executeSql('SELECT * FROM lines WHERE docname=?', [docName], function(tx, results) {
					for (var i=0; i<results.rows.length; i++) {
						var row = results.rows[i];
						var line = new Line(row.text, window.doc);
						line.meta = row.meta;
						window.doc.lines.push(line);
					}
				}, onEr);					
			});			
			db.transaction(function(tx) {
				tx.executeSql('SELECT * FROM entities WHERE docname=?', [docName], function(tx, results) {	
					try {
						for (var i=0; i<results.rows.length; i++) {
							var row = results.rows[i];
							var ind = tools.getIndex(row.linenumber);
							window.doc.lines[ind].entities.push(new Entity(ind, row.begin, row.end, row.classes));
						}
					} catch (e) {alert("Exception: " + e  + "\nLine: " + ind)};
					redisplay.click();
				}, onEr);											
			});
			return window.doc;
		},

		loadTaggedSentences: function(docName, desc, text) {
			var eTypes = ["person", "location", "organization", "jobtitle", "facility", "geographicfeature", "product", "money", "date", "mix"];
			text = text.replace(/\r/g, '');
			var arr = text.split("\n");
			var line = "";			
			var content = "";
			var subcontent = "";
			var type;
			var offset = 0;
			var t = arr[0];
			if (t.indexOf("$$ Type: ") !== 0) {
				type = "mix";
			}
			else        // got by crowlers
				type = t.substring(t.indexOf("$$ Type: ") + 9).replace(/\s*/g, '').toLowerCase();
			if (!eTypes.some(function(tt) {
				if (tt === type)
					return true;
			})) {
				alert("Wrong type of entity.");
				return null;						
			}
			if (type === "mix")
				return this.loadMixTypes(docName, desc, arr);
			else
				return this.loadOneType(docName, desc, type, arr);
		},
		
		loadOneType: function(docName, desc, type, arr) {
			var line = "";			
			var content = "";
			var sub = "";
			var curEntity = "";
			var arrEntity = [];
			var arrPos = [];
			var pos = {};
			var result = [];
			while(arr.length > 0) {
				line = arr.shift();
				if (line.indexOf("$$ Type: ") === 0)
					continue;
				if (line.indexOf("# ") === 0) {
					curEntity = line.substring(2, line.indexOf("--") - 1);
					arrEntity = curEntity.split(" ");
					continue;
				}
				if (!curEntity)
					continue;
				arrPos = [];
				if (line.match(/^\d*. /)) {
					line = line.substring(line.indexOf(". ") + 2);
					sub = line;
					var from = 0;
					if (type !== "money") {
						while (sub.indexOf(curEntity, from) >= 0) {
							arrPos.push({type: type, offset: sub.indexOf(curEntity, from), length: curEntity.length});
							from = sub.indexOf(curEntity, from) + curEntity.length;
						}
						if (type === "person" && arrEntity.length > 1) {
							for (var k = 0; k < arrEntity.length; k = k === 0? arrEntity.length-1 : arrEntity.length) {
								sub = line;
								var from = 0;
								while (sub.indexOf(arrEntity[k], from) >= 0) {
									var isFound = false;
									var offset = sub.indexOf(arrEntity[k], from);
									for (var j=0; j<arrPos.length; j++) {
										if (offset >= arrPos[j].offset && offset <= arrPos[j].offset + arrPos[j].length) {
											isFound = true;
											break;
										}
									}
									if (!isFound)
										arrPos.push({type: type, offset: sub.indexOf(arrEntity[k], from), length: arrEntity[k].length});
									from = sub.indexOf(arrEntity[k], from) + arrEntity[k].length;
								}
							}
						}
					}
					else {
						var earr = curEntity.split('\ ');
						if (/^\d*$/.test(earr[0]))
							earr.shift();
						var sre = "(\\d+(\\,\\d+)* )*" + earr[0] + "(ים|ות| אחד)*(?!פ|ן)(" + curEntity.substring(earr[0].length) + ")*";
						var re = new RegExp(sre, "g");
						var cnt = true;
						var ents = null;
						while((ents = re.exec(line)) !== null) {
							arrPos.push({type: type, offset: ents.index, length: ents[0].length});
						}
					}
					if (arrPos.length === 0)
						continue;
					var rLine = "";
					for (var l=0; l<arrPos.length; l++) {
						rLine += JSON.stringify(arrPos[l]);
					}
					rLine += " | " + line;
					result.push(rLine);
				}				
			}
			return this.loadMixTypes(docName, desc, result);
		},

		loadMixTypes: function(docName, desc, arr) {
			var text = "";
			var line;
			var i;

			var doc = new Document(docName, desc);
            try {
				for (i=0; i<arr.length; i++) {
					if (arr[i].indexOf("$$ Type:") == 0 || !arr[i])
						continue;
					var ents = [];
					var sep = arr[i].indexOf(" | ");
					text = (sep > 0? arr[i].substring(arr[i].indexOf(" | ") + 3) : arr[i]) + "\n";
					if (sep > 0) {
						var pref = arr[i].substring(0, arr[i].indexOf(" | "));
						ents = pref.match(/\{[^\{]*}/g);
					}
					var pureText = text.trim().replace(/ {2,}/g, " ");
					var line = new Line(pureText, doc);
					var fullMinus = 0;
					var spPos = [];
					var spOffs = [];
					for (var j=0; j<text.length-1; j++) {
						if (text.charAt(j) == " ") {
							if (text.charAt(j+1) == " ") {
								spPos.push(j);
								spOffs.push((spOffs.length > 0? spOffs[spOffs.length-1] : 0) + 1);
							}
						}
					}
					for (j=0; j<ents.length; j++) {
						var props = JSON.parse(ents[j]);
						if (props.type === "meta")
							line.meta = props.value;
						else {
							for (var k=spPos.length-1; k>=0; k--) {
								if (props.offset > spPos[k]) {
									props.offset -= spOffs[k];
									break;
								}
							}
							if (props.offset + props.length <= pureText.length)
								line.entities.push(new Entity(i, props.offset, props.offset + props.length, this.mapEntity(props.type)));
						}
					}
					//line.text = line.text.trim().replace(/ {2,}/g, " ")
					doc.lines.push(line);
					window.statusNode.innerHTML = "" + i;
				}
            } catch (e) {
            	alert("Line " + i + ", exception: " + e);
                window.statusNode.innerHTML = "";
    			return null;
            }
            window.statusNode.innerHTML = "";
			return doc;
		},

		loadTokenizedData: function(docname, desc, text) {
			var eTypes = ["person", "location", "organization"];
			var line;
			var i;
			var lineEnts = [];
			var lineText = "";
			var curEntry = null;
			var countLines = 0;
			var needSpace = false;
			var prevSpace = false;
			text = text.replace(/\r/g, '').replace(/\t/, ' ');
			var arr = text.split("\n");			
			var doc = new Document(docname, desc);
            try {
            	for (i=0; i<arr.length;i++) {            		
            		var row = arr[i];
        			if (row == null || row == "") {
        				if (curEntry != null) {
        					console.log("Warning (line " + countLines + "): entity ends without 'end' tag.");
        					lineEnts.push(curEntry);
        				}
        				if (!this.checkSentence(doc, lineText, lineEnts, countLines))
        					return null;
        				lineText = "";
        				lineEnts = [];
        				needSpace = false;
        				curEntry = null;
        				if (row == null)
        					break;
        				else {
        					countLines++;
        					continue;					
        				}
        			}
            		var rowArr = row.split(/ /);
            		var token = rowArr[0];
            		var tagArr = rowArr[1].split("_");
            		var entName = tagArr[0].toLowerCase();
            		var entType = tagArr[1];
            		var c = token.charAt(0);
        			if (token.length == 1 && !/\d/.test(c) && c < 'A' && !(c=='"' || c=="'" || c=="(" || c==")"))
        				needSpace = false;
        			lineText += (needSpace? " " : "") + token;
        			prevSpace = needSpace;
        			if (token.length == 1 && !/\d/.test(token.charAt(0)) && token.charAt(0) >= 'A')
        				needSpace = false;
        			else
        				needSpace = true;
        			if (!eTypes.some(function(name) {
        					if (name.indexOf(entName) === 0) {
        						return true;
        					}
        				})) {
        				if (curEntry != null) {
        					console.log("Warning (line " + countLines + "): entity ends without 'end' tag.");
        					lineEnts.push(curEntry);
        					curEntry = null;
        				}
        				continue;
        			}
        			
        			if (entType == "unique" || entType == "begin") {
        				if (curEntry != null) {
        					console.log("Warning (line " + countLines + "): new entity begins before previous ended.");
        					lineEnts.push(curEntry);
        					curEntry = null;
        				}
        				curEntry = new Entity();
        				curEntry.line = countLines;
        				curEntry.classes = entName;
        				curEntry.txt = token;
        				curEntry.begin = lineText.length - token.length;
        				curEntry.end = curEntry.begin + token.length;
        				if (entType == "unique") {
        					lineEnts.push(curEntry);
        					curEntry = null;					
        				}				
        			}
        			else {
        				if (curEntry == null) {
        					console.log("Error (line " + countLines + "): entity does't have 'begin' tag.");
        					continue;
        				}
        				if(prevSpace) {
        					curEntry.end++;
        					curEntry.txt += " ";
        				}
        				curEntry.end += token.length;
        				curEntry.txt += token;
        				if (entType == "end") {
        					lineEnts.push(curEntry);
        					curEntry = null;										
        				}
        			}			
            	}
            } catch (e) {
            	alert("Line " + i + ", exception: " + e);
                window.statusNode.innerHTML = "";
    			return null;
            }
            window.statusNode.innerHTML = "";
			return doc;
		},

		checkSentence: function(doc, lineText, lineEnts, countLines) {
			var line = new Line(lineText, doc);

			for (j=0; j<lineEnts.length; j++) {
				if (lineEnts[j].end > lineText.length) {
					console.log("Error (line " + countLines + "): entity is out of line.");
					alert("Error (line " + countLines + "): entity is out of line." +
							"\n Text: " + lineText + "\n Text length: " + lineText.length + 
							"\n Entity: " + lineEnts[j].txt + 
							"\n Begin: " + lineEnts[j].begin +
							"\n End: " + lineEnts[j].end);
				}
				else {
					//lineEnts[j].end--;
					line.entities.push(lineEnts[j]);
				}
			}
			if (line.entities.length > 0)
				doc.lines.push(line);
			return true;
		},
		
		mapEntity: function(type) {
			var result = "";
			names.some(function(name) {
				var uName = name.replace(/\s*/g, '').toLowerCase();
				if (uName.indexOf(type) === 0) {
					result = name;
					return true;
				}
			});
			return result.toLowerCase();
		},
		
		loadPlainText: function(docname, desc, txt) {
			var doc = window.doc = new Document(docname, desc);
			txt = txt.replace(/\r/g, "");
			var arrTxt = txt.split("\n");
			for (i=0; i<arrTxt.length; i++) {
				var line = new Line(arrTxt[i].trim().replace(/  /g, " ")+"\n", doc);
				doc.lines.push(line);
			}
			return doc;
		},
	
		exportTaggedSentences: function(fs, doc, path) {
			var result = "";
			var fl = defFileLines == 0? doc.lines.length : Math.min(doc.lines.length, defFileLines);
			var ost = doc.lines.length%fl;
			var qfiles = Math.floor(doc.lines.length/fl) + (ost > fl/2? 1 : 0);
			var rcount = 0;
			var fcount = 1;
			var sPath = path.substring(0, path.lastIndexOf("."));
			var ext = path.substring(path.lastIndexOf("."));
			var actPath = "";
			for (var i=0; i < doc.lines.length; i++) {
				var hasMeta = false;
				rcount++;
				if (rcount > fl && fcount < qfiles) {
					actPath = sPath + "_" + fcount + ext;
					fs.writeFileSync(actPath, result);
					result = "";
					rcount = 1;
					fcount++;
				}
				/*
				if (doc.lines[i].meta && doc.lines[i].meta !== " ") {
					result += "{\"type\":\"meta\", \"value\":\"" + doc.lines[i].meta + "\"}";
					hasMeta = true;
				}
				*/
				for (var j=0; j<doc.lines[i].entities.length; j++) {
					var ent = doc.lines[i].entities[j];
					result += "{\"type\":\"" + ent.classes + "\", \"offset\":" + ent.begin + ", \"length\":" + (ent.end - ent.begin + 1) + "}"; 
				}
				result += (hasMeta || doc.lines[i].entities.length > 0? " | " : "") + doc.lines[i].text + "\n"
			}
			fs.writeFileSync(qfiles == 1? path : (sPath + "_" + qfiles + ext), result);
		},

		exportEntities: function(fs, exec, doc, path) {
			var result = "";
			msg("Export entities"); 
			path = path.lastIndexOf(".") > 0? path : path + ".txt";
			var sPath = path.substring(0, path.lastIndexOf("."));
			var ext = path.substring(path.lastIndexOf("."));
			var fPath = sPath + "_tmp_" + ext;
			for (var i=0; i < doc.lines.length; i++) {
				result += "{\"entities\": [";
				for (var j=0; j<doc.lines[i].entities.length; j++) {
					var ent = doc.lines[i].entities[j];
					result += (j != 0 ? "," : "") +  "{\"type\":\"" + ent.classes + "\", \"offset\":" + ent.begin + ", \"length\":" + (ent.end - ent.begin) + "}"; 
				}
				result += "],\"line\":\"" +  doc.lines[i].text.replace(/\"/g, "\\\"").replace(/\\(?!\")/g, "\\\\") + "\"\}\n"
			}
			fs.writeFileSync(fPath, result);
			
			var obj = {"input": fPath};
			msg();
			var e = "java -Dfile.encoding=UTF-8 -jar " + jarDir + "\\wt.jar " + tdfType + (defShowErrors? " errors" : "") + (defShowDebug? "  debug" : "");
			result = exec(e, obj);
			alert(result);
			statusNode.innerHTML = "";
		},
		
		exportTextContent : function(fs, doc, path) {
			var result = "";
			var fl = defPlainFileLines == 0? doc.lines.length : Math.min(doc.lines.length, defPlainFileLines);
			var ost = doc.lines.length%fl;
			var qfiles = Math.floor(doc.lines.length/fl) + (ost > fl/2? 1 : 0);
			var rcount = 0;
			var fcount = 1;
			var sPath = path.substring(0, path.lastIndexOf("."));
			var ext = path.substring(path.lastIndexOf("."));
			var actPath = "";
			for (var i=0; i < doc.lines.length; i++) {
				rcount++;
				if (rcount > fl && fcount < qfiles) {
					actPath = sPath + "_" + fcount + ext;
					fs.writeFileSync(actPath, result);
					result = "";
					rcount = 1;
					fcount++;
				}
				result += doc.lines[i].text + "\n";
			}
			fs.writeFileSync(qfiles == 1? path : (sPath + "_" + qfiles + ext), result);
		},
		
		handleEngineResponce : function(responce) {
			var comp = new Comp();
			respArr = responce.toString().trim().split("\n");
			if (respArr.length != doc.lines.length) {
				alert("Length of responce (" + respArr.length + ") isn't equal to the length of document (" + doc.lines.length + ").");
				return null;
			}
			for (var i=0; i<doc.lines.length; i++) { 
				for (var j=0; j<doc.lines[i].entities.length; j++) {
					var ent = doc.lines[i].entities[j];
					ent.line = i;
					comp.gold.push(ent);
				}
			}
			for (var j=0; j<respArr.length; j++) {
				try {
					var engData = JSON.parse(respArr[j]);
				} catch (e) {alert("JSON error: " + respArr[j])}
				reEnts = engData.entities;
				for (k=0; k<reEnts.length; k++) {
					comp.actual.push(new Entity(j, reEnts[k].offset, reEnts[k].offset + reEnts[k].length - 1, reEnts[k].type, reEnts[k].text));
				}
			}
			return comp;
		},
		
		refreshDocument: function() {
			var entity, classList;
			var para = document.querySelector(".para");
			var div;
			var q = minLine - 1, dels = 0; 
			var contIndex = minLine + para.childNodes.length;
			for (var ip=0; ip<para.childNodes.length; ip++) {
				div = para.childNodes[ip];
				if (div.textContent) {
					doc.lines[ip+q] = new Line("", doc);	
					div.className = "line line" + (ip+1);
				}
				else {
					doc.lines.splice(ip+q,1);
					dels++;
					break;
				}
			}
			if (dels == para.childNodes.length) {
				return false;   //document is empty and should be deleted 
			}
			else if (dels > 0)
				return this.refreshDocument();
			for (ip=minLine-1; ip<minLine-1+para.childNodes.length; ip++) {
				doc.lines[ip].text = "";
				doc.lines[ip].entities = [];				
				div = para.childNodes[ip - (minLine-1)];
				doc.lines[ip].meta = div.getAttribute("data-meta") || " ";
				var entities = [];
				var ready = false, thesame = true;
				for (var i=0; i<div.childNodes.length; i++){
					var span = div.childNodes[i];
					if (!span.tagName || span.tagName.toLowerCase() != "span") {
						alert(div.innerHTML);
						alert("Document has wrong content and can't be saved in the internal DB:\n" + para.innerHTML);
						return;
					}
					doc.lines[ip].text += span.querySelectorAll('br').length > 0? "\n" : span.textContent;
					if (span.className == "") {
						if (!ready) {
							continue;
						}
						else {
							entities.push(entity);
							ready = false;
						}
					}
					else if(!ready) {
						entity = new Entity(ip, i, i+1, span.className);
						classList = span.classList;
						ready = true;
					}
					else {
						thesame = true;
						if (span.classList.length != classList.length)
							thesame = false;
						else {
							for (var j=0; j< classList.length; j++) {
								if (!span.classList.contains(classList.item(j))) {
									thesame = false;
									break;
								}
							}
						}
						if (thesame) {
							entity.end += 1;
						}
						else {
							entities.push(entity);
							entity = new Entity(ip, i, i+1, span.className);
							classList = span.classList;						
						}
					}
				}
				if (ready)
					entities.push(entity);

				for (i=0; i<NerConfig.length; i++) {
					var prev = undefined;
					for (j=0; j<entities.length; j++) {
						ready = false;
						var classes = entities[j].classes.split(" ");
						for (var k=0; k<classes.length; k++) {
							if (classes[k] == NerConfig[i].ename.toLowerCase()) {
								ready = true;
								break;
							}
						}
						if (ready) {
							if (prev && (prev.end + 1 == entities[j].begin)) {
								prev.end = entities[j].end;
								doc.lines[ip].entities[doc.lines[ip].entities.length-1] = new Entity(ip, prev.begin, prev.end, NerConfig[i].ename.toLowerCase());
							}
							else {
								prev = new Entity(ip, entities[j].begin, entities[j].end, NerConfig[i].ename.toLowerCase());
								doc.lines[ip].entities.push(new Entity(ip, prev.begin, prev.end, NerConfig[i].ename.toLowerCase()));
							}
						}
					}
				}
			}
			return true;
		},
		
		refreshLine: function(div) {   // I am here
			var entity, classList;
			var para = document.querySelector(".para");
			var cn = div.className;
			var numb = parseInt(cn.substring(cn.indexOf("line line") + 9)) - 1;
			var q = numb;
			if (!div.textContent) {
				if (para.childNodes.length == 1)
					return false;
				for (var i=numb+1; i<doc.lines.length; i++) {
					var dv = para.childNodes[i];
					dv.className = "line line" + (i-1);
					for (var j =0; j<doc.lines[i].entities.length; j++) {
						var ent = doc.lines[i].entities[j];
						ent.line--;
					}
				}
				doc.lines.splice(numb,1);
				div.parentNode.removeChild(div);
				display.display();
				return true;
			}
			
			doc.lines[numb].text = "";
			doc.lines[numb].entities = [];
			doc.lines[numb].meta = "updated";
			div.setAttribute("data-meta", "updated");
			var prevSpace = false;
			for (ip=numb; ip<numb+1; ip++) {   //TBD
				var entities = [];
				var ready = false, thesame = true;
				for (var i=0; i<div.childNodes.length; i++) { //Case when word is deleted, but spaces from both sides remain
					var span = div.childNodes[i];
					if (!span.tagName || span.tagName.toLowerCase() != "span") {
						alert("Document has wrong content and can't be saved in the internal DB:\n" + para.innerHTML);
						return;
					}
					if (span.childNodes.length > 1) {
						prevSpace = false;
						continue;
					}
					if (span.textContent == " ") {
						if (prevSpace) {
							div.removeChild(span);
							break;
						}
						else
							prevSpace = true;
					}
					else
						prevSpace = false;
				}
				for (var i=0; i<div.childNodes.length; i++){
					var span = div.childNodes[i];
					if (i == 0 && span.className == "")
						span.style.backgroundColor = span.parentNode.style.backgroundColor;
					if (!span.tagName || span.tagName.toLowerCase() != "span") {
						alert("Document has wrong content and can't be saved in the internal DB:\n" + para.innerHTML);
						return;
					}
					doc.lines[ip].text += span.querySelectorAll('br').length > 0? "\n" : span.textContent;
					if (span.className == "") {
						if (!ready) {
							continue;
						}
						else {
							entities.push(entity);
							ready = false;
						}
					}
					else if(!ready) {
						entity = new Entity(ip, i, i+1, span.className);
						classList = span.classList;
						ready = true;
					}
					else {
						thesame = true;
						if (span.classList.length != classList.length)
							thesame = false;
						else {
							for (var j=0; j< classList.length; j++) {
								if (!span.classList.contains(classList.item(j))) {
									thesame = false;
									break;
								}
							}
						}
						if (thesame) {
							entity.end = i;
						}
						else {
							entities.push(entity);
							entity = new Entity(ip, i, i+1, span.className);
							classList = span.classList;						
						}
					}
				}
				if (ready)
					entities.push(entity);

				for (i=0; i<NerConfig.length; i++) {
					var prev = undefined;
					for (j=0; j<entities.length; j++) {
						ready = false;
						var classes = entities[j].classes.split(" ");
						for (var k=0; k<classes.length; k++) {
							if (classes[k] == NerConfig[i].ename.toLowerCase()) {
								ready = true;
								break;
							}
						}
						if (ready) {
							if (prev && (prev.end + 1 == entities[j].begin)) {
								prev.end = entities[j].end;
								doc.lines[ip].entities[doc.lines[ip].entities.length-1] = new Entity(ip, prev.begin, prev.end+1, NerConfig[i].ename.toLowerCase());
							}
							else {
								prev = new Entity(ip, entities[j].begin, entities[j].end, NerConfig[i].ename.toLowerCase());
								doc.lines[ip].entities.push(new Entity(ip, prev.begin, prev.end+1, NerConfig[i].ename.toLowerCase()));
							}
						}
					}
				}
			}
			return true;
		}
	}
})(tsv || {});