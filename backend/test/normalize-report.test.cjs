const assert = require('node:assert/strict');
const { test } = require('node:test');
const { normalizeReport } = require('../../frontend/src/lib/normalizeReport');

test('report normalization preserves populated structured values', () => {
    const report = normalizeReport({ report: { soap: { subjective: ['a'], objective: ['b'], assessment: ['c'], plan: ['d'] }, aiSummary: { narrative: 'summary', medications: ['med'], warnings: ['warning'] } } });
    assert.deepEqual(report.soap, { subjective: ['a'], objective: ['b'], assessment: ['c'], plan: ['d'] });
    assert.deepEqual(report.medications, ['med']);
    assert.deepEqual(report.warnings, ['warning']);
});

test('report normalization fills absent sections and text with safe empty values', () => {
    const report = normalizeReport({ soap: { subjective: ['kept'] }, aiSummary: {} });
    assert.deepEqual(report.soap, { subjective: ['kept'], objective: [], assessment: [], plan: [] });
    assert.equal(report.summary, '');
    assert.deepEqual(report.medications, []);
    assert.deepEqual(report.warnings, []);
});

test('report normalization keeps very long text without truncation', () => {
    const longText = 'x'.repeat(100000);
    assert.equal(normalizeReport({ aiSummary: { narrative: longText } }).summary.length, 100000);
});
