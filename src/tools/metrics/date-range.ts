import { z } from "zod";

export const dateRangeSchema = z.object({
  start_date: z.string().min(1).describe("Fecha inicial del rango, formato YYYY-MM-DD"),
  end_date: z.string().min(1).describe("Fecha final del rango, formato YYYY-MM-DD"),
});

export type DateRange = z.infer<typeof dateRangeSchema>;

export const toSdkDates = (a: DateRange) => ({ startDate: a.start_date, endDate: a.end_date });
