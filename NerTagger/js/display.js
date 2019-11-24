/**
 * 
 */
var display = (function() {
	var workArea, div, para, span, lDiv;
	
	return {
		display: function() {
			window.statusNode.innerHTML = '';
			workArea = document.querySelector("#workArea");
			workArea.innerHTML = "";
			var lineDiv = document.createElement("div");
			lineDiv.className = "linediv";
			var numDiv = document.createElement("div");
			numDiv.className = "linenum";
			numDiv.innerHTML = "";
			lineDiv.appendChild(numDiv);
			var lineContentDiv = document.createElement("div");
			lineContentDiv.className = "linecontentdiv";
			div = document.createElement("div");
			div.className = "divtags";
			lineContentDiv.appendChild(div);
			para = document.createElement("p");
			para.className = "para";
			para.style.outline = "none";
			para.classList.toggle("N" + i);
			for (var i=minLine-1; i<Math.min(doc.lines.length, minLine+100-1); i++) { 
				var txt = doc.lines[i].text;
				lDiv = document.createElement("div");
				lDiv.className = "line line" + (i+2-minLine);
				lDiv.contentEditable = "true";
				lDiv.onmousedown = function(e) { setSpanInEdit(false); };
				lDiv.onmouseup = function(e) { getCurrentSelection(); scrollWexDetails();};
				lDiv.setAttribute("data-meta", doc.lines[i].meta);
				para.appendChild(lDiv);
				for (var j=0; j<doc.lines[i].text.length; j++) {
					var tx = txt.substring(j,j+1);
                    if (tx === "\n") {
                    	continue;
                    }
					span = document.createElement("span");
					span.innerHTML = tx;
					span.className = "";
					span.onclick = function(e) {
					};
					lDiv.appendChild(span);
				}
				try {
					for (j=0; j<doc.lines[i].entities.length; j++) {
						var entity = doc.lines[i].entities[j];
						//if (i == minLine-1 && entity.classes != "number")
							//alert("Line: " + (i+2-minLine) + ". Entity: text=[" + entity.txt + "], begin=" + entity.begin + ", end=" + entity.end + ", type=" + entity.classes);
						for (var k=entity.begin; k<entity.end; k++) {
							if (!lDiv.childNodes[k]) {
								continue;
							}
							lDiv.childNodes[k].className += (lDiv.childNodes[k].className == ""?  "" : " ") + entity.classes;
							if (lDiv.childNodes[k].classList.length > 1)
								lDiv.childNodes[k].setAttribute("multi", true);
							else
								lDiv.childNodes[k].removeAttribute("multi");
							lDiv.childNodes[k].title = lDiv.childNodes[k].className.replace(/\s+/g, ",");
						}
					}
				} catch (e) { alert("Exception(?): " + e)}
			}
			lineContentDiv.appendChild(para);
			lineDiv.appendChild(lineContentDiv);
			workArea.appendChild(lineDiv);
			tsv.refreshDocument(para);
			this.checkEntities(doc);
			this.decorateResults(doc, LastTestResults, !isParaEditable);
			para.childNodes[0].focus();
			var sel = window.getSelection();
			var rg = sel.getRangeAt(0);
			rg.setStartBefore(para.childNodes[0].childNodes[0]);
			rg.setEndBefore(para.childNodes[0].childNodes[0]);
			sel.removeAllRanges();
			sel.addRange(rg);
			return 0;
		},
		
		checkEntities: function(doc) {	
			var trs = [], allEnts = 0;
			for (var i=0; i<NerConfig.length; i++) {
				trs[NerConfig[i].ename.toLowerCase()] = 0;
			}
			if (doc) {
				for (var i=0; i<doc.lines.length; i++) {
					for (var j=0; j<doc.lines[i].entities.length; j++) {
						var classes = doc.lines[i].entities[j].classes.toLowerCase().split(" ");
						for (var k=0; k<classes.length; k++) {
							allEnts++;
							trs[classes[k]]++;
						}
					}
				}
			}
			document.querySelector("#tdall").innerHTML = "" + allEnts;
			for (var i=0; i<NerConfig.length; i++) {
				document.querySelector("#summaryTableID #" + NerConfig[i].ename.toLowerCase()).lastChild.innerHTML = "" + trs[NerConfig[i].ename.toLowerCase()];
			}		
		},
		
		checkShortcuts: function() {
			for (var i=0; i<NerConfig.length; i++) {
				document.querySelector("#summaryTableID #" + NerConfig[i].ename.toLowerCase()).lastChild.previousSibling.innerHTML = NerConfig[i].shortcut;
			}
		},
		
		setActive: function(doc, lineNum, tokenNum) {
			return true;
		},
		
		decorateResults: function(doc, LastTestResults, needDecor) {
			if (!doc)
				return;
			if (!defDecorResults || !LastTestResults || doc.name != LastTestResults.docname)
				needDecor = false;
			document.querySelectorAll(".line span").forEach(function(node, index) {
				node.removeAttribute("testres");
			});
			var ent;
			if (!needDecor) {
				return;
			}
			for (var i=0; i<LastTestResults.comp.actual.length; i++) {
				ent = LastTestResults.comp.actual[i];
				if (ent.line < minLine-1 || ent.line >= minLine + 100 - 1)
					continue;
				var div = document.querySelector(".line"+(ent.line-minLine + 2));
				for (var k=Math.min(ent.begin, div.childNodes.length); k<Math.min(ent.end + 1, div.childNodes.length); k++) {					
					div.childNodes[k].setAttribute("testres", "fn");
				}
			}
			for (var i=0; i<LastTestResults.comp.gold.length; i++) {
				ent = LastTestResults.comp.gold[i];
				if (ent.line < minLine-1 || ent.line >= minLine + 100 - 1) {
					continue;
				}
				var div = document.querySelector(".line"+(ent.line - minLine + 2));
				for (var k=ent.begin; k<ent.end; k++) {					
					div.childNodes[k].setAttribute("testres", (ent.found? (ent.foundType == 2? "tp" : "tpp") : "tn"));
				}
			}
		}
	};
})(display || {});