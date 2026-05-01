import { describe, it, expect } from 'vitest';
import ngword from '../src';

describe('check', () => {
	it('returns empty for a clean word', () => {
		expect(ngword.check('fudge')).toEqual([]);
	});

	it('matches substrings', () => {
		expect(ngword.check('you fucked up').length).toBeGreaterThan(0);
	});

	it('matches word-boundary patterns when standalone', () => {
		expect(ngword.check('anus').length).toBeGreaterThan(0);
	});

	it('matches word-boundary pattern with surrounding spaces', () => {
		expect(ngword.check('your anus here').length).toBeGreaterThan(0);
	});

	it('is case-insensitive', () => {
		expect(ngword.check('FUCK')).toEqual(ngword.check('fuck'));
	});

	it('substitutes l33t speak', () => {
		expect(ngword.check('s3x').length).toBeGreaterThan(0);
	});

	it('substitutes $ for s', () => {
		expect(ngword.check('$ex').length).toBeGreaterThan(0);
	});

	it('strips spaces', () => {
		expect(ngword.check('f u c k').length).toBeGreaterThan(0);
		expect(ngword.check('f\u3000u\u3000c\u3000k').length).toBeGreaterThan(0);
	});

	it('no-filter union and intersect produce identical results', () => {
		expect(ngword.check('fuck', { mode: 'union' })).toEqual(ngword.check('fuck', { mode: 'intersect' }));
	});

	it('filters by union mode', () => {
		expect(ngword.check('éjaculé', { mode: 'union', regions: ['jp'], languages: ['fr-FR'] }).length).toBeGreaterThan(0);
	});

	it('filters by intersect mode', () => {
		expect(ngword.check('éjaculé', { mode: 'intersect', regions: ['jp'], languages: ['fr-FR'] }).length).toBe(0);
		expect(ngword.check('warmerbruder', { mode: 'intersect', regions: ['eu'], languages: ['de-DE'] }).length).toBe(2);
	});

	it('catches clean input that when space-stripped has bad words', () => {
		// * When stripped of spaces this becomes "of a giant", which
		// * contains the substring "fag"
		expect(ngword.check('of a giant').length).toBeGreaterThan(0);
	});
});
