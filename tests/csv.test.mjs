import assert from "node:assert/strict";
import test from "node:test";
import {
  detectCsvDelimiter,
  escapeCsvCell,
  parseCsvDocument,
} from "../src/lib/csv.ts";

test("parses quoted commas, escaped quotes, CRLF, and embedded newlines", () => {
  const rows = parseCsvDocument(
    'contact,company,notes\r\n"Jane, Doe","Agency ""One""","First line\nSecond line"\r\n',
    ",",
  );

  assert.deepEqual(rows, [
    ["contact", "company", "notes"],
    ["Jane, Doe", 'Agency "One"', "First line\nSecond line"],
  ]);
});

test("rejects a CSV document with an unterminated quoted field", () => {
  assert.throws(
    () => parseCsvDocument('contact,company\n"Jane,Agency', ","),
    /unterminated quoted field/,
  );
});

test("detects semicolon CSV while ignoring separators inside quoted headers", () => {
  assert.equal(detectCsvDelimiter('"contact, person";company;revenue'), ";");
  assert.equal(detectCsvDelimiter("contact,company,revenue"), ",");
  assert.deepEqual(
    parseCsvDocument('"contact, person";company;revenue\r\n"J; Doe";Agency;125,50', ";"),
    [
      ["contact, person", "company", "revenue"],
      ["J; Doe", "Agency", "125,50"],
    ],
  );
});

test("escapes spreadsheet formulas in untrusted CSV text cells", () => {
  for (const value of ["=1+1", "+SUM(A1:A2)", "-cmd|' /C calc'!A0", "@SUM(A1)", "\t=1+1"]) {
    assert.equal(escapeCsvCell(value), `'${value}`);
  }
  assert.equal(escapeCsvCell(-12), "-12");
});

test("quotes CSV separators, quotes, and line breaks after formula escaping", () => {
  assert.equal(escapeCsvCell('=cmd,"test"\nnext'), `"'=cmd,""test""\nnext"`);
  assert.equal(escapeCsvCell("Acme; GmbH"), '"Acme; GmbH"');
});
