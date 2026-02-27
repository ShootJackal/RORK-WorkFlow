/**
 * TaskFlow Google Apps Script v4.0
 * 
 * DEPLOYMENT:
 * 1. Open your Google Sheet → Extensions → Apps Script
 * 2. Delete ALL existing code, paste this entire file
 * 3. Deploy → New Deployment → Web app → Anyone access
 * 4. Copy URL → set as EXPO_PUBLIC_GOOGLE_SCRIPT_URL
 *
 * SHEET MAPPINGS:
 *   Collectors:     A=Name B=Rig-ID C=Email D=WeeklyCap E=Active F=HoursUploaded G=Rating
 *   CA_TAGGED:      A=Date B=RigID  C=Site  D=Collector E=TaskName F=Hours
 *   CA_INDEX:       A=Date B=RigID  C=TaskKey D=Hours
 *   TASK_LIST:      A=TaskName
 *   Task Actuals:   A=TaskID B=TaskName C=CollectedHrs D=GoodHrs E=Status F=RemainingHrs K=LastRedash
 *   RS_Task_Req:    A=TaskName B=RequiredGoodHrs
 *   Assignments:    A=AssignmentID B=TaskID C=TaskName D=Collector E=AssignedDate F=PlannedHrs G=Status H=LoggedHrs I=RemainingHrs J=CompletedDate K=Notes L=WeekStart
 *   _AppCache:      A=key B=jsonValue C=updatedAt
 */

var SHEETS = {
  COLLECTORS: 'Collectors',
  TASK_LIST: 'TASK_LIST',
  CA_TAGGED: 'CA_TAGGED',
  CA_INDEX: 'CA_INDEX',
  TASK_ACTUALS: 'Task Actuals | Redashpull',
  ASSIGNMENTS: 'Collector Task Assignments Log',
  RS_TASK_REQ: 'RS_Task_Req',
  APP_CACHE: '_AppCache'
};

function doGet(e) {
  try {
    var action = (e.parameter.action || '').trim();
    var result;
    switch (action) {
      case 'getCollectors':         result = handleGetCollectors(); break;
      case 'getTasks':              result = handleGetTasks(); break;
      case 'getLeaderboard':        result = handleGetLeaderboard(); break;
      case 'getCollectorStats':     result = handleGetCollectorStats(e.parameter.collector || ''); break;
      case 'getTodayLog':           result = handleGetTodayLog(e.parameter.collector || ''); break;
      case 'getRecollections':      result = handleGetRecollections(); break;
      case 'getFullLog':            result = handleGetFullLog(e.parameter.collector || ''); break;
      case 'getTaskActualsSheet':   result = handleGetTaskActuals(); break;
      case 'getAdminDashboardData': result = handleGetAdminDashboard(); break;
      case 'getAppCache':           result = handleGetAppCache(); break;
      case 'refreshCache':          result = handleRefreshCache(); break;
      default:
        return jsonOut({ success: false, error: 'Unknown action: ' + action });
    }
    return jsonOut({ success: true, data: result });
  } catch (err) {
    return jsonOut({ success: false, error: err.message || String(err) });
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var result = handleSubmit(body);
    return jsonOut({ success: true, data: result, message: result.message || 'OK' });
  } catch (err) {
    return jsonOut({ success: false, error: err.message || String(err) });
  }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSS() { return SpreadsheetApp.getActiveSpreadsheet(); }

function getSheet(name) {
  var sheet = getSS().getSheetByName(name);
  if (!sheet) throw new Error('Sheet not found: ' + name);
  return sheet;
}

function getSheetData(name) {
  return getSheet(name).getDataRange().getValues();
}

function safeStr(v) { return String(v == null ? '' : v).trim(); }
function safeNum(v) { var n = Number(v); return isFinite(n) ? n : 0; }

function handleGetCollectors() {
  var data = getSheetData(SHEETS.COLLECTORS);
  var results = [];
  for (var i = 1; i < data.length; i++) {
    var name = safeStr(data[i][0]);
    if (!name) continue;
    var rigId = safeStr(data[i][1]);
    results.push({
      name: name,
      rigs: rigId ? [rigId] : [],
      email: safeStr(data[i][2]),
      weeklyCap: safeNum(data[i][3]),
      active: safeStr(data[i][4]).toUpperCase() !== 'FALSE',
      hoursUploaded: safeNum(data[i][5]),
      rating: safeStr(data[i][6])
    });
  }
  return results;
}

function handleGetTasks() {
  var data = getSheetData(SHEETS.TASK_LIST);
  var results = [];
  for (var i = 1; i < data.length; i++) {
    var name = safeStr(data[i][0]).replace(/^[\u2705]\s*/, '').trim();
    if (!name) continue;
    results.push({ name: name });
  }
  return results;
}

function handleGetLeaderboard() {
  var collectorsData = getSheetData(SHEETS.COLLECTORS);
  var rigToName = {};
  var rigToRegion = {};
  var collectorMeta = {};
  for (var i = 1; i < collectorsData.length; i++) {
    var cName = safeStr(collectorsData[i][0]);
    var cRig = safeStr(collectorsData[i][1]).toLowerCase();
    var cHours = safeNum(collectorsData[i][5]);
    if (cName) {
      var region = 'MX';
      if (cRig && (cRig.indexOf('sf') >= 0 || cRig.indexOf('ego-sf') >= 0)) region = 'SF';
      collectorMeta[cName.toLowerCase().replace(/\s+/g, ' ')] = { name: cName, hoursUploaded: cHours, rig: cRig, region: region };
      if (cRig) {
        rigToName[cRig] = cName;
        rigToRegion[cRig] = region;
      }
    }
  }

  var taggedData;
  try { taggedData = getSheetData(SHEETS.CA_TAGGED); } catch(e) { taggedData = []; }
  var taggedRegion = {};
  for (var j = 1; j < taggedData.length; j++) {
    var tRow = taggedData[j];
    var tRig = safeStr(tRow[1]).toLowerCase();
    var tSite = safeStr(tRow[2]).toUpperCase();
    var tCol = safeStr(tRow[3]);
    if (!tCol && tRig) tCol = rigToName[tRig] || '';
    if (!tCol) continue;
    var cleanSite = tSite.replace(/^EGO-/i, '');
    if (cleanSite === 'SF' || cleanSite === 'MX') {
      taggedRegion[tCol.toLowerCase().replace(/\s+/g, ' ')] = cleanSite;
    } else if (tRig) {
      taggedRegion[tCol.toLowerCase().replace(/\s+/g, ' ')] = (tRig.indexOf('sf') >= 0) ? 'SF' : 'MX';
    }
  }

  var assignData;
  try { assignData = getSheetData(SHEETS.ASSIGNMENTS); } catch(e) { assignData = []; }

  var map = {};
  for (var a = 1; a < assignData.length; a++) {
    var aRow = assignData[a];
    var collector = safeStr(aRow[3]);
    if (!collector) continue;
    var key = collector.toLowerCase().replace(/\s+/g, ' ');
    var hours = safeNum(aRow[7]);
    var status = safeStr(aRow[6]).toLowerCase();
    var isCompleted = (status === 'completed' || status === 'complete');

    if (!map[key]) {
      var reg = taggedRegion[key] || (collectorMeta[key] ? collectorMeta[key].region : 'MX');
      map[key] = { rank: 0, collectorName: collector, hoursLogged: 0, tasksCompleted: 0, tasksAssigned: 0, completionRate: 0, region: reg };
    }
    map[key].hoursLogged += hours;
    map[key].tasksAssigned += 1;
    if (isCompleted) map[key].tasksCompleted += 1;
  }

  for (var ck in collectorMeta) {
    var meta = collectorMeta[ck];
    if (map[ck]) {
      if (meta.hoursUploaded > map[ck].hoursLogged) {
        map[ck].hoursLogged = meta.hoursUploaded;
      }
    } else if (meta.hoursUploaded > 0) {
      map[ck] = { rank: 0, collectorName: meta.name, hoursLogged: meta.hoursUploaded, tasksCompleted: 0, tasksAssigned: 0, completionRate: 0, region: meta.region };
    }
  }

  var entries = [];
  for (var k in map) {
    var en = map[k];
    if (en.hoursLogged <= 0 && en.tasksAssigned <= 0) continue;
    en.completionRate = en.tasksAssigned > 0 ? Math.round(en.tasksCompleted / en.tasksAssigned * 100) : 0;
    entries.push(en);
  }
  entries.sort(function(a, b) { return b.hoursLogged - a.hoursLogged; });
  for (var idx = 0; idx < entries.length; idx++) entries[idx].rank = idx + 1;

  writeCache('leaderboard', entries);
  return entries;
}

function handleGetCollectorStats(collectorName) {
  if (!collectorName) throw new Error('Missing collector');
  var normName = collectorName.toLowerCase().replace(/\s+/g, ' ').trim();

  var collectorsData = getSheetData(SHEETS.COLLECTORS);
  var myRig = '', myHoursUploaded = 0;
  for (var c = 1; c < collectorsData.length; c++) {
    if (safeStr(collectorsData[c][0]).toLowerCase().replace(/\s+/g, ' ') === normName) {
      myRig = safeStr(collectorsData[c][1]).toLowerCase();
      myHoursUploaded = safeNum(collectorsData[c][5]);
      break;
    }
  }

  var assignData;
  try { assignData = getSheetData(SHEETS.ASSIGNMENTS); } catch(e) { assignData = []; }

  var totalAssigned = 0, totalCompleted = 0, totalCanceled = 0;
  var totalLoggedHours = 0, totalPlannedHours = 0;
  var weeklyLoggedHours = 0, weeklyCompleted = 0;
  var topTasks = [];
  var now = new Date();
  var dayOfWeek = now.getDay();
  var mondayOff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  var weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOff);

  for (var a = 1; a < assignData.length; a++) {
    var row = assignData[a];
    var aCol = safeStr(row[3]).toLowerCase().replace(/\s+/g, ' ');
    if (aCol !== normName) continue;
    totalAssigned++;
    var st = safeStr(row[6]).toLowerCase();
    var logged = safeNum(row[7]);
    var planned = safeNum(row[5]);
    totalLoggedHours += logged;
    totalPlannedHours += planned;
    if (st === 'completed' || st === 'complete') totalCompleted++;
    else if (st === 'canceled' || st === 'cancelled') totalCanceled++;
    var assignDate = row[4];
    if (assignDate instanceof Date && assignDate >= weekStart) {
      weeklyLoggedHours += logged;
      if (st === 'completed' || st === 'complete') weeklyCompleted++;
    }
    topTasks.push({ name: safeStr(row[2]), hours: logged, status: safeStr(row[6]) });
  }

  var taggedData;
  try { taggedData = getSheetData(SHEETS.CA_TAGGED); } catch(e) { taggedData = []; }
  var taggedHours = 0, taggedTasks = 0;
  for (var t = 1; t < taggedData.length; t++) {
    var tCol = safeStr(taggedData[t][3]).toLowerCase().replace(/\s+/g, ' ');
    var tRig = safeStr(taggedData[t][1]).toLowerCase();
    if (tCol === normName || (myRig && tRig === myRig)) {
      taggedHours += safeNum(taggedData[t][5]);
      taggedTasks++;
    }
  }

  if (taggedHours > totalLoggedHours) totalLoggedHours = taggedHours;
  if (taggedTasks > totalAssigned) totalAssigned = taggedTasks;
  if (myHoursUploaded > totalLoggedHours) totalLoggedHours = myHoursUploaded;

  topTasks.sort(function(a, b) { return b.hours - a.hours; });
  var completionRate = totalAssigned > 0 ? Math.round(totalCompleted / totalAssigned * 100) : 0;
  var avgHPT = totalCompleted > 0 ? totalLoggedHours / totalCompleted : 0;

  return {
    collectorName: collectorName,
    totalAssigned: totalAssigned, totalCompleted: totalCompleted, totalCanceled: totalCanceled,
    totalLoggedHours: Math.round(totalLoggedHours * 100) / 100,
    totalPlannedHours: Math.round(totalPlannedHours * 100) / 100,
    weeklyLoggedHours: Math.round(weeklyLoggedHours * 100) / 100,
    weeklyCompleted: weeklyCompleted,
    activeTasks: Math.max(0, totalAssigned - totalCompleted - totalCanceled),
    completionRate: completionRate,
    avgHoursPerTask: Math.round(avgHPT * 100) / 100,
    topTasks: topTasks.slice(0, 10)
  };
}

function handleGetTodayLog(collectorName) {
  if (!collectorName) return [];
  var normName = collectorName.toLowerCase().replace(/\s+/g, ' ').trim();
  var assignData;
  try { assignData = getSheetData(SHEETS.ASSIGNMENTS); } catch(e) { return []; }
  var today = new Date();
  var todayStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var results = [];
  for (var i = 1; i < assignData.length; i++) {
    var row = assignData[i];
    var aCol = safeStr(row[3]).toLowerCase().replace(/\s+/g, ' ');
    if (aCol !== normName) continue;
    var assignDate = row[4];
    var dateStr = assignDate instanceof Date ? Utilities.formatDate(assignDate, Session.getScriptTimeZone(), 'yyyy-MM-dd') : safeStr(assignDate);
    var status = safeStr(row[6]);
    var isActive = status.toLowerCase() === 'in progress' || status.toLowerCase() === 'partial';
    if (dateStr === todayStr || isActive) {
      results.push({
        assignmentId: safeStr(row[0]), taskId: safeStr(row[1]), taskName: safeStr(row[2]),
        status: status, loggedHours: safeNum(row[7]), plannedHours: safeNum(row[5]),
        remainingHours: safeNum(row[8]), notes: safeStr(row[10]),
        assignedDate: dateStr, completedDate: safeStr(row[9])
      });
    }
  }
  return results;
}

function handleGetRecollections() {
  var data;
  try { data = getSheetData(SHEETS.TASK_ACTUALS); } catch(e) { return []; }
  var results = [];
  for (var i = 1; i < data.length; i++) {
    var st = safeStr(data[i][4]).toLowerCase();
    var tn = safeStr(data[i][1]);
    var rem = safeNum(data[i][5]);
    if (tn && (st === 'recollect' || st === 'needs recollection' || rem < 0)) {
      results.push(tn + (rem !== 0 ? ' (' + rem + 'h)' : ''));
    }
  }
  return results;
}

function handleGetFullLog(collectorFilter) {
  var data;
  try { data = getSheetData(SHEETS.ASSIGNMENTS); } catch(e) { return []; }
  var normFilter = collectorFilter ? collectorFilter.toLowerCase().replace(/\s+/g, ' ').trim() : '';
  var results = [];
  for (var i = 1; i < data.length; i++) {
    var collector = safeStr(data[i][3]);
    if (normFilter && collector.toLowerCase().replace(/\s+/g, ' ') !== normFilter) continue;
    results.push({
      collector: collector, taskName: safeStr(data[i][2]), status: safeStr(data[i][6]),
      loggedHours: safeNum(data[i][7]), plannedHours: safeNum(data[i][5]),
      remainingHours: safeNum(data[i][8]), assignedDate: safeStr(data[i][4])
    });
  }
  return results;
}

function handleGetTaskActuals() {
  var data;
  try { data = getSheetData(SHEETS.TASK_ACTUALS); } catch(e) { return []; }
  var results = [];
  for (var i = 1; i < data.length; i++) {
    var tn = safeStr(data[i][1]);
    if (!tn) continue;
    results.push({
      taskId: safeStr(data[i][0]), taskName: tn,
      collectedHours: safeNum(data[i][2]), goodHours: safeNum(data[i][3]),
      status: safeStr(data[i][4]), remainingHours: safeNum(data[i][5]),
      lastRedash: safeStr(data[i][10])
    });
  }
  return results;
}

function handleGetAdminDashboard() {
  var taskData;
  try { taskData = getSheetData(SHEETS.TASK_ACTUALS); } catch(e) { taskData = []; }
  var totalTasks = 0, completedTasks = 0, inProgressTasks = 0, recollectTasks = 0;
  var recollections = [];
  for (var i = 1; i < taskData.length; i++) {
    var st = safeStr(taskData[i][4]).toLowerCase();
    var tn = safeStr(taskData[i][1]);
    if (!tn) continue;
    totalTasks++;
    if (st === 'done' || st === 'completed' || st === 'complete') {
      completedTasks++;
    } else if (st === 'recollect' || st === 'needs recollection' || st === 'needs_recollection') {
      recollectTasks++;
      recollections.push(tn);
    } else if (
      st === 'in progress' || st === 'in_progress' || st === 'inprogress' ||
      st === 'active' || st === 'ip' || st === 'open' || st === 'partial' || st === 'assigned'
    ) {
      inProgressTasks++;
    }
  }

  var collectorsData = getSheetData(SHEETS.COLLECTORS);
  var totalCollectors = 0, totalHoursUploaded = 0;
  var collectorSummary = [];
  for (var c = 1; c < collectorsData.length; c++) {
    var nm = safeStr(collectorsData[c][0]);
    if (!nm) continue;
    totalCollectors++;
    var hrs = safeNum(collectorsData[c][5]);
    totalHoursUploaded += hrs;
    collectorSummary.push({
      name: nm, rig: safeStr(collectorsData[c][1]), email: safeStr(collectorsData[c][2]),
      weeklyCap: safeNum(collectorsData[c][3]), hoursUploaded: hrs, rating: safeStr(collectorsData[c][6])
    });
  }

  var reqData;
  try { reqData = getSheetData(SHEETS.RS_TASK_REQ); } catch(e) { reqData = []; }
  var taskReqs = [];
  for (var r = 1; r < reqData.length; r++) {
    var rn = safeStr(reqData[r][0]);
    if (rn) taskReqs.push({ taskName: rn, requiredGoodHours: safeNum(reqData[r][1]) });
  }

  return {
    totalTasks: totalTasks, completedTasks: completedTasks, inProgressTasks: inProgressTasks,
    recollectTasks: recollectTasks, recollections: recollections,
    totalCollectors: totalCollectors, totalHoursUploaded: Math.round(totalHoursUploaded * 100) / 100,
    collectorSummary: collectorSummary, taskRequirements: taskReqs
  };
}

function handleGetAppCache() {
  var cacheSheet;
  try { cacheSheet = getSheet(SHEETS.APP_CACHE); } catch(e) { return {}; }
  var data = cacheSheet.getDataRange().getValues();
  var cache = {};
  for (var i = 1; i < data.length; i++) {
    var key = safeStr(data[i][0]);
    if (!key) continue;
    try { cache[key] = { value: JSON.parse(data[i][1]), updatedAt: safeStr(data[i][2]) }; }
    catch(e) { cache[key] = { value: data[i][1], updatedAt: safeStr(data[i][2]) }; }
  }
  return cache;
}

function writeCache(key, value) {
  try {
    var cacheSheet = getSS().getSheetByName(SHEETS.APP_CACHE);
    if (!cacheSheet) return;
    var data = cacheSheet.getDataRange().getValues();
    var targetRow = -1;
    for (var i = 0; i < data.length; i++) {
      if (safeStr(data[i][0]) === key) { targetRow = i + 1; break; }
    }
    if (targetRow === -1) targetRow = Math.max(data.length + 1, 2);
    cacheSheet.getRange(targetRow, 1, 1, 3).setValues([[key, JSON.stringify(value), new Date().toISOString()]]);
  } catch(e) {}
}

function handleRefreshCache() {
  var lb = handleGetLeaderboard();
  var admin = handleGetAdminDashboard();
  writeCache('adminDashboard', admin);
  return { leaderboardCount: lb.length, cached: true };
}

function handleSubmit(body) {
  var collector = safeStr(body.collector);
  var task = safeStr(body.task);
  var hours = safeNum(body.hours);
  var actionType = safeStr(body.actionType);
  var notes = safeStr(body.notes);
  if (!collector) throw new Error('Missing collector');
  if (!task) throw new Error('Missing task');
  if (!actionType) throw new Error('Missing actionType');

  var sheet = getSheet(SHEETS.ASSIGNMENTS);
  var data = sheet.getDataRange().getValues();

  if (actionType === 'ASSIGN') {
    var aId = 'A-' + Date.now();
    sheet.appendRow([aId, '', task, collector, new Date(), hours, 'In Progress', 0, hours, '', notes, getWeekStart(new Date())]);
    return { success: true, message: 'Assigned: ' + task, assignmentId: aId, planned: hours, hours: 0, remaining: hours, status: 'In Progress' };
  }

  var normCol = collector.toLowerCase().replace(/\s+/g, ' ');
  var normTask = task.toLowerCase().replace(/[_\s]+/g, ' ');

  for (var i = data.length - 1; i >= 1; i--) {
    var rCol = safeStr(data[i][3]).toLowerCase().replace(/\s+/g, ' ');
    var rTask = safeStr(data[i][2]).toLowerCase().replace(/[_\s]+/g, ' ');
    var rStatus = safeStr(data[i][6]).toLowerCase();
    if (rCol !== normCol || rTask !== normTask) continue;
    if (rStatus !== 'in progress' && rStatus !== 'partial') continue;

    var ri = i + 1;
    var ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');

    if (actionType === 'COMPLETE') {
      var prev = safeNum(data[i][7]);
      var newL = prev + hours;
      var pln = safeNum(data[i][5]);
      var rem = Math.max(0, pln - newL);
      sheet.getRange(ri, 7).setValue('Completed');
      sheet.getRange(ri, 8).setValue(newL > 0 ? newL : hours);
      sheet.getRange(ri, 9).setValue(rem);
      sheet.getRange(ri, 10).setValue(new Date());
      if (notes) { var pn = safeStr(data[i][10]); sheet.getRange(ri, 11).setValue(pn + (pn ? '\n' : '') + '--- ' + ts + ' ---\n' + notes); }
      return { success: true, message: 'Completed: ' + task, hours: newL || hours, planned: pln, remaining: rem, status: 'Completed' };
    }
    if (actionType === 'CANCEL') {
      sheet.getRange(ri, 7).setValue('Canceled');
      sheet.getRange(ri, 10).setValue(new Date());
      if (notes) { var cn = safeStr(data[i][10]); sheet.getRange(ri, 11).setValue(cn + (cn ? '\n' : '') + '--- ' + ts + ' --- CANCELED\n' + notes); }
      return { success: true, message: 'Canceled: ' + task, status: 'Canceled' };
    }
    if (actionType === 'NOTE_ONLY' && notes) {
      var en = safeStr(data[i][10]);
      sheet.getRange(ri, 11).setValue(en + (en ? '\n' : '') + '--- ' + ts + ' ---\n' + notes);
      return { success: true, message: 'Note saved', status: safeStr(data[i][6]) };
    }
    break;
  }

  if (actionType === 'COMPLETE') {
    var fId = 'A-' + Date.now();
    sheet.appendRow([fId, '', task, collector, new Date(), hours, 'Completed', hours, 0, new Date(), notes, getWeekStart(new Date())]);
    return { success: true, message: 'Completed (new): ' + task, assignmentId: fId, hours: hours, planned: hours, remaining: 0, status: 'Completed' };
  }

  return { success: false, message: 'No open assignment found for: ' + task };
}

function getWeekStart(d) {
  var dt = new Date(d);
  var day = dt.getDay();
  dt.setDate(dt.getDate() - (day === 0 ? 6 : day - 1));
  return Utilities.formatDate(dt, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}
