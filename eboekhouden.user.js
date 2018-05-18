// ==UserScript==
// @name     e-BoekhoudenFixer
// @version  1
// @grant    GM_addStyle
// @include https://secure*.e-boekhouden.nl/bh/
// @require http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// ==/UserScript==


function checkChanged() {
  frame = $(document.getElementById('mainframe').contentDocument);
  hidden = frame.find('#changedByJayke').length;
  if (hidden > 0) {
    // No change, ignore
  } else {
    element = $('<div id="changedByJayke"></div>');
    element.css('display', 'none');
    frame.find('body').append(element);
    
    preparePage(frame);
  }
}

function checkPage(table) {
  header = table.find('table > tbody > tr > td > font');
  return header.text().indexOf('GEREGISTREERDE') > -1;
}

function addStyle(head, css) {
  var style;
  style = document.createElement('style');
  style.type = 'text/css';
  style.innerHTML = css;
  head.appendChild(style);
}

function preparePage(frame) {
  addStyle(frame.find('head').get(0),
           '.tROW {border-bottom: 2px solid #AAAAAA; font-weight: bold;} ' +
           '.hidebutton {font-family: "Lucida Console", Monaco, monospace} ' +
           '.hidebutton:hover {color: #BADA55; cursor: pointer}' +
           '.clickable {text-decoration: underline;} .clickable:hover {color:#BADA55; cursor:pointer}');  
  table = frame.find('body > center > table');

  if (checkPage(table)) {
    addCurrentButtons(frame);
    setTimeout(function() {runRedesign(table);}, 200);
  } else {
    // Not overview page, ignore
  }
}

function getTableBody(table) {
  return table.children('tbody').children('tr').eq(2).find('table > tbody:contains("Datum")');
}

function getRows(table) {
  return table.children('tbody').children('tr').eq(2).find('table > tbody:contains("Datum") > tr');
}

function toggleRows(element, rows) {
  var start = element.dataset.start;
  var stop = element.dataset.stop;
 
  if (element.innerHTML == '[-]') {
    // Hide
    element.innerHTML = '[+]';
    for (var i = start; i <= stop; i++) {
      $(rows[i]).hide();
    }
  } else {
    // Show
    element.innerHTML = '[-]'
    for (var i = start; i <= stop; i++) {
      $(rows[i]).show();
    }
  }
}

function runRedesign(table) {
  parent = getTableBody(table);
  rows = getRows(table);
  header = rows[0];

  current_date = rows[1].childNodes[2].innerHTML;

  total_hours = 0.0;
  insertables = [];

  for(var i=1; i < rows.length; i++) {
    console.log('Processing rows');
    d = rows[i].childNodes[2].innerHTML;
    t = parseFloat(rows[i].childNodes[6].innerHTML.replace(',', '.'));

    if (d != current_date) {      
      newRow = $('<tr style="line-height:21px; margin-bottom:5px;">' +
                 '<td class="cROW tROW"></td>' +
                 '<td class="cROW tROW"></td>' +
                 '<td class="cROW tROW"></td>' +
                 '<td class="cROW tROW"></td>' +
                 '<td class="cROW tROW"></td>' +
                 '<td class="cROW tROW" style="text-align:right">Totaal ' + current_date + ':</td>' +
                 '<td class="cROW tROW" style="text-align:right">' + total_hours.toFixed(2).replace('.', ',') + '</td>' +
                 '</tr>');
      insertables.push([i - 1, newRow]);

      current_date = d;
      total_hours = t;
    } else {
      total_hours += t;
    }
  }
  
  /* Insert headers and total rows */
  for(var i = 0; i < insertables.length; i++) {
    if (i + 1 < insertables.length) {
      $(rows[insertables[i][0]]).after($(header).clone());
    }
    $(rows[insertables[i][0]]).after(insertables[i][1]);
  }

  /* Create collapsable days */
  rows = getRows(table);
  prev_header = 0;
  for(var i=1; i < rows.length; i++) {
    if (rows[i].childNodes[3].innerHTML.indexOf('<b>Datum</b>') > -1 || i == rows.length - 1) {
      rows[prev_header].childNodes[1].classList.add('hidebutton');
      rows[prev_header].childNodes[1].innerHTML = '[-]';

      var a = prev_header + 1;
      var b = i - 2;
      rows[prev_header].childNodes[1].setAttribute("data-start", a);
      rows[prev_header].childNodes[1].setAttribute("data-stop", b);
      rows[prev_header].childNodes[1].onclick = function() {
        toggleRows(this, rows);
      }

      prev_header = i;
    }
  }
}

function getDateString(d) {
  return d.getDate() + '-' + (d.getMonth() + 1) + '-' + d.getFullYear();
}

function selectVrije() {
  frm = frame.find('#frm');
  frm.find('input').filter('[value=V]').get()[0].click();
}

function selectDateRange(from, to) {
  selectVrije();
  van = frm.find('#txtDatumVan').first();
  tot = frm.find('#txtDatumTot').first();
  van.get()[0].value = getDateString(from);
  tot.get()[0].value = getDateString(to);
  rb = frm.find('#submit1').get()[0].click();
}

function showToday() {
  today = new Date();
  today_s = getDateString(today);
  selectDateRange(today, today);
}

function showThisWeek() {
  function getMonday(d) {
    d = new Date(d);
    var day = d.getDay();
    var diff = d.getDate() - day + (day == 0 ? -6:1);
    return new Date(d.setDate(diff));
  }

  today = new Date();
  monday = getMonday(today);
  sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  
	selectDateRange(monday, sunday);  
}

function addCurrentButtons(frame) {
  frm = frame.find('#frm');
  frm.children().first().find('table').first().find('tbody > tr').append(
    '<td class="clickable" id="showtoday">Vandaag</td><td class="clickable" id="showthisweek">Deze week</td>'
  );
  frame.find('#showtoday').first().click(showToday);
  frame.find('#showthisweek').first().click(showThisWeek);
}

setInterval(checkChanged, 100);

