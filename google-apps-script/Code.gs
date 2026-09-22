// LONGEVITY MODEL CASTING + ADMIN SHEET API
// Replace the existing Apps Script Code.gs with this file, then redeploy the existing Web App as a new version.

const SHEET_NAME = "Casting Submissions";
const REQUIRED_HEADERS = [
  "Timestamp",
  "Name",
  "Email",
  "Height",
  "Pants Size",
  "Shirt Size",
  "Shoe Size",
  "Instagram Handle",
  "Instagram URL",
  "Model ID",
  "Status",
  "Notes",
  "Last Updated"
];

function doGet() {
  return ContentService
    .createTextOutput("longevity casting endpoint is live. use POST to submit.")
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    const data = parseRequest_(e);
    const action = String(data.action || "").trim();

    // Admin actions are private and require the shared secret stored in
    // Apps Script Script Properties as MODELS_API_SECRET.
    if (action) {
      requireAdminSecret_(data.secret);

      if (action === "listModels") return json_({ ok: true, models: listModels_() });
      if (action === "addModel") return json_({ ok: true, model: addModel_(data.model || {}) });
      if (action === "updateModel") return json_({ ok: true, model: updateModel_(data.model || {}) });
      if (action === "archiveModel") return json_({ ok: true, model: archiveModel_(data.modelId) });

      return json_({ ok: false, error: "Unknown admin action." });
    }

    // No action = the existing public casting form submission path.
    return json_({ ok: true, modelId: appendCastingSubmission_(data) });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function parseRequest_(e) {
  if (!e) return {};

  if (e.postData && e.postData.contents) {
    try {
      return JSON.parse(e.postData.contents);
    } catch (_) {
      // Public casting form is URL-encoded and is available through e.parameter.
    }
  }

  return e.parameter || {};
}

function requireAdminSecret_(provided) {
  const expected = PropertiesService.getScriptProperties().getProperty("MODELS_API_SECRET");
  if (!expected) throw new Error("MODELS_API_SECRET is not configured in Apps Script Script Properties.");
  if (String(provided || "") !== String(expected)) throw new Error("Unauthorized models request.");
}

function getSpreadsheet_() {
  const props = PropertiesService.getScriptProperties();
  let ssId = props.getProperty("SPREADSHEET_ID");
  let ss;

  if (!ssId) {
    ss = SpreadsheetApp.create("longevity — Model Casting Submissions");
    ssId = ss.getId();
    props.setProperty("SPREADSHEET_ID", ssId);
  } else {
    ss = SpreadsheetApp.openById(ssId);
  }

  return ss;
}

function getSheet_() {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  ensureHeaders_(sheet);
  backfillAdminColumns_(sheet);
  return sheet;
}

function ensureHeaders_(sheet) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const firstRow = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const hasAnyHeader = firstRow.some(value => String(value || "").trim());

  if (!hasAnyHeader) {
    sheet.getRange(1, 1, 1, REQUIRED_HEADERS.length).setValues([REQUIRED_HEADERS]);
    return;
  }

  const existing = firstRow.map(value => String(value || "").trim());
  REQUIRED_HEADERS.forEach(header => {
    if (existing.indexOf(header) === -1) {
      const col = sheet.getLastColumn() + 1;
      sheet.getRange(1, col).setValue(header);
      existing.push(header);
    }
  });
}

function headerMap_(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  headers.forEach((header, index) => { map[String(header || "").trim()] = index + 1; });
  return map;
}

function backfillAdminColumns_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const map = headerMap_(sheet);
  const count = lastRow - 1;
  const ids = sheet.getRange(2, map["Model ID"], count, 1).getValues();
  const statuses = sheet.getRange(2, map["Status"], count, 1).getValues();
  const updated = sheet.getRange(2, map["Last Updated"], count, 1).getValues();
  const timestamps = sheet.getRange(2, map["Timestamp"], count, 1).getValues();
  const names = sheet.getRange(2, map["Name"], count, 1).getValues();

  let changedIds = false;
  let changedStatuses = false;
  let changedUpdated = false;

  for (let i = 0; i < count; i += 1) {
    const hasRecord = String(names[i][0] || "").trim() || timestamps[i][0];
    if (!hasRecord) continue;

    if (!String(ids[i][0] || "").trim()) {
      ids[i][0] = Utilities.getUuid();
      changedIds = true;
    }

    if (!String(statuses[i][0] || "").trim()) {
      statuses[i][0] = "Applicant";
      changedStatuses = true;
    }

    if (!updated[i][0]) {
      updated[i][0] = timestamps[i][0] || new Date();
      changedUpdated = true;
    }
  }

  if (changedIds) sheet.getRange(2, map["Model ID"], count, 1).setValues(ids);
  if (changedStatuses) sheet.getRange(2, map["Status"], count, 1).setValues(statuses);
  if (changedUpdated) sheet.getRange(2, map["Last Updated"], count, 1).setValues(updated);
}

function appendCastingSubmission_(data) {
  const sheet = getSheet_();
  const modelId = Utilities.getUuid();
  const now = new Date();
  const igHandle = normalizeHandle_(data.igHandle);
  const instagramUrl = String(data.instagramUrl || (igHandle ? "https://instagram.com/" + igHandle : "")).trim();

  appendByHeaders_(sheet, {
    "Timestamp": now,
    "Name": string_(data.name),
    "Email": string_(data.email),
    "Height": string_(data.height),
    "Pants Size": string_(data.pants),
    "Shirt Size": string_(data.shirt),
    "Shoe Size": string_(data.shoes),
    "Instagram Handle": igHandle,
    "Instagram URL": instagramUrl,
    "Model ID": modelId,
    "Status": "Applicant",
    "Notes": "",
    "Last Updated": now
  });

  return modelId;
}

function listModels_() {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();

  const models = values
    .map(row => rowToModel_(headers, row))
    .filter(model => model.modelId || model.name || model.email);

  models.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
  return models;
}

function addModel_(model) {
  const sheet = getSheet_();
  const now = new Date();
  const modelId = Utilities.getUuid();
  const igHandle = normalizeHandle_(model.igHandle);

  appendByHeaders_(sheet, {
    "Timestamp": now,
    "Name": string_(model.name),
    "Email": string_(model.email),
    "Height": string_(model.height),
    "Pants Size": string_(model.pants),
    "Shirt Size": string_(model.shirt),
    "Shoe Size": string_(model.shoes),
    "Instagram Handle": igHandle,
    "Instagram URL": string_(model.instagramUrl || (igHandle ? "https://instagram.com/" + igHandle : "")),
    "Model ID": modelId,
    "Status": string_(model.status || "Roster"),
    "Notes": string_(model.notes),
    "Last Updated": now
  });

  return getModelById_(sheet, modelId);
}

function updateModel_(model) {
  const sheet = getSheet_();
  const modelId = string_(model.modelId);
  if (!modelId) throw new Error("Model ID is required.");

  const rowNumber = findModelRow_(sheet, modelId);
  if (!rowNumber) throw new Error("Model not found.");

  const map = headerMap_(sheet);
  const igHandle = normalizeHandle_(model.igHandle);
  const values = {
    "Name": string_(model.name),
    "Email": string_(model.email),
    "Height": string_(model.height),
    "Pants Size": string_(model.pants),
    "Shirt Size": string_(model.shirt),
    "Shoe Size": string_(model.shoes),
    "Instagram Handle": igHandle,
    "Instagram URL": string_(model.instagramUrl || (igHandle ? "https://instagram.com/" + igHandle : "")),
    "Status": string_(model.status || "Applicant"),
    "Notes": string_(model.notes),
    "Last Updated": new Date()
  };

  Object.keys(values).forEach(header => {
    if (map[header]) sheet.getRange(rowNumber, map[header]).setValue(values[header]);
  });

  return getModelById_(sheet, modelId);
}

function archiveModel_(modelId) {
  const sheet = getSheet_();
  const id = string_(modelId);
  if (!id) throw new Error("Model ID is required.");

  const rowNumber = findModelRow_(sheet, id);
  if (!rowNumber) throw new Error("Model not found.");

  const map = headerMap_(sheet);
  sheet.getRange(rowNumber, map["Status"]).setValue("Archived");
  sheet.getRange(rowNumber, map["Last Updated"]).setValue(new Date());
  return getModelById_(sheet, id);
}

function findModelRow_(sheet, modelId) {
  const map = headerMap_(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  const ids = sheet.getRange(2, map["Model ID"], lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i += 1) {
    if (String(ids[i][0] || "") === String(modelId)) return i + 2;
  }
  return null;
}

function getModelById_(sheet, modelId) {
  const rowNumber = findModelRow_(sheet, modelId);
  if (!rowNumber) throw new Error("Model not found.");
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
  return rowToModel_(headers, row);
}

function rowToModel_(headers, row) {
  const record = {};
  headers.forEach((header, index) => { record[String(header || "").trim()] = row[index]; });

  return {
    timestamp: jsonValue_(record["Timestamp"]),
    name: string_(record["Name"]),
    email: string_(record["Email"]),
    height: string_(record["Height"]),
    pants: string_(record["Pants Size"]),
    shirt: string_(record["Shirt Size"]),
    shoes: string_(record["Shoe Size"]),
    igHandle: string_(record["Instagram Handle"]),
    instagramUrl: string_(record["Instagram URL"]),
    modelId: string_(record["Model ID"]),
    status: string_(record["Status"] || "Applicant"),
    notes: string_(record["Notes"]),
    lastUpdated: jsonValue_(record["Last Updated"])
  };
}

function appendByHeaders_(sheet, valuesByHeader) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(header => {
    const key = String(header || "").trim();
    return Object.prototype.hasOwnProperty.call(valuesByHeader, key) ? valuesByHeader[key] : "";
  });
  sheet.appendRow(row);
}

function normalizeHandle_(value) {
  return string_(value).replace(/^@/, "").trim();
}

function string_(value) {
  return value == null ? "" : String(value).trim();
}

function jsonValue_(value) {
  if (Object.prototype.toString.call(value) === "[object Date]") return value.toISOString();
  return value == null ? "" : value;
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
