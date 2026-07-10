import { Gender } from "@datechain/types";
import { z } from "zod";

/** Age in whole years for a given ISO birth date. */
export function ageOf(birthDate: string, now: Date = new Date()): number {
  const dob = new Date(birthDate);
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

export const profileSchema = z.object({
  displayName: z.string().min(1, "Введите имя").max(100),
  birthDate: z
    .string()
    .min(1, "Укажите дату рождения")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Некорректная дата")
    .refine((v) => ageOf(v) >= 18, "Регистрация доступна с 18 лет"),
  gender: z.nativeEnum(Gender, { errorMap: () => ({ message: "Выберите пол" }) }),
  interestedIn: z.array(z.nativeEnum(Gender)).min(1, "Выберите хотя бы один вариант"),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

export const phoneSchema = z.object({
  identifier: z.string().min(5, "Введите телефон"),
});

export const otpSchema = z.object({
  code: z.string().length(6, "Код состоит из 6 цифр"),
});
