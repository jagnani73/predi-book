import * as yup from "yup";

// Returns a string schema that validates a query param as a valid integer.
// Values stay as strings (req.query is always string), strict mode is preserved.
export const queryInteger = (min?: number, max?: number) => {
    let schema = yup
        .string()
        .test(
            "is-integer",
            "${path} must be a valid integer",
            (val) =>
                val === undefined ||
                (val !== "" && Number.isInteger(Number(val))),
        );
    if (min !== undefined) {
        const _min = min;
        schema = schema.test(
            "min",
            `\${path} must be at least ${_min}`,
            (val) => val === undefined || Number(val) >= _min,
        );
    }
    if (max !== undefined) {
        const _max = max;
        schema = schema.test(
            "max",
            `\${path} must be at most ${_max}`,
            (val) => val === undefined || Number(val) <= _max,
        );
    }
    return schema;
};

export const solanaWalletAddressSchema = yup
    .string()
    .matches(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)
    .trim();

export const evmTokenAddressSchema = yup
    .string()
    .trim()
    .matches(/^0x[a-fA-F0-9]{40}$/, "Must be a valid EVM address")
    .test("starts-with-0x", "Must start with 0x", (value) =>
        value ? value.startsWith("0x") : false,
    )
    .required();

export const solanaTokenAddressSchema = yup
    .string()
    .trim()
    .matches(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)
    .required();
