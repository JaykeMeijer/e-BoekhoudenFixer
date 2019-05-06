// ==UserScript==
// @name     e-BoekhoudenFixer
// @version  1
// @author   Jayke Meijer
// @grant    GM_addStyle
// @include https://secure*.e-boekhouden.nl/*
// @require http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// ==/UserScript==

/* ======= Shortcut getters ======= */
function getFrame() {
  return $(document);
  var doc = document.getElementById('mainframe');
  if (doc != null) {
    var frame = doc.contentDocument;
    return $(frame);
  } else {
    return null;
  }
}

function getTableBody(table) {
  return table.children('tbody').children('tr').eq(2).find('table > tbody:contains("Datum")');
}

function getHeader(table) {
    return table.children('thead').children('tr');
}

function getRows(table) {
  console.log('getRows');
  console.log(table.children('tbody').children('tr'));
  console.log('---');
  //return table.children('tbody').children('tr').eq(2).find('table > tbody:contains("Datum") > tr');
  return table.children('tbody').children('tr');
}


/* ======= Checking if execution is required logic ======= */
function checkChanged() {
  var frame = getFrame();
  if (frame == null) {
    console.log('Frame is null');
    return;
  }
  var hidden = frame.get()[0].getElementById('changedByJayke');
  if (hidden != null) {
    /* No change, ignore */
  } else {
    /* Add detector used to detect frame change */
    var element = $('<div id="changedByJayke"></div>');
    element.css('display', 'none');
    frame.find('body').append(element);

    /* Add CSS */
    console.log(frame.find('head').get(0));
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
function waitForPage() {
    console.log('wFP');
  var frame = getFrame();
  var center = frame.find('body > center');
  console.log(frame.find('app-grid'));

  // TODO: fix check for Chrome
  var url = frame.context.URL;
  console.log(url);
  var ptype = (url.includes('overzicht') ? 'overzicht' : (url.includes('uren.asp') ? 'toevoegen' : 'unknown'));
  if (ptype == 'unknown') {
    return;
  }

  console.log(center);
  console.log(center.children('table'));
  if (false) {//center.length == 0 || (ptype == 'overzicht' && center.children('table').length == 0) || (ptype == 'toevoegen' && center.children('form').length == 0)) {
    setTimeout(waitForPage, 100);
  } else {
    //console.log('Page loaded');
    center = frame.find('app-grid');
    buildPage(ptype, center);
  }
}

function buildPage(ptype, center) {
  console.log('bP');
  var table = $(center.find('table')[0]);//center.children('table');
  var form = center.children('form');

  switch(ptype) {
    case 'overzicht':
      runRedesignOverzicht(table);
      break;
    case 'toevoegen':
      runRedesignToevoegen(form);
      break;
    default:
      // Not overview page, ignore
      break;
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
}


/* ======= Perform changes to 'Overzicht' page ======= */
function runRedesignOverzicht(table) {
  console.log(table);
  var parent = getTableBody(table);
  console.log(parent);
  var rows = getRows(table);
  console.log(rows);
  var header = getHeader(table);//rows[0];
  console.log(header);

  if (rows.length > 1) {

    // Loop while we wait for the data to be filled
    if (rows[rows.length - 1].childNodes[6] == undefined) {
        console.log('Waiting');
        setTimeout(function() {runRedesignOverzicht(table)}, 10);
        return;
    }
    console.log('Redesigning');

    var current_date = rows[0].childNodes[2].innerHTML;
    var total_hours = 0.0;
    var insertables = [];

    for(var i=0; i < rows.length; i++) {
      console.log(rows[i]);
      var cells = rows[i].querySelectorAll('td');
      console.log(cells);
      if (cells[2] == undefined || cells[6] == undefined) {return};
      var d = cells[2].innerHTML.split(' ')[1];
      console.log(d);
      var t = parseFloat(cells[6].innerHTML.split(' ')[1].replace(',', '.'));
      console.log(t);

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
  var frm = getFrame().find('#frm');
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

  var today = new Date();
  var month = today.getMonth() + 1;

  frm.find('#SelMaand').find('option').filter('[value=' + month + ']').prop('selected', true);
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
if (window.location.href.includes('overzicht')) {
    console.log('Correct Frame');
    console.log(document);
    setInterval(checkChanged, 1000);
}
