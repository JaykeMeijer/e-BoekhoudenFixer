// ==UserScript==
// @name     e-BoekhoudenFixer
// @version  1
// @grant    GM_addStyle
// @include https://secure*.e-boekhouden.nl/bh/
// @require http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// ==/UserScript==

/* Script by Jayke Meijer for e-boekhouden, grouping results by day
 * TODO:
 * - Add button to select results for current week
 * - Add functionality to easily hide all but today
 * - See if state can be remembered
 * - Make hidden notion more compact (hide header or change to a completely different row)
 * - 
 */

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
    addStyle(frame.find('head').get(0), '.tROW {border-bottom: 2px solid #AAAAAA; font-weight: bold;} .hidebutton {font-family: "Lucida Console", Monaco, monospace} .hidebutton:hover {color: #BADA55; cursor: pointer}');  
  table = frame.find('body > center > table');
 
  if (checkPage(table)) {
    runRedesign(table);
  } else {
    // Not overview page, ignore
  }
}

function getTableBody(table) {
  return table.children('tbody').children('tr').eq(2).find('table > tbody');
}

function getRows(table) {
  return table.children('tbody').children('tr').eq(2).find('table > tbody > tr');
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
      insertables.push([i - 1, newRow]);//$(rows[i]).after(newRow);
    
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

setInterval(checkChanged, 100);
