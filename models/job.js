"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError, ExpressError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for jobs. */

class Job {
    /** Create a job (from data), update db, return new job data.
     *
     * data should be { id, title, salary, equity, companyHandle }
     *
     * Returns { id, title, salary, equity, companyHandle }
     *
     * Throws BadRequestError if job already in database.
     * */

    static async create({ id, title, salary, equity, companyHandle }) {
        const duplicateCheck = await db.query(
            `SELECT id
           FROM jobs
           WHERE id = $1`,
            [id]);

        if (duplicateCheck.rows[0])
            throw new BadRequestError(`Duplicate job: ${id}`);

        const result = await db.query(
            `INSERT INTO jobs
           (title, salary, equity, company_handle)
           VALUES ($1, $2, $3, $4)
           RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
            [
                title, salary, equity, companyHandle
            ],
        );
        const job = result.rows[0];

        return job;
    }

    /** Find all jobs.
     *
     * Returns [{ id, title, salary, equity, companyHandle }, ...]
     * */

    static async findAll() {
        const jobsRes = await db.query(
            `SELECT id, 
                title, 
                salary, 
                equity, 
                company_handle AS "companyHandle"
           FROM jobs
           ORDER BY id`);
        return jobsRes.rows;
    }

    /** Given a job handle, return data about job.
     *
     * Returns { id, title, salary, equity, companyHandle, company }
     *   where company is [{ handle, name, description, numEmployees, logoUrl }, ...]
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
            [id]);

        const job = jobRes.rows[0];

        if (!job) throw new NotFoundError(`No job: ${id}`);

        return job;
    }

    /** Update job data with `data`.
     *
     * This is a "partial update" --- it's fine if data doesn't contain all the
     * fields; this only changes provided ones.
     *
     * Data can include: {title, salary, equity}
     *
     * Returns {id, title, salary, equity, companyHandle}
     *
     * Throws NotFoundError if not found.
     */

    static async update(id, data) {
        const { setCols, values } = sqlForPartialUpdate(
            data,
            {
                companyHandle: "company_handle",
            });
        const idVarIdx = "$" + (values.length + 1);

        const querySql = `UPDATE jobs 
                      SET ${setCols} 
                      WHERE id = ${idVarIdx} 
                      RETURNING id, 
                                title, 
                                salary, 
                                equity, 
                                company_handle AS "companyHandle"`;
        const result = await db.query(querySql, [...values, id]);
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
            [id]);
        const job = result.rows[0];

        if (!job) throw new NotFoundError(`No job: ${id}`);
    }

    static async search(params) {
        console.log(params);
        let keys = [];
        let values = [];

        let query = `SELECT id,
                  title,
                  salary,
                  equity,
                  company_handle AS "companyHandle"
                FROM jobs`;

        if (params.title) {
            values.push(`%${params.title}%`);
            keys.push(`title ILIKE $${values.length}`);
        }
        if (params.minSalary) {
            values.push(params.minSalary);
            keys.push(`salary >= $${values.length}`);
        }
        if (params.hasEquity) {
            values.push(0);
            keys.push(`equity > $${values.length}`);
        }

        // from GET /companies/:handle
        if (params.company) {
            values.push(`${params.company}`);
            keys.push(`company_handle = $${values.length}`)
        }

        if (keys.length > 0) {
            query += " WHERE " + keys.join(" AND ");
        }

        const companiesRes = await db.query(query, values)

        return companiesRes.rows;
    }
}


module.exports = Job;
