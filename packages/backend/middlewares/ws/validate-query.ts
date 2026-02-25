/* eslint-disable @typescript-eslint/no-explicit-any */
import { AppError, ErrorScope, HttpCode } from "../../utils/errors";
import type { AnySchema, ValidationError as _ValidationError } from "yup";

/**
 * Generic Request Validator
 * @param {yup.ObjectSchema<any>} schema The schema against which validation is to be done.
 * @param {unknown} data The data to be validated.
 */
export const validateQuery = async <T>(
    data: unknown,
    schema: AnySchema<any>,
): Promise<T> => {
    try {
        const validated = await schema.validate(data, {
            abortEarly: false,
            strict: true,
            stripUnknown: true,
            recursive: true,
        });

        return validated satisfies T;
    } catch (error: Error | _ValidationError | any) {
        let message: string = "";
        error.errors.forEach((e: string) => {
            message += `${e}. `;
        });
        throw new AppError({
            scope: ErrorScope.VALIDATION,
            code: HttpCode.BAD_REQUEST,
            message: message.trim(),
        });
    }
};
