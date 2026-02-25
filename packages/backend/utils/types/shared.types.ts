import type { AnySchema } from "yup";

export type StrictYupShape<T> = Partial<Record<keyof T, AnySchema>>;

export interface PaginationQuery {
    limit?: number;
    offset?: number;
}
