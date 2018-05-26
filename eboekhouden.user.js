// ==UserScript==
// @name     e-BoekhoudenFixer
// @version  1
// @grant    GM_addStyle
// @include https://secure*.e-boekhouden.nl/bh/
// @require http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// ==/UserScript==

/* ======= Shortcut getters ======= */
function getFrame() {
  return $(document.getElementById('mainframe').contentDocument);
}

function getTableBody(table) {
  return table.children('tbody').children('tr').eq(2).find('table > tbody:contains("Datum")');
}

function getRows(table) {
  return table.children('tbody').children('tr').eq(2).find('table > tbody:contains("Datum") > tr');
}


/* ======= Checking if execution is required logic ======= */
function checkChanged() {
  var frame = getFrame();
  var hidden = frame.get()[0].getElementById('changedByJayke');
  if (hidden != null) {
    /* No change, ignore */
  } else {
    /* Add detector used to detect frame change */
    var element = $('<div id="changedByJayke"></div>');
    element.css('display', 'none');
    frame.find('body').append(element);

    /* Add CSS */
    addStyle(frame.find('head').get(0),
           '.tROW {border-bottom: 2px solid #AAAAAA; font-weight: bold; padding-bottom: 20px;} ' +
           '.hidebutton {font-family: "Lucida Console", Monaco, monospace} ' +
           '.hidebutton:hover {color: #BADA55; cursor: pointer} ' +
           '.add_hours:hover {color: #BADA55; cursor: pointer} ' +
           '.clickable {text-decoration: underline;} ' +
           '.clickable:hover {color:#BADA55; cursor:pointer} ' +
           '#addForToday {margin-left: 10px;} ' +
           '#addForToday:hover {color:#BADA55; cursor:pointer}');

    /* Add our functionality to the page*/
    waitForPage();
  }
}

function addStyle(head, css) {
  if (head == undefined) {
    return;
  }
  var style;
  style = document.createElement('style');
  style.type = 'text/css';
  style.innerHTML = css;
  head.appendChild(style);
}

/* Wait for page content to load, then trigger page rebuild */
function waitForPage(frame) {
  var center = getFrame().find('body > center');
    // TODO: fix check for Chrome
  if (center.length == 0 || (center.children('table').length == 0 && center.children('form').length == 0)) {
    setTimeout(waitForPage, 100);
  } else {
    buildPage(center);
  }
}

function checkPageOverzicht(table) {
  var header = table.find('font').first();
  return header.text().indexOf('GEREGISTREERDE') > -1;
}

function checkPageToevoegen(form) {
  var header = form.find('center > table > tbody > tr > td').find('font');
  return header.text().indexOf('TIJDREGISTRATIE') > -1;
}

function buildPage(center) {
  var table = center.children('table');
  var form = center.children('form');

  if (checkPageOverzicht(table)) {
    runRedesignOverzicht(table);
  } else if (checkPageToevoegen(form)) {
    runRedesignToevoegen(form);
  } else {
    // Not overview or add page, ignore
  }
}


/* ======= Perform changes to 'Toevoegen' page ======= */
function runRedesignToevoegen(form) {
 	// Check if date select in URL. If so, set it as date
  var url = new URL(getFrame().context.URL);
  var date = url.searchParams.get("SELECTDAY");
  if (date != null) {
    form.find('#txtDatum').first().get()[0].value = date;
  }

  // Force set to Investering (second option) by default
  form.find('#SelActiviteit option').prop('selected', true).trigger('change'); 
  
  // Find opmerkingen for selected project and build quick list
  buildSuggestionList(form);
  form.find('#SelProject').get()[0].onchange = function() {
    getFrame().find('body').find('#quicklist').remove();
    buildSuggestionList(form);
  }
}


function buildSuggestionList(form) {
  // Prevent running multiple times
  var body = getFrame().find('body');
  if (body.find('#quicklist').length > 0) {
    return;
  }
  
  console.log('Finding selected project');
  var project = form.find('#SelProject option:selected').text();
  var parsed = retrieveOpmerkingen(project);
  
  // Create list sorted by regularity
  var list = [];
  for (var opmerking in parsed) {
    list.push([opmerking, parsed[opmerking].times_used, parsed[opmerking].last_used]);
  }
  
  list.sort(function(a, b) {
    return b[2] - a[2];
  });  
  
  var obj = $('<div id="quicklist"></div>');
  body.append($(obj));

  var storeCurrent = $('<div class="quicklist_entry"></div>');
  storeCurrent.append('<i>Sla huidige opmerking op</i>');
  obj.append(storeCurrent);
  storeCurrent.get()[0].onclick = function() {
    storeCurrentOpmerking(form, project);
  }
  
  
  for (var i=0; i < list.length; i++) {
  	var e = $('<div class="quicklist_entry" id="ql_entry_' + i + '"></div>');
    e.text(list[i][0]);
    obj.append(e);
    e.get()[0].onclick = function() {
      insertOpmerking(form, project, this.innerText);
    }
  }
}

function insertOpmerking(form, project, opmerking) {
  // Re-store so used counter and last used are updated
  storeOpmerking(project, opmerking);
  
  // Insert into opmerkingen field
  form.find('#txtOpmerkingen').val(opmerking);
}

function storeCurrentOpmerking(form, project) {
  // Get opmerking
  var opmerking = form.find('#txtOpmerkingen').val();
  
  // Store
  storeOpmerking(project, opmerking);
  
  // Rebuild list to reflect change
  getFrame().find('body').find('#quicklist').remove();
  buildSuggestionList(form);
}

function retrieveOpmerkingen(project) {
  var json = localStorage['opmerkingen_' + project];
  
  if (json == undefined) {
		return null;
  }
  return JSON.parse(json);
}

function storeOpmerking(project, opmerking) {
  var current = retrieveOpmerkingen(project);
  
  if (current == undefined) {
   	current = {};
  }

  if (opmerking in current) {
    current[opmerking]['times_used']++;
    current[opmerking]['last_used'] = Date.now();
  } else {
    current[opmerking] = {
      'times_used': 1,
      'last_used': Date.now()
    }
  }

  localStorage.setItem('opmerkingen_' + project, JSON.stringify(current));
}


/* ======= Perform changes to 'Overzicht' page ======= */
function runRedesignOverzicht(table) {
  var parent = getTableBody(table);
  var rows = getRows(table);
  var header = rows[0];

  if (rows.length > 1) {
    var current_date = rows[1].childNodes[2].innerHTML;

    var total_hours = 0.0;
    var insertables = [];


    for(var i=1; i < rows.length; i++) {
      if (rows[i].childNodes[2] == undefined || rows[i].childNodes[6] == undefined) {return};
      var d = rows[i].childNodes[2].innerHTML;
      var t = parseFloat(rows[i].childNodes[6].innerHTML.replace(',', '.'));

      if (d != current_date) {
        var newRow = $('<tr style="line-height:21px; margin-bottom:5px;">' +
                       '<td class="cROW tROW"></td>' +
                       '<td class="cROW tROW add_hours" data-date="' + current_date +'" colspan=2>+ Uren toevoegen</td>' +
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

    /* Add function to headers */
    getFrame().find('.add_hours').click(addHoursToDay);

    /* Create collapsable days */
    rows = getRows(table);
    var prev_header = 0;
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

  /* Add quick buttons to select current day, week and month, as well as adding hours for today */
  var frm = getFrame().find('#frm');
  if (frm.find('.clickable').length == 0) {  // Hack to prevent double addition
    addCurrentButtons();
    addHoursCurrentDayButton();
    addCollapsableSearch();
  }
}

function getDateString(d) {
  return d.getDate() + '-' + (d.getMonth() + 1) + '-' + d.getFullYear();
}

function addCurrentButtons() {
  var frame = getFrame();
  var frm = frame.find('#frm');
  frm.children().first().find('table').first().find('tbody > tr').append(
    '<td class="clickable" id="showtoday">Vandaag</td>' +
    '<td class="clickable" id="showthisweek">Deze week</td>' +
    '<td class="clickable" id="showthismonth">Deze maand</td>'
  );
  frame.find('#showtoday').first().click(showToday);
  frame.find('#showthisweek').first().click(showThisWeek);
  frame.find('#showthismonth').first().click(showThisMonth);
}

function addHoursCurrentDayButton() {
  var frm = getFrame().find('#frm').first();
  var sib = frm.next().next();
  sib.find('img').first().css('margin-top', '20px');
  var link = sib.get()[0].cloneNode();
  link.setAttribute('id', 'addForToday');
  link.setAttribute('href', link.href + '&SELECTDAY=' + getDateString(new Date()));
  link.innerHTML = 'Toevoegen voor vandaag';
  sib.after(link);
}

function addCollapsableSearch() {
  var frm = getFrame().find('#frm');
  var elem = $('<td id="hidesearch" class="hidebutton">[+]</td>');
  elem.click(function() {toggleSearch(this);});
  frm.children().first().find('table').first().find('tbody > tr').prepend(elem);

  $(frm.find('table > tbody').first().children('tr')[1]).hide();
  frm.children('table').eq(1).hide();
}

/* ======= User-triggered scripts ======= */
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
    element.innerHTML = '[-]';
    for (var i = start; i <= stop; i++) {
      $(rows[i]).show();
    }
  }
}

function toggleSearch(element) {
  frm = getFrame().find('#frm');
  if (element.innerHTML == '[-]') {
    // Hide
    element.innerHTML = '[+]';
    $(frm.find('table > tbody').first().children('tr')[1]).hide();
    frm.children('table').eq(1).hide();
  } else {
    // Show
    element.innerHTML = '[-]';
    $(frm.find('table > tbody').first().children('tr')[1]).show();
    frm.children('table').eq(1).show();
  }
}

function showToday() {
  var today = new Date();
  var today_s = getDateString(today);
  selectDateRange(today, today);
}

function showThisWeek() {
  function getMonday(d) {
    d = new Date(d);
    var day = d.getDay();
    var diff = d.getDate() - day + (day == 0 ? -6:1);
    return new Date(d.setDate(diff));
  }

  var today = new Date();
  var monday = getMonday(today);
  var sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);

	selectDateRange(monday, sunday);
}

function showThisMonth() {
  var frm = getFrame().find('#frm');
  frm.find('input').filter('[value=M]').get()[0].click();
  frm.find('#submit1').get()[0].click();
}

function selectVrije() {
  var frm = getFrame().find('#frm');
  frm.find('input').filter('[value=V]').get()[0].click();
}

function selectDateRange(from, to) {
  selectVrije();
  var frm = getFrame().find('#frm');
  var van = frm.find('#txtDatumVan').first();
  var tot = frm.find('#txtDatumTot').first();
  van.get()[0].value = getDateString(from);
  tot.get()[0].value = getDateString(to);
  frm.find('#submit1').get()[0].click();
}

function addHoursToDay(element) {
  var date = element.target.dataset.date;
  var link = getFrame().find('center').first().children('a').first().get()[0];
  link.setAttribute('href', link.href + '&SELECTDAY=' + date);
  link.click();
}


/* Start checking */
setInterval(checkChanged, 100);
