'use strict';

process.env.NODE_ENV = "test"

const db = require('../db.js');
const { BadRequestError, NotFoundError } = require('../expressError');
const Job = require('./job.js');
const { commonBeforeAll, commonBeforeEach, commonAfterEach, commonAfterAll, testJobIds } = require('./_testCommon');

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe('create', function() {
	let newJob = {
		title: 'new',
		salary: 100000,
		equity: '0',
		companyHandle: 'c1'
	};

	test('works', async function() {
		let job = await Job.create(newJob);
		expect(job).toEqual({
			...newJob,
			id: expect.any(Number)
		});
	});
});

/************************************** findAll */

describe('findAll', function() {
	test('works: no filter', async function() {
		let jobs = await Job.findAll();
		expect(jobs).toEqual([
			{
				id: testJobIds[0],
				title: 'Job1',
				salary: 100,
				equity: '0.1',
				companyHandle: 'c1',
				companyName: 'C1'
			},
			{
				id: testJobIds[1],
				title: 'Job2',
				salary: 200,
				equity: '0.2',
				companyHandle: 'c1',
				companyName: 'C1'
			},
			{
				id: testJobIds[2],
				title: 'Job3',
				salary: 300,
				equity: '0',
				companyHandle: 'c1',
				companyName: 'C1'
			},
			{
				id: testJobIds[3],
				title: 'Job4',
				salary: null,
				equity: null,
				companyHandle: 'c1',
				companyName: 'C1'
			}
		]);
	});

	test('works: by min salary', async function() {
		let jobs = await Job.findAll({ minSalary: 250 });
		expect(jobs).toEqual([
			{
				id: testJobIds[2],
				title: 'Job3',
				salary: 300,
				equity: '0',
				companyHandle: 'c1',
				companyName: 'C1'
			}
		]);
	});

	test('works: by equity', async function() {
		let jobs = await Job.findAll({ hasEquity: true });
		expect(jobs).toEqual([
			{
				id: testJobIds[0],
				title: 'Job1',
				salary: 100,
				equity: '0.1',
				companyHandle: 'c1',
				companyName: 'C1'
			},
			{
				id: testJobIds[1],
				title: 'Job2',
				salary: 200,
				equity: '0.2',
				companyHandle: 'c1',
				companyName: 'C1'
			}
		]);
	});

	test('works: by min salary & equity', async function() {
		let jobs = await Job.findAll({ minSalary: 150, hasEquity: true });
		expect(jobs).toEqual([
			{
				id: testJobIds[1],
				title: 'Job2',
				salary: 200,
				equity: '0.2',
				companyHandle: 'c1',
				companyName: 'C1'
			}
		]);
	});

	test('works: by title', async function() {
		let jobs = await Job.findAll({ title: 'Job1' });
		expect(jobs).toEqual([
			{
				id: testJobIds[0],
				title: 'Job1',
				salary: 100,
				equity: '0.1',
				companyHandle: 'c1',
				companyName: 'C1'
			}
		]);
	});

	test('works: empty list on nothing found', async function() {
		let jobs = await Job.findAll({ title: 'nope' });
		expect(jobs).toEqual([]);
	});
});

/************************************** get */

describe('get', function() {
	test('works', async function() {
		let job = await Job.get(testJobIds[1]);
		expect(job).toEqual({
			id: testJobIds[1],
			title: 'Job2',
			salary: 200,
			equity: '0.2',
			company: {
				handle: 'c1',
				name: 'C1',
				description: 'Desc1',
				numEmployees: 1,
				logoUrl: 'http://c1.img'
			}
		});
	});

	test('not found if no such job', async function() {
		try {
			await Job.get(0);
			fail();
		} catch (err) {
			expect(err instanceof NotFoundError).toBeTruthy();
		}
	});
});

/************************************** update */

describe('update', function() {
	const updateData = {
		title: 'New',
		salary: 500,
		equity: '0.5'
	};

	test('works', async function() {
		let job = await Job.update(testJobIds[0], updateData);
		expect(job).toEqual({
			id: testJobIds[0],
			companyHandle: 'c1',
			...updateData
		});
	});

	test('not found if no such job', async function() {
		try {
			await Job.update(0, { title: 'test' });
			fail();
		} catch (err) {
			expect(err instanceof NotFoundError).toBeTruthy();
		}
	});

	test('bad request with no data', async function() {
		try {
			await Job.update(testJobIds[0], {});
			fail();
		} catch (err) {
			expect(err instanceof BadRequestError).toBeTruthy();
		}
	});
});

/************************************** remove */

describe('remove', function() {
	test('works', async function() {
		await Job.remove(testJobIds[0]);
		const res = await db.query('SELECT id FROM jobs WHERE id=$1', [ testJobIds[0] ]);
		expect(res.rows.length).toEqual(0);
	});

	test('not found if no such job', async function() {
		try {
			await Job.remove(0);
			fail();
		} catch (err) {
			expect(err instanceof NotFoundError).toBeTruthy();
		}
	});
});
