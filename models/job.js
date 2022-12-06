'use strict';

const db = require('../db');
const { NotFoundError } = require('../expressError');
const { sqlForPartialUpdate } = require('../helpers/sql');

/** Related functions for companies. */

class Job {
	/** Create a job (from data), update db, return new job data.
   *
   * data should be { title, salary, equity, companyHandle }
   *
   * Returns { id, title, salary, equity, companyHandle }
   *
   * Throws NotFoundError if companyHandle isn't in database.
   * */
	static async create(data) {
		// const handleExistenceCheck = await db.query(
		// 	`SELECT c.handle
		//    FROM companies AS c
		//    JOIN jobs AS j ON c.handle = j.company_handle
		//    WHERE j.company_handle = $1`,
		// 	[ companyHandle ]
		// );

		// if (handleExistenceCheck.rows[0]) throw new NotFoundError(`Company doesn't exist: ${companyHandle}`);
		const result = await db.query(
			`INSERT INTO jobs (title,
                                 salary,
                                 equity,
                                 company_handle)
               VALUES ($1, $2, $3, $4)
               RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
			[ data.title, data.salary, data.equity, data.companyHandle ]
		);
		let job = result.rows[0];

		return job;
	}

	/** Find all companies (optional filter on searchFilters).
   *
   * searchFilters (all optional):
   * - minSalary
   * - hasEquity (if true, filter to jobs that provide a non-zero amount of equity. If false or not included in the filtering, list all jobs regardless of equity.)
   * - title (will find case-insensitive, partial matches)
   *
   * Returns [{ id, title, salary, equity, companyHandle, companyName }, ...]
   * */

	static async findAll({ minSalary, hasEquity, title } = {}) {
		// Start with the basic select expression that we need out of the db
		let queryStr = `SELECT j.id,
                  j.title,
                  j.salary,
                  j.equity,
                  j.company_handle AS "companyHandle",
                  c.name AS "companyName"
                  FROM jobs j 
           LEFT JOIN companies AS c ON c.handle=j.company_handle`;

		// Initialize empty arrays for or WHERE expressions and the values we're searching with
		let whereStatements = [];
		let queryItems = [];

		// Prepare for every possible search parameter so we can create a SQL query string accordingly

		if (minSalary !== undefined) {
			queryItems.push(minSalary);
			whereStatements.push(`salary >= $${queryItems.length}`);
		}

		if (hasEquity === true) {
			whereStatements.push(`equity > 0`);
		}

		if (title !== undefined) {
			queryItems.push(`%${title}%`);
			whereStatements.push(`title ILIKE $${queryItems.length}`);
		}

		// If the whereStatements is not empty, add each WHERE statement with AND in between
		if (whereStatements.length > 0) {
			queryStr += ' WHERE ' + whereStatements.join(' AND ');
		}

		// Bring everything together into one query string

		queryStr += ' ORDER BY title';
		const jobsRes = await db.query(queryStr, queryItems);
		return jobsRes.rows;
	}

	/** Given a job id, return data about job.
   *
   * Returns { id, title, salary, equity, companyHandle }
   *
   * Throws NotFoundError if not found.
   **/

	static async get(id) {
		const jobRes = await db.query(
			`SELECT id,
                  title,
                  salary,
                  equity,
                  company_handle AS "companyHandle"
           FROM jobs
           WHERE id = $1`,
			[ id ]
		);

		const job = jobRes.rows[0];

		if (!job) throw new NotFoundError(`No job: ${id}`);

		const companiesRes = await db.query(
			`SELECT handle,
            name,
            description,
            num_employees AS "numEmployees",
            logo_url AS "logoUrl"
            FROM companies 
            WHERE handle = $1`,
			[ job.companyHandle ]
		);

		delete job.companyHandle;
		job.company = companiesRes.rows[0];

		return job;
	}

	/** Update job data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {title, salary, equity} (but never the id or companyHandle)
   *
   * Returns {id, title, salary, equity, companyHandle}
   *
   * Throws NotFoundError if not found.
   */

	static async update(id, data) {
		const { setCols, values } = sqlForPartialUpdate(data, {});

		// if (setCols.includes('id') || setCols.includes('company_handle'))
		// 	throw new BadRequestError('You cannot change job id or companyHandle');

		const idVarIdx = '$' + (values.length + 1);

		const querySql = `UPDATE jobs 
                      SET ${setCols} 
                      WHERE id = ${idVarIdx} 
                      RETURNING id, 
                                title, 
                                salary, 
                                equity, 
                                company_handle AS "companyHandle"`;
		const result = await db.query(querySql, [ ...values, id ]);
		const job = result.rows[0];

		if (!job) throw new NotFoundError(`No job: ${id}`);

		return job;
	}

	/** Delete given job from database; returns undefined.
   *
   * Throws NotFoundError if job not found.
   **/

	static async remove(id) {
		const result = await db.query(
			`DELETE
             FROM jobs
             WHERE id = $1
             RETURNING id`,
			[ id ]
		);
		const job = result.rows[0];

		if (!job) throw new NotFoundError(`No job: ${id}`);
	}
}

module.exports = Job;
