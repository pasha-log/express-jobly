'use strict';

/** Routes for companies. */

const jsonschema = require('jsonschema');
const express = require('express');

const { BadRequestError } = require('../expressError');
const { ensureAdmin } = require('../middleware/auth');
const Job = require('../models/company');

const jobNewSchema = require('../schemas/jobNew.json');
const jobUpdateSchema = require('../schemas/jobUpdate.json');
const jobSearchSchema = require('../schemas/jobSearch.json');

const router = new express.Router({ mergeParams: true });

/** POST / { job } =>  { job }
 *
 * job should be { title, salary, equity, companyHandle }
 *
 * Returns { id, title, salary, equity, companyHandle }
 *
 * Authorization required: Admin
 */

router.post('/', ensureAdmin, async function(req, res, next) {
	try {
		const validator = jsonschema.validate(req.body, jobNewSchema);
		if (!validator.valid) {
			const errs = validator.errors.map((e) => e.stack);
			throw new BadRequestError(errs);
		}

		const job = await Job.create(req.body);
		return res.status(201).json({ job });
	} catch (err) {
		return next(err);
	}
});

/** GET /  =>
 *   { jobs: [ { id, title, salary, equity, companyHandle, companyName }, ...] }
 *
 * Can filter on provided search filters:
 * - minSalary
 * - hasEquity (true returns only jobs with equity > 0, other values ignored)
 * - title (will find case-insensitive, partial matches)
 *
 * Authorization required: none
 */

router.get('/', async function(req, res, next) {
	const q = req.query;
  // We want the minSalary to be an integer/boolean since it comes as string from query string
	if (q.minSalary !== undefined) q.minSalary = +q.minSalary;
	q.hasEquity = q.hasEquity === "true";

	try {
		const validator = jsonschema.validate(q, jobSearchSchema);
		if (!validator.valid) {
			const errs = validator.errors.map((e) => e.stack);
			throw new BadRequestError(errs);
		}

		const jobs = await Job.findAll(q);
		return res.json({ jobs });
	} catch (err) {
		return next(err);
	}
});

/** GET /[id]  =>  { job }
 *
 *  Company is { id, title, salary, equity, companyHandle }
 *
 * Authorization required: none
 */

router.get('/:id', async function(req, res, next) {
	try {
		const job = await Job.get(req.params.id);
		return res.json({ job });
	} catch (err) {
		return next(err);
	}
});

/** PATCH /[id] { fld1, fld2, ... } => { job }
 *
 * Patches job data.
 *
 * fields can be: {title, salary, equity} (but never the id or companyHandle)
 *
 * Returns {id, title, salary, equity, companyHandle}
 *
 * Authorization required: Admin
 */

router.patch('/:id', ensureAdmin, async function(req, res, next) {
	try {
		const validator = jsonschema.validate(req.body, jobUpdateSchema);
		if (!validator.valid) {
			const errs = validator.errors.map((e) => e.stack);
			throw new BadRequestError(errs);
		}

		const job = await Job.update(req.params.id, req.body);
		return res.json({ job });
	} catch (err) {
		return next(err);
	}
});

/** DELETE /[id]  =>  { deleted: id }
 *
 * Authorization: Admin
 */

router.delete('/:id', ensureAdmin, async function(req, res, next) {
	try {
		await Job.remove(req.params.id);
		return res.json({ deleted: +req.params.id });
	} catch (err) {
		return next(err);
	}
});

module.exports = router;
