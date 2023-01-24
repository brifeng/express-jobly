const { BadRequestError } = require("../expressError");
const { sqlForPartialUpdate } = require("./sql");

describe("sqlForPartialUpdate", function () {
    test("works: valid data", function () {
        const data = { firstName: 'Aliya', age: 32 };
        const result = sqlForPartialUpdate(
            data,
            {
                firstName: "firstName",
                age: "age"
            });
        expect(result).toEqual({
            setCols: '"firstName"=$1, "age"=$2',
            values: ['Aliya', 32]
        });
    });

    test("works: no data", function () {
        const data = {};
        expect(() => {
            sqlForPartialUpdate(
                data,
                {
                    firstName: "firstName",
                    age: "age"
                });
        }).toThrow("No data");
    });
});
