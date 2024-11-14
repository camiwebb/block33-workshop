require('dotenv').config();

const pg = require('pg');
const client = new pg.Client(process.env.DATABASE_URL);
const express = require('express');
const app = express();

app.use(require('morgan')('dev'));
app.use(express.json());

// READ departments
app.get('/api/departments', async (req, res, next) => {
    try {
        const SQL = `SELECT * FROM departments`;
        const response = await client.query(SQL);
        res.send(response.rows);
    } catch (error) {
        next(error)
    }
});

// READ employee
app.get('/api/employee', async (req, res, next) => {
    try {
        const SQL = `SELECT * FROM employee`;
        const response = await client.query(SQL);
        res.send(response.rows);
    } catch (error) {
        next(error)
    }
});

// CREATE employee with foreign key
app.post('/api/employee', async (req, res, next) => {
    try {
        const SQL = `INSERT INTO employee(name, department_id) VALUES ($1, $2) RETURNING *`;
        const response = await client.query(SQL, [req.body.name, req.body.department_id]);
        res.status(201).send(response.rows[0]);
    } catch (error) {
        next(error);
    }
});

// UPDATE employee with foreign key
app.put('/api/employee/:id', async (req, res, next) => {
    try {
        const SQL = /* sql */ `
            UPDATE employee
            SET name=$1, department_id=$2, updated_at=now()
            WHERE id=$3
            RETURNING *
        `;
        const response = await client.query(SQL, [req.body.name, req.body.department_id, req.params.id]);
        res.send(response.rows[0]);
    } catch (error) {
        next(error);
    }
});

// DELETE employee
app.delete('/api/employee/:id', async (req, res, next) => {
    try {
        const SQL = `DELETE FROM employee WHERE id=$1`;
        await client.query(SQL, [req.params.id]);
        res.sendStatus(204);
    } catch (error) {
        next(error);
    }
});

// handle errors
app.use((error, req, res, next) => {
    res.status(res.status || 500).send({
        error: error
    });
});

const init = async () => {
    await client.connect();
    let SQL = /* sql */ `
        DROP TABLE IF EXISTS employee;
        DROP TABLE IF EXISTS departments;

        CREATE TABLE departments(
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE
        );

        CREATE TABLE employee(
            id SERIAL PRIMARY KEY,
            name VARCHAR(150) NOT NULL,
            created_at TIMESTAMP DEFAULT now(),
            updated_at TIMESTAMP DEFAULT now(),
            department_id INTEGER REFERENCES departments(id) NOT NULL
        );
    `;

    await client.query(SQL);
    console.log('tables created');

    SQL = /* sql */ `
        INSERT INTO departments(name) VALUES ('Human Resources');
        INSERT INTO departments(name) VALUES ('Sales');
        INSERT INTO departments(name) VALUES ('Marketing');

        INSERT INTO employee(name, department_id) VALUES ('Bob Smith', (SELECT id FROM departments WHERE name='Marketing'));
        INSERT INTO employee(name, department_id) VALUES ('Joe Evans', (SELECT id FROM departments WHERE name='Human Resources'));
        INSERT INTO employee(name, department_id) VALUES ('Mary Newton', (SELECT id FROM departments WHERE name='Human Resources'));
        INSERT INTO employee(name, department_id) VALUES ('Susan Jones', (SELECT id FROM departments WHERE name='Sales'));
    `;

    await client.query(SQL);
    console.log('data seeded');

    const port = process.env.PORT;
    app.listen(port, () => console.log(`listening on port ${port}`));
};

init();